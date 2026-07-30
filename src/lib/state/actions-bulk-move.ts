// Bulk placement actions: Move to…, the multi-row drag (before/after a row and
// onto one) and Alt+↑/↓ on a whole block. Same contract as actions-bulk.ts —
// one store.apply, one toast, and identical behaviour for a single row.

import { moveMany, moveManyInScope, nestMany, reorderMany } from "$lib/core/bulk-move";
import { findTodo } from "$lib/core/todos-ops";
import { subject } from "./actions-bulk";
import { DEPTH_LIMIT_MESSAGE } from "./actions-tree";
import { store } from "./store.svelte";
import { ui } from "./ui.svelte";

export function moveSelectionAction(
  listId: string,
  groupId: string | null,
  destination: string,
): void {
  const ids = ui.selectedIds;
  if (ids.length === 0) return;
  let count = 0;
  store.apply("move", (data) => {
    count = moveMany(data, ids, listId, groupId, Date.now());
  });
  ui.ctxMenu = null;
  ui.clearDragState();
  if (count > 0) ui.showToast(`${subject(count)} moved to ${destination}`, true);
}

/** Dropped between two rows: the block lands there in its own order. */
export function reorderSelectionAction(targetId: string, position: "before" | "after"): void {
  const ids = ui.selectedIds;
  if (ids.length === 0) return;
  let count = 0;
  store.apply("move", (data) => {
    count = reorderMany(data, ids, targetId, position, Date.now());
  });
  ui.clearDragState();
  if (count > 0) ui.showToast(count === 1 ? "Moved" : `${count} todos moved`, true);
}

/** Dropped onto a row: everything that fits under it becomes a sub-item. */
export function nestSelectionAction(parentId: string): void {
  const ids = ui.selectedIds;
  if (ids.length === 0) return;
  const parentTitle = findTodo(store.data, parentId)?.title ?? "";
  let nested = 0;
  let blocked = 0;
  store.apply("make sub-item", (data) => {
    const result = nestMany(data, ids, parentId, Date.now());
    nested = result.nested;
    blocked = result.blocked;
  });
  ui.ctxMenu = null;
  ui.clearDragState();
  if (nested === 0) {
    if (blocked > 0) ui.showToast(DEPTH_LIMIT_MESSAGE);
    return;
  }
  // a partial result must say so — silently dropping rows would look like a bug
  const tail = blocked === 0 ? "" : ` — ${blocked} too deep`;
  ui.showToast(`${subject(nested)} moved under "${parentTitle}"${tail}`, true);
}

/** Alt+↑/↓: the whole selection steps one row inside its scope. */
export function moveSelectionInScopeAction(direction: "up" | "down"): void {
  const ids = ui.selectedIds;
  if (ids.length === 0) return;
  let moved = 0;
  store.apply("reorder", (data) => {
    moved = moveManyInScope(data, ids, direction, Date.now());
  });
  ui.ctxMenu = null;
  if (moved === 0) ui.showToast(direction === "up" ? "Already first" : "Already last");
}
