import type { OverlayDesign } from "../../shared/overlayDesign.ts";

type Patch = Partial<OverlayDesign>;
export interface DesignReceipt {
  design: OverlayDesign;
  revision: number;
}
export class DesignUpdates {
  private queued: Patch = {};
  private sending = false;
  private version = 0;
  private active = true;
  constructor(
    private send: (patch: Patch) => Promise<DesignReceipt>,
    private show: (patch: Patch) => void,
    private accept: (receipt: DesignReceipt) => void,
    private fail: (message: string) => void,
  ) {}
  update(patch: Patch) {
    this.queued = { ...this.queued, ...patch };
    this.version++;
    this.show(this.queued);
    void this.flush();
  }
  dispose() {
    this.active = false;
  }
  private async flush() {
    if (this.sending || !this.active) return;
    this.sending = true;
    while (this.active && Object.keys(this.queued).length) {
      const patch = this.queued;
      const version = this.version;
      try {
        const design = await this.send(patch);
        if (!this.active) return;
        this.accept(design);
      } catch (error) {
        if (!this.active) return;
        this.fail(
          error instanceof Error ? error.message : "Could not save appearance.",
        );
      }
      if (version === this.version) this.queued = {};
      this.show(this.queued);
    }
    this.sending = false;
  }
}
