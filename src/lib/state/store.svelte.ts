// Central domain store. The in-memory state is the authority; every mutation
// runs through apply(): snapshot → mutate → diff → persist. Undo restores a
// snapshot and persists the diff the same way — persistence logic exists in
// exactly one place.

import { diffDomain } from "$lib/core/diff";
import { emptyDomainData, type DomainData } from "$lib/core/types";
import { dbLoadAll } from "$lib/ipc";
import { persistQueue } from "./persist.svelte";

const UNDO_DEPTH = 30;

export interface UndoEntry {
  label: string;
  snapshot: DomainData;
}

class DomainStore {
  data = $state<DomainData>(emptyDomainData());
  loaded = $state(false);
  loadError = $state<string | null>(null);
  private undoStack: UndoEntry[] = [];

  async init(bootstrap: (data: DomainData) => void): Promise<void> {
    try {
      const loaded = await dbLoadAll();
      this.data = loaded;
      this.loaded = true;
      // first-run defaults (e.g. Inbox) go through the normal pipeline,
      // but must not be undoable — Ctrl+Z right after first launch would
      // otherwise delete the Inbox
      this.apply("bootstrap", bootstrap);
      this.undoStack = [];
    } catch (e) {
      this.loadError = e instanceof Error ? e.message : String(e);
    }
  }

  /**
   * Runs a mutation: snapshots the current state (undo), applies the mutator
   * to the live state and persists exactly the changed rows.
   * `undoable: false` persists without an undo entry (e.g. collapse state —
   * per INTERACTIONS.md undo covers data mutations, not view toggles).
   */
  apply(label: string, mutate: (data: DomainData) => void, opts?: { undoable?: boolean }): void {
    const prev = $state.snapshot(this.data) as DomainData;
    mutate(this.data);
    const next = $state.snapshot(this.data) as DomainData;
    const ops = diffDomain(prev, next);
    if (ops.length === 0) return; // no-op mutation: nothing to undo or save
    if (opts?.undoable !== false) {
      this.undoStack.push({ label, snapshot: prev });
      if (this.undoStack.length > UNDO_DEPTH) this.undoStack.shift();
    }
    persistQueue.enqueue(ops);
  }

  /** Pops the undo stack; returns the undone action's label or null. */
  undo(): string | null {
    const entry = this.undoStack.pop();
    if (entry === undefined) return null;
    const prev = $state.snapshot(this.data) as DomainData;
    this.data = entry.snapshot;
    persistQueue.enqueue(diffDomain(prev, entry.snapshot));
    return entry.label;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Replaces the in-memory state with freshly loaded DB content (backup
   * restore). No diff/persist — the database IS the new source; the undo
   * stack is cleared because its snapshots describe the old world.
   */
  replaceLoaded(data: DomainData): void {
    this.data = data;
    this.undoStack = [];
  }
}

export const store = new DomainStore();
