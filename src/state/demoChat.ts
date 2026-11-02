import type { NewsroomState } from "../../shared/types.ts";
import type {
  SimulatorRequest,
  SimulatorSettings,
} from "../../shared/simulator.ts";

export class DemoChat {
  private session: { sourceId: string; settings: SimulatorSettings } | null =
    null;
  private state: NewsroomState | null = null;
  private completed = "";
  private pending = false;
  private observedBatch = false;
  private generation = 0;
  private initialError: string | null = null;

  constructor(
    private send: (path: string, body?: SimulatorRequest) => Promise<boolean>,
    private onActive: (active: boolean) => void,
  ) {}

  async start(state: NewsroomState, settings: SimulatorSettings) {
    if (this.session || this.pending) return false;
    this.state = state;
    this.initialError = state.error;
    this.session = { sourceId: state.sourceId, settings };
    this.completed = state.simulator.batchId ?? "";
    this.observedBatch = false;
    this.onActive(true);
    return this.request();
  }

  observe(state: NewsroomState, online: boolean) {
    this.state = state;
    if (!this.session) return;
    if (
      !online ||
      state.sourceId !== this.session.sourceId ||
      state.mode !== "simulation" ||
      state.paused ||
      (state.error && (this.observedBatch || state.error !== this.initialError))
    ) {
      this.cancel();
      return;
    }
    if (state.simulator.batchId && state.simulator.batchId !== this.completed)
      this.observedBatch = true;
    if (this.observedBatch && state.simulator.total === 0) {
      this.cancel();
      return;
    }
    this.advance();
  }

  async stop() {
    this.cancel();
    await this.send("/api/simulation/stop");
  }

  dispose() {
    this.generation++;
    this.session = null;
  }

  private cancel() {
    this.dispose();
    this.onActive(false);
  }

  private advance() {
    const simulator = this.state?.simulator;
    if (
      !this.session ||
      this.pending ||
      !simulator?.batchId ||
      simulator.batchId === this.completed ||
      simulator.status !== "idle" ||
      simulator.delivered !== simulator.total ||
      !simulator.total
    )
      return;
    this.completed = simulator.batchId;
    void this.request(simulator.batchId);
  }

  private async request(previousBatchId?: string) {
    const session = this.session;
    if (!session) return false;
    const generation = this.generation;
    this.pending = true;
    try {
      const success = await this.send("/api/simulation/start", {
        ...session.settings,
        sourceId: session.sourceId,
        ...(previousBatchId ? { previousBatchId } : {}),
      });
      if (generation === this.generation && !success) this.cancel();
      return success;
    } finally {
      this.pending = false;
      if (generation === this.generation) this.advance();
    }
  }
}
