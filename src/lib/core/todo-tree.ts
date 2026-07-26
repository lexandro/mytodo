// Sub-item tree: a todo may live UNDER another todo (Todo.parentId). The whole
// chain shares one listId/groupId — nesting never moves a todo out of its
// group, it only changes where it sits inside it.
//
// Structure only, no visibility filtering: these walk parent/child links and
// the caller decides what counts as visible (rows.ts prunes, the ops cascade).
// Every walk is cycle-safe — a corrupted import must not hang the app.

import { byOrder } from "./ordering";
import { MAX_TODO_DEPTH, type DomainData, type Todo } from "./types";

/** Direct children of a todo, in render order. */
export function childrenOf(data: DomainData, parentId: string): Todo[] {
  return data.todos.filter((t) => t.parentId === parentId).sort(byOrder);
}

/** 1 for a top-level todo, +1 for every parent hop above it. */
export function todoDepth(data: DomainData, id: string): number {
  const seen = new Set<string>([id]);
  let cursor = data.todos.find((t) => t.id === id)?.parentId ?? null;
  let depth = 1;
  while (cursor !== null && !seen.has(cursor)) {
    seen.add(cursor);
    depth += 1;
    cursor = data.todos.find((t) => t.id === cursor)?.parentId ?? null;
  }
  return depth;
}

/** The todo itself plus every descendant — parents always before children. */
export function subtreeOf(data: DomainData, id: string): Todo[] {
  const root = data.todos.find((t) => t.id === id);
  if (root === undefined) return [];
  const out: Todo[] = [root];
  const seen = new Set<string>([id]);
  for (let i = 0; i < out.length; i += 1) {
    for (const child of childrenOf(data, out[i].id)) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push(child);
    }
  }
  return out;
}

/** How many levels the subtree spans: 1 for a childless todo. */
export function subtreeHeight(data: DomainData, id: string, seen: Set<string> = new Set()): number {
  if (seen.has(id)) return 0; // corrupted cycle: stop instead of recursing forever
  seen.add(id);
  const children = childrenOf(data, id);
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map((c) => subtreeHeight(data, c.id, seen)));
}

/** True when `ancestorId` is `id` itself or sits somewhere above it. */
export function isSelfOrAncestor(data: DomainData, id: string, ancestorId: string): boolean {
  return subtreeOf(data, ancestorId).some((t) => t.id === id);
}

/**
 * May `id` become a child of `parentId`? Blocks the two ways nesting can go
 * wrong: dropping a todo into its own subtree (cycle), and pushing the moved
 * subtree past the depth cap.
 */
export function canNest(data: DomainData, id: string, parentId: string): boolean {
  if (id === parentId) return false;
  const parent = data.todos.find((t) => t.id === parentId);
  if (parent === undefined || parent.trashed) return false;
  if (isSelfOrAncestor(data, parentId, id)) return false;
  return todoDepth(data, parentId) + subtreeHeight(data, id) <= MAX_TODO_DEPTH;
}

/**
 * Whether Tab can indent this todo, and why not when it cannot — the menu
 * shows the reason and the action reports it, both from this one answer.
 */
export type IndentCheck =
  | { ok: true; target: Todo }
  | { ok: false; reason: "no-sibling" | "too-deep" };

export function indentCheck(data: DomainData, id: string): IndentCheck {
  const todo = data.todos.find((t) => t.id === id);
  if (todo === undefined) return { ok: false, reason: "no-sibling" };
  const siblings = data.todos
    .filter(
      (t) =>
        t.listId === todo.listId &&
        t.groupId === todo.groupId &&
        t.parentId === todo.parentId &&
        !t.trashed &&
        t.archived === todo.archived,
    )
    .sort(byOrder);
  const index = siblings.findIndex((t) => t.id === id);
  if (index <= 0) return { ok: false, reason: "no-sibling" };
  const previous = siblings[index - 1];
  if (!canNest(data, id, previous.id)) return { ok: false, reason: "too-deep" };
  return { ok: true, target: previous };
}
