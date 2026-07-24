// Serialized persistence queue: DbOp batches are written in order, one at a
// time. On failure the batch is kept at the front and the UI shows an error
// state with a retry — data is never dropped silently.

import type { DbOp } from "$lib/core/dbops";
import { dbApply } from "$lib/ipc";

export type SaveState = "saved" | "saving" | "error";

class PersistQueue {
  state = $state<SaveState>("saved");
  lastError = $state<string | null>(null);
  private pending: DbOp[][] = [];
  private flushing = false;

  enqueue(ops: DbOp[]): void {
    if (ops.length === 0) return;
    this.pending.push(ops);
    void this.flush();
  }

  async retry(): Promise<void> {
    this.lastError = null;
    await this.flush();
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.lastError !== null) return;
    this.flushing = true;
    this.state = "saving";
    try {
      while (this.pending.length > 0) {
        // peek, don't pop: on failure the batch stays queued for retry
        await dbApply(this.pending[0]);
        this.pending.shift();
      }
      this.state = "saved";
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
      this.state = "error";
    } finally {
      this.flushing = false;
    }
  }
}

export const persistQueue = new PersistQueue();
