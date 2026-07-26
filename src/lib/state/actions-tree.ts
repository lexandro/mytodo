// Sub-item actions: the gestures that reshape the todo tree — dropping a todo
// ONTO another one, the context menu's Make sub-item / Lift out, Tab and
// Shift+Tab, and applying a status to a whole branch.

import { MAX_TODO_DEPTH, type TodoStatus } from "$lib/core/types";
import { indentCheck } from "$lib/core/todo-tree";
import { findTodo } from "$lib/core/todos-ops";
import { nestTodo, outdentTodo, setStatusDeep } from "$lib/core/todos-tree-ops";
import { placeByStatusIfEnabled } from "./status-placement";
import { store } from "./store.svelte";
import { ui } from "./ui.svelte";

const DEPTH_LIMIT_MESSAGE = `Sub-items only go ${MAX_TODO_DEPTH} levels deep`;

/** Drop "onto" a row, and the context menu's Make sub-item. */
export function nestTodoAction(id: string, parentId: string): void {
  const todo = findTodo(store.data, id);
  const parent = findTodo(store.data, parentId);
  ui.ctxMenu = null;
  ui.clearDragState();
  if (todo === undefined || parent === undefined) return;
  // dropping a sub-item back onto its own parent changes nothing — saying
  // "too deep" there would be a lie
  if (todo.parentId === parentId) return;
  let nested = false;
  store.apply("make sub-item", (data) => {
    nested = nestTodo(data, id, parentId, Date.now());
  });
  ui.showToast(nested ? `Sub-item of "${parent.title}"` : DEPTH_LIMIT_MESSAGE, nested);
}

/** Tab: slide under the todo right above, keeping the branch intact. */
export function indentTodoAction(id: string): void {
  const check = indentCheck(store.data, id);
  if (!check.ok) {
    ui.ctxMenu = null;
    ui.showToast(check.reason === "too-deep" ? DEPTH_LIMIT_MESSAGE : "Nothing above to nest under");
    return;
  }
  nestTodoAction(id, check.target.id);
}

/** Shift+Tab: lift one level out, landing right after the former parent. */
export function outdentTodoAction(id: string): void {
  let lifted = false;
  store.apply("lift out", (data) => {
    lifted = outdentTodo(data, id, Date.now());
  });
  ui.ctxMenu = null;
  // Tab says why nothing happened, so Shift+Tab should too
  ui.showToast(lifted ? "Lifted out" : "Already at the top level", lifted);
}

/** Context menu "… with sub-items": one status for the whole branch. */
export function setStatusDeepAction(id: string, status: TodoStatus): void {
  let changed: string[] = [];
  store.apply("status change", (data) => {
    const now = Date.now();
    changed = setStatusDeep(data, id, status, now);
    placeByStatusIfEnabled(data, changed, now);
  });
  ui.ctxMenu = null;
  if (changed.length > 1) {
    ui.showToast(`${changed.length} todos updated`, true);
  }
}
