// Status-driven placement: an in-progress todo rises to the top of its own
// sibling scope, a done/cancelled one sinks to the bottom. This is a REAL
// reorder (it writes `order`), so the row keeps behaving like any hand-dragged
// row afterwards — the caller decides whether the behavior is switched on.
//
// Scope = the todo's own group (or the list root). A status change never pulls
// a todo out of its group; grouping is the user's structure, not ours.

import { orderForIndex } from "./scope";
import { findTodo, scopeSiblings } from "./todos-ops";
import type { DomainData, TodoStatus } from "./types";

/** Where a status wants its todo: the scope's top, its bottom, or nowhere. */
export type StatusPlacement = "top" | "bottom" | "none";

/** "open" is deliberately "none" — it has no natural home, so it stays put. */
export function statusPlacement(status: TodoStatus): StatusPlacement {
  switch (status) {
    case "progress":
      return "top";
    case "done":
    case "cancelled":
      return "bottom";
    case "open":
      return "none";
  }
}

/**
 * Repositions the todo inside its own scope according to its current status.
 * Skipped for pinned rows (the Pinned section is their home already) and for
 * archived/trashed rows (they are not part of the scope at all).
 * Returns true when the order actually changed.
 */
export function placeTodoByStatus(data: DomainData, id: string, now: number): boolean {
  const todo = findTodo(data, id);
  if (todo === undefined || todo.trashed || todo.archived) return false;
  if (todo.pinLocal || todo.pinGlobal) return false;
  const placement = statusPlacement(todo.status);
  if (placement === "none") return false;
  const siblings = scopeSiblings(data, todo.listId, todo.groupId, todo.parentId, id);
  if (siblings.length === 0) return false;
  // already there: writing a new order would churn the DB and the undo stack
  const edge = placement === "top" ? siblings[0] : siblings[siblings.length - 1];
  if (placement === "top" ? todo.order < edge.order : todo.order > edge.order) return false;
  todo.order = orderForIndex(siblings, placement === "top" ? 0 : siblings.length);
  todo.updatedAt = now;
  return true;
}
