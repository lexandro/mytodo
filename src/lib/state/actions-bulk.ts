// Bulk actions on the current selection (ui.selectedIds). Each one is a single
// store.apply — so Ctrl+Z takes the whole batch back in one go — with one toast
// reporting what really changed. A one-row selection behaves exactly like the
// single-todo action it stands in for, which is what lets the keyboard and the
// toolbar route through here unconditionally.

import { STATUS_LABEL } from "$lib/core/activity";
import {
  duplicateMany, everyDone, everyPinned, setArchivedMany, setColorLabelMany, setPinMany,
  setStatusMany, titleLines, trashMany,
} from "$lib/core/bulk-ops";
import type { TodoStatus } from "$lib/core/types";
import { placeByStatusIfEnabled } from "./status-placement";
import { store } from "./store.svelte";
import { ui } from "./ui.svelte";

/** "Todo" for one, "4 todos" for many — so every bulk toast reads naturally. */
export function subject(count: number): string {
  return count === 1 ? "Todo" : `${count} todos`;
}

export function setStatusSelectionAction(status: TodoStatus): void {
  const ids = ui.selectedIds;
  if (ids.length === 0) return;
  let changed: string[] = [];
  store.apply("status change", (data) => {
    const now = Date.now();
    changed = setStatusMany(data, ids, status, now);
    placeByStatusIfEnabled(data, changed, now);
  });
  ui.ctxMenu = null;
  // one row redrawing is its own feedback; a batch needs saying out loud
  if (changed.length > 1) ui.showToast(`${changed.length} todos → ${STATUS_LABEL[status]}`, true);
}

/** Ctrl+Enter: finish them all, or reopen them when they are already done. */
export function toggleDoneSelectionAction(): void {
  const ids = ui.selectedIds;
  if (ids.length === 0) return;
  setStatusSelectionAction(everyDone(store.data, ids) ? "open" : "done");
}

export function togglePinSelectionAction(kind: "local" | "global"): void {
  const ids = ui.selectedIds;
  if (ids.length === 0) return;
  const value = !everyPinned(store.data, ids, kind);
  let changed = 0;
  store.apply("pin change", (data) => {
    changed = setPinMany(data, ids, kind, value, Date.now());
  });
  ui.ctxMenu = null;
  if (changed > 1) {
    const where = kind === "global" ? " globally" : "";
    ui.showToast(`${changed} todos ${value ? "pinned" : "unpinned"}${where}`, true);
  }
}

export function setColorLabelSelectionAction(colorLabelId: string | null): void {
  const ids = ui.selectedIds;
  if (ids.length === 0) return;
  let changed = 0;
  store.apply("color change", (data) => {
    changed = setColorLabelMany(data, ids, colorLabelId, Date.now());
  });
  ui.ctxMenu = null;
  if (changed > 1) ui.showToast(`${changed} todos recolored`, true);
}

export function setArchivedSelectionAction(archived: boolean): void {
  const ids = ui.selectedIds;
  if (ids.length === 0) return;
  let count = 0;
  store.apply(archived ? "archive" : "restore", (data) => {
    count = setArchivedMany(data, ids, archived, Date.now());
  });
  ui.ctxMenu = null;
  if (count === 0) return;
  if (count === 1) ui.showToast(archived ? "Archived" : "Restored from archive", true);
  else ui.showToast(`${count} todos ${archived ? "archived" : "restored from archive"}`, true);
}

export function trashSelectionAction(): void {
  const ids = ui.selectedIds;
  if (ids.length === 0) return;
  let count = 0;
  store.apply("delete", (data) => {
    count = trashMany(data, ids, Date.now());
  });
  // everything that was selected is gone from the list now
  ui.multi = null;
  ui.selectedId = null;
  ui.ctxMenu = null;
  if (count > 0) ui.showToast(`${subject(count)} moved to Trash`, true);
}

export function duplicateSelectionAction(): void {
  const ids = ui.selectedIds;
  if (ids.length === 0) return;
  let copies: string[] = [];
  store.apply("duplicate", (data) => {
    copies = duplicateMany(data, ids, Date.now());
  });
  ui.ctxMenu = null;
  if (copies.length === 0) return;
  if (copies.length === 1) {
    // one copy: jump onto it, the way the single-todo Duplicate does
    ui.multi = null;
    ui.selectedId = copies[0];
    ui.showToast("Duplicated", true);
    return;
  }
  // a batch keeps the originals selected: the copies sit interleaved between
  // them, so selecting the copies would look like nothing had happened
  ui.showToast(`${copies.length} todos duplicated`, true);
}

/** Copy titles: plain lines, ready to paste anywhere. Not a data mutation. */
export async function copyTitlesSelectionAction(): Promise<void> {
  const ids = ui.selectedIds;
  ui.ctxMenu = null;
  if (ids.length === 0) return;
  try {
    await navigator.clipboard.writeText(titleLines(store.data, ids));
    ui.showToast(ids.length === 1 ? "Title copied" : `${ids.length} titles copied`);
  } catch (e) {
    ui.showToast(`Cannot copy: ${e instanceof Error ? e.message : String(e)}`);
  }
}
