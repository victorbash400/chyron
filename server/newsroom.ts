import {
  coverageInput,
  includesCoverageSource,
  sameCoverageSources,
} from "../shared/coverageInput.ts";
import { defaultCoverageSettings } from "../shared/coverageSettings.ts";
import { defaultOverlayDesign } from "../shared/overlayDesign.ts";
import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { ChatMessage, NewsroomState, Story } from "../shared/types.ts";
import {
  type Coverage,
  writeCoverage,
  createCoverageSchema,
} from "./editor.ts";
import { readRecord, writeRecord } from "./store.ts";
import { storyScore } from "./ranking.ts";
export interface SavedNewsroom {
  state: NewsroomState;
  overlayToken: string;
}
export class Newsroom extends EventEmitter {
  state: NewsroomState = {
    sourceId: randomUUID(),
    simulator: { status: "idle", delivered: 0, total: 0 },
    mode: "twitch",
    channel: null,
    connection: "disconnected",
    paused: false,
    visible: true,
    working: false,
    error: null,
    stories: [],
    messages: [],
    model: process.env.BEDROCK_REASONING_MODEL_ID ?? "",
    audioModel: process.env.BEDROCK_AUDIO_MODEL_ID ?? "",
    revision: 0,
    design: { ...defaultOverlayDesign },
    coverage: { ...defaultCoverageSettings },
  };
  overlayToken = randomBytes(32).toString("hex");
  private pending = false;
  private pendingAudio = false;
  private unseenMessages = 0;
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
      const { automatic: _automatic, ...previous } =
        saved.state as NewsroomState & { automatic?: boolean };
      const {
        generation: _generation,
        audioStories: _audioStories,
        ...coverage
      } = previous.coverage as NewsroomState["coverage"] & {
        generation?: string;
        audioStories?: boolean;
      };
      this.state = {
        ...previous,
        stories: previous.stories.map(
          ({
            published: _published,
            pinned: _pinned,
            edited: _edited,
            ...story
          }: Story & {
            published?: boolean;
            pinned?: boolean;
            edited?: boolean;
          }) => story,
        ),
        design: { ...defaultOverlayDesign, ...saved.state.design },
        coverage: { ...defaultCoverageSettings, ...coverage },
        sourceId: randomUUID(),
        simulator: { status: "idle", delivered: 0, total: 0 },
        working: false,
        connection: "disconnected",
        model:
          (saved.state.coverage?.model === "fast"
            ? process.env.BEDROCK_MODEL_ID
            : process.env.BEDROCK_REASONING_MODEL_ID) ?? "",
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
        ? "Invalid coverage. Check the Chyron model settings."
        : error instanceof Error
          ? error.message
          : "Chyron failed.";
    this.emitState();
  }
  async commit() {
    try {
      this.emitState();
      await this.persist();
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
    this.unseenMessages += unique.filter((message) =>
      includesCoverageSource(message, this.state.coverage),
    ).length;
    this.pendingAudio ||=
      this.state.coverage.includeAudio &&
      unique.some((message) => message.source === "audio");
    this.pending = true;
    this.scheduleCoverage();
  }
  scheduleCoverage() {
    if (this.batch) return;
    if (
      this.state.paused ||
      (!this.state.coverage.includeChat && !this.state.coverage.includeAudio) ||
      this.state.working ||
      !this.pending ||
      (!this.pendingAudio &&
        this.unseenMessages < this.state.coverage.minimumMessages)
    )
      return;
    this.batch = setTimeout(() => {
      this.batch = undefined;
      void this.process().catch((error) => this.fail(error));
    }, this.state.coverage.updateDelayMs);
  }

  rescheduleCoverage() {
    clearTimeout(this.batch);
    this.batch = undefined;
    this.scheduleCoverage();
  }
  async process() {
    if (this.state.working || this.state.paused) return;
    clearTimeout(this.batch);
    this.batch = undefined;
    this.pending = false;
    this.unseenMessages = 0;
    this.pendingAudio = false;
    const epoch = this.epoch;
    this.state.working = true;
    this.state.error = null;
    this.emitState();
    try {
      const now = Date.now();
      const settings = { ...this.state.coverage };
      const messages = coverageInput(this.state.messages, settings, now);
      if (!messages.length) return;
      const activeStories = this.state.stories.filter(
        (story) => now - story.updatedAt < settings.lifetimeSeconds * 1000,
      );
      const coverage = await this.editor(messages, activeStories, settings);
      if (
        epoch !== this.epoch ||
        this.state.paused ||
        !sameCoverageSources(settings, this.state.coverage)
      )
        return;
      this.apply(coverage, now);
      this.emitState();
      await this.persist();
      this.scheduleExpiry();
    } finally {
      this.state.working = false;
      this.emitState();
      this.scheduleCoverage();
    }
  }
  apply(coverage: Coverage, now: number) {
    const next = structuredClone(this.state.stories);
    const validated = createCoverageSchema(this.state.coverage).parse(coverage);
    for (const update of validated.stories) {
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
      if (
        !existing &&
        participants < this.state.coverage.minimumParticipants &&
        !(
          this.state.coverage.includeAudio &&
          messages.some((message) => message.source === "audio")
        )
      )
        continue;
      if (existing?.dismissed) continue;
      const story: Story = {
        id: existing?.id ?? randomUUID(),
        headline: update.headline,
        summary: this.state.coverage.summary === "off" ? "" : update.summary,
        status: update.status,
        messageIds: ids,
        quoteId: this.state.coverage.quotes ? update.quoteId : null,
        participants,
        score: storyScore(messages, update.interest, now),
        interest: update.interest,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        dismissed: false,
      };
      const index = next.findIndex((s) => s.id === story.id);
      if (index >= 0) next[index] = story;
      else next.push(story);
    }
    this.state.stories = next.slice(-30);
  }
  async removeMessages(ids: string[]) {
    this.epoch++;
    this.state.messages = this.state.messages.filter(
      (m) => !ids.includes(m.id),
    );
    this.state.stories = this.state.stories.map((s) => ({
      ...s,
      quoteId: s.quoteId && ids.includes(s.quoteId) ? null : s.quoteId,
      dismissed: s.dismissed || s.messageIds.some((id) => ids.includes(id)),
      messageIds: s.messageIds.filter((id) => !ids.includes(id)),
    }));
    await this.commit();
  }
  async reset(mode: NewsroomState["mode"]) {
    this.epoch++;
    this.pending = false;
    clearTimeout(this.batch);
    this.batch = undefined;
    this.unseenMessages = 0;
    this.pendingAudio = false;
    this.state.sourceId = randomUUID();
    this.emit("source");
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
          !s.dismissed &&
          s.updatedAt + this.state.coverage.lifetimeSeconds * 1000 > now,
      )
      .map((s) => s.updatedAt + this.state.coverage.lifetimeSeconds * 1000);
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
    this.emit("shutdown");
    clearTimeout(this.batch);
    clearTimeout(this.expiry);
    this.removeAllListeners();
  }
}
