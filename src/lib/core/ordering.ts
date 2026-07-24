// Fractional ordering: each row stores a float `order`; inserting between two
// neighbours takes their midpoint, so a move touches exactly one row.
// When midpoints run out of float precision the caller rebalances the scope.

export const ORDER_STEP = 1000;

/** Order value for inserting between prev and next (null = edge). */
export function orderBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return ORDER_STEP;
  if (prev === null) return (next as number) - ORDER_STEP;
  if (next === null) return prev + ORDER_STEP;
  return (prev + next) / 2;
}

/** True when the midpoint collapsed into a neighbour — rebalance needed. */
export function needsRebalance(order: number, prev: number | null, next: number | null): boolean {
  return order === prev || order === next;
}

/** Reassigns evenly spaced orders; returns the items whose order changed. */
export function rebalance<T extends { order: number }>(sorted: T[]): T[] {
  const changed: T[] = [];
  sorted.forEach((item, i) => {
    const target = (i + 1) * ORDER_STEP;
    if (item.order !== target) {
      item.order = target;
      changed.push(item);
    }
  });
  return changed;
}

/** Sort helper: by order, id as a stable tiebreaker. */
export function byOrder<T extends { order: number; id: string }>(a: T, b: T): number {
  return a.order - b.order || (a.id < b.id ? -1 : 1);
}
