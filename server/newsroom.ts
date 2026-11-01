import { defaultOverlayDesign } from "../shared/overlayDesign.ts";
import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { ChatMessage, NewsroomState, Story } from "../shared/types.ts";
import { type Coverage, writeCoverage } from "./editor.ts";
import { readRecord, writeRecord } from "./store.ts";
import { storyScore } from "./ranking.ts";
export interface SavedNewsroom {
  state: NewsroomState;
  overlayToken: string;
}
export class Newsroom extends EventEmitter {
  state: NewsroomState = {
    mode: "twitch",
    channel: null,
    connection: "disconnected",
    paused: false,
    automatic: false,
    visible: true,
    working: false,
    error: null,
    stories: [],
    messages: [],
    model: process.env.BEDROCK_REASONING_MODEL_ID ?? "",
    audioModel: process.env.BEDROCK_AUDIO_MODEL_ID ?? "",
    revision: 0,
    design: { ...defaultOverlayDesign },
  };
  overlayToken = randomBytes(32).toString("hex");
  private pending = false;
  private saveQueue: Promise<void> = Promise.resolve();
  private batch: ReturnType<typeof setTimeout> | undefined;
  private expiry: ReturnType<typeof setTimeout> | undefined;
  private epoch = 0;
  constructor(
    private editor = writeCoverage,
    private save = (value: SavedNewsroom) => writeRecord("NEWSROOM", value),
  ) {
    super();
  }
  async restore() {
    const saved = await readRecord<SavedNewsroom>("NEWSROOM");
    if (saved) {
      this.state = {
        ...saved.state,
        design: { ...defaultOverlayDesign, ...saved.state.design },
        working: false,
        connection: "disconnected",
        model: process.env.BEDROCK_REASONING_MODEL_ID ?? "",
        audioModel: process.env.BEDROCK_AUDIO_MODEL_ID ?? "",
        error: null,
      };
      this.overlayToken = saved.overlayToken;
      this.scheduleExpiry();
    }
  }
  async persist() {
    const snapshot = structuredClone({
      state: this.state,
      overlayToken: this.overlayToken,
    });
    this.saveQueue = this.saveQueue
      .catch(() => undefined)
      .then(() => this.save(snapshot));
    await this.saveQueue;
  }
  emitState() {
    this.state.revision++;
    this.emit("state", this.state);
  }
  fail(error: unknown) {
    this.state.error =
      error instanceof z.ZodError
        ? "Model returned invalid coverage. Generate coverage again."
        : error instanceof Error
          ? error.message
          : "Newsroom failed.";
    this.emitState();
  }
  async commit() {
    try {
      await this.persist();
      this.emitState();
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }
  add(messages: ChatMessage[]) {
    const seen = new Set(this.state.messages.map((m) => m.id));
    const unique = messages.filter(
      (m) => !seen.has(m.id) && (seen.add(m.id), true),
    );
    if (!unique.length) return;
    this.state.messages = [...this.state.messages, ...unique].slice(-200);
    this.emitState();
    void this.persist().catch((error) => this.fail(error));
    if (!this.state.paused) {
      this.pending = true;
      if (!this.batch && !this.state.working)
        this.batch = setTimeout(() => {
          this.batch = undefined;
          void this.process().catch((error) => this.fail(error));
        }, 1800);
    }
  }
  async process() {
    if (this.state.working || this.state.paused) return;
    this.pending = false;
    const epoch = this.epoch;
    this.state.working = true;
    this.state.error = null;
    this.emitState();
    try {
      const now = Date.now();
      const messages = this.state.messages.filter((m) => now - m.at < 180000);
      if (!messages.length)
        throw new Error("Add chat messages before generating coverage.");
      const coverage = await this.editor(messages, this.state.stories);
      if (epoch !== this.epoch || this.state.paused) return;
      this.apply(coverage, now);
      await this.persist();
      this.scheduleExpiry();
    } finally {
      this.state.working = false;
      this.emitState();
      if (this.pending && !this.state.paused) {
        this.batch = setTimeout(() => {
          this.batch = undefined;
          void this.process().catch((error) => this.fail(error));
        }, 1800);
      }
    }
  }
  apply(coverage: Coverage, now: number) {
    const next = structuredClone(this.state.stories);
    for (const update of coverage.stories) {
      const existing = update.existingId
        ? next.find((s) => s.id === update.existingId)
        : undefined;
      if (update.existingId && !existing)
        throw new Error("Model referenced an unknown story. Retry coverage.");
      const ids = [
        ...new Set([...(existing?.messageIds ?? []), ...update.messageIds]),
      ].slice(-30);
      const evidence = ids.map((id) =>
        this.state.messages.find((m) => m.id === id),
      );
      if (
        update.messageIds.some(
          (id) => !this.state.messages.some((m) => m.id === id),
        )
      )
        throw new Error("Model referenced an unknown message. Retry coverage.");
      const messages = evidence.filter((m): m is ChatMessage => Boolean(m));
      if (
        update.quoteId &&
        !messages.some((m) => m.id === update.quoteId && m.source !== "audio")
      )
        throw new Error("Model selected an invalid quote. Retry coverage.");
      const participants = new Set(
        messages.filter((m) => m.source !== "audio").map((m) => m.userId),
      ).size;
      if (!existing && participants < 2) continue;
      if (existing?.dismissed || existing?.edited) continue;
      const story: Story = {
        id: existing?.id ?? randomUUID(),
        headline: update.headline,
        summary: update.summary,
        status: update.status,
        messageIds: ids,
        quoteId: update.quoteId,
        participants,
        score: storyScore(messages, update.interest, now),
        interest: update.interest,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        published: existing?.published || this.state.automatic,
        pinned: existing?.pinned ?? false,
        dismissed: false,
        edited: false,
      };
      const index = next.findIndex((s) => s.id === story.id);
      if (index >= 0) next[index] = story;
      else next.push(story);
    }
    const pinned = next.filter((story) => story.pinned);
    const remaining = next
      .filter((story) => !story.pinned)
      .slice(-(30 - pinned.length));
    this.state.stories = [...pinned, ...remaining];
  }
  async removeMessages(ids: string[]) {
    this.epoch++;
    this.state.messages = this.state.messages.filter(
      (m) => !ids.includes(m.id),
    );
    this.state.stories = this.state.stories.map((s) => ({
      ...s,
      quoteId: s.quoteId && ids.includes(s.quoteId) ? null : s.quoteId,
      published: s.messageIds.some((id) => ids.includes(id))
        ? false
        : s.published,
      messageIds: s.messageIds.filter((id) => !ids.includes(id)),
    }));
    await this.commit();
  }
  async reset(mode: NewsroomState["mode"]) {
    this.epoch++;
    this.pending = false;
    clearTimeout(this.batch);
    this.batch = undefined;
    this.state.mode = mode;
    this.state.messages = [];
    this.state.stories = [];
    this.state.error = null;
    await this.commit();
  }
  scheduleExpiry() {
    clearTimeout(this.expiry);
    const now = Date.now();
    const next = this.state.stories
      .filter(
        (s) =>
          s.published &&
          !s.pinned &&
          !s.dismissed &&
          s.updatedAt + 300000 > now,
      )
      .map((s) => s.updatedAt + 300000);
    if (next.length)
      this.expiry = setTimeout(
        () => {
          this.emitState();
          this.scheduleExpiry();
        },
        Math.max(1, Math.min(...next) - now + 1),
      );
  }
  dispose() {
    clearTimeout(this.batch);
    clearTimeout(this.expiry);
    this.removeAllListeners();
  }
}
