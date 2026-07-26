// Status-driven placement: an in-progress todo rises to the top of its own
// sibling scope, a done/cancelled one sinks to the bottom. This is a REAL
// reorder (it writes `order`), so the row keeps behaving like any hand-dragged
// row afterwards — the caller decides whether the behavior is switched on.
//
// Scope = the todo's own group (or the list root). A status change never pulls
// a todo out of its group; grouping is the user's structure, not ours.

import { orderForIndex } from "./scope";
import { findTodo, scopeSiblings } from "./todos-ops";
import type { DomainData, Todo, TodoStatus } from "./types";

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

/** Where a freshly created todo lands inside its scope. */
export type NewTodoPlacement = "top" | "bottom";

/**
 * Slots a new todo into its scope: "top" puts it UNDER the in-progress rows
 * (what you are working on stays first), "bottom" puts it ABOVE the done and
 * cancelled ones (finished work never buries a fresh todo).
 *
 * Pinned rows are ignored on purpose — they render in their own section, so
 * where they sit in the ordering says nothing about what the list looks like.
 */
export function placeNewTodo(data: DomainData, id: string, placement: NewTodoPlacement): boolean {
  const todo = findTodo(data, id);
  if (todo === undefined) return false;
  const siblings = scopeSiblings(data, todo.listId, todo.groupId, todo.parentId, id);
  const unpinned = siblings.filter((t) => !t.pinLocal && !t.pinGlobal);
  if (unpinned.length === 0) return false; // nothing to slot between
  const neighbour =
    placement === "top"
      ? unpinned.find((t) => t.status !== "progress")
      : findLast(unpinned, (t) => t.status !== "done" && t.status !== "cancelled");
  const index = edgeIndex(siblings, unpinned, neighbour, placement);
  todo.order = orderForIndex(siblings, index);
  return true;
}

/**
 * Turns the neighbour into an insertion index in the FULL scope: "top" lands
 * before it, "bottom" after it. With no neighbour every visible row is of the
 * kind we must stay clear of, so we go to the far side of them instead.
 */
function edgeIndex(
  siblings: Todo[],
  unpinned: Todo[],
  neighbour: Todo | undefined,
  placement: NewTodoPlacement,
): number {
  if (neighbour === undefined) {
    // all in progress → after them; all done/cancelled → before them
    const edge = placement === "top" ? unpinned[unpinned.length - 1] : unpinned[0];
    return placement === "top" ? siblings.indexOf(edge) + 1 : siblings.indexOf(edge);
  }
  const at = siblings.indexOf(neighbour);
  return placement === "top" ? at : at + 1;
}

/** Array.prototype.findLast is ES2023; the build targets an older baseline. */
function findLast(items: Todo[], match: (todo: Todo) => boolean): Todo | undefined {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (match(items[i])) return items[i];
  }
  return undefined;
}
