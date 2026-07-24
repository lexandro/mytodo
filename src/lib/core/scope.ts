// Placement inside an ordered sibling scope. Works on live references:
// when precision runs out the whole scope is rebalanced in place and the
// diff picks up every changed row automatically.

import { byOrder, needsRebalance, orderBetween, rebalance } from "./ordering";

/**
 * Order value for inserting at `index` among `siblings` (sorted, WITHOUT the
 * moved item). May rebalance the scope in place as a side effect.
 */
export function orderForIndex<T extends { order: number; id: string }>(
  siblings: T[],
  index: number,
): number {
  const prev = index > 0 ? siblings[index - 1].order : null;
  const next = index < siblings.length ? siblings[index].order : null;
  const value = orderBetween(prev, next);
  if (!needsRebalance(value, prev, next)) return value;
  rebalance(siblings);
  const prev2 = index > 0 ? siblings[index - 1].order : null;
  const next2 = index < siblings.length ? siblings[index].order : null;
  return orderBetween(prev2, next2);
}

/** Sorted copy of an ordered scope. */
export function sortedByOrder<T extends { order: number; id: string }>(items: T[]): T[] {
  return [...items].sort(byOrder);
}

/**
 * Order value for dropping relative to `targetId` ('before' | 'after') within
 * `siblings` (sorted, WITHOUT the moved item). Appends when target missing.
 */
export function orderForDrop<T extends { order: number; id: string }>(
  siblings: T[],
  targetId: string,
  position: "before" | "after",
): number {
  const idx = siblings.findIndex((s) => s.id === targetId);
  if (idx === -1) return orderForIndex(siblings, siblings.length);
  return orderForIndex(siblings, position === "before" ? idx : idx + 1);
}
