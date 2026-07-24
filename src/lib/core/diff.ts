// Snapshot diff → DbOps. Every mutation (and every undo) goes through this:
// compare the previous and next domain snapshots and emit exactly the rows
// that changed. Rows are flat records, so shallow comparison is sufficient.

import type { DbOp } from "./dbops";
import type { DomainData } from "./types";

function shallowEqual(a: object, b: object): boolean {
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  for (const key of Object.keys(left)) {
    if (left[key] !== right[key]) return false;
  }
  return true;
}

/** Emits put ops for added/changed rows and del ops for removed ones. */
function diffTable<T extends { id: string }>(
  prev: T[],
  next: T[],
  put: (row: T) => DbOp,
  del: (id: string) => DbOp,
): { puts: DbOp[]; dels: DbOp[] } {
  const prevById = new Map(prev.map((r) => [r.id, r]));
  const puts: DbOp[] = [];
  for (const row of next) {
    const old = prevById.get(row.id);
    if (old === undefined || !shallowEqual(old, row)) puts.push(put(row));
    prevById.delete(row.id);
  }
  const dels: DbOp[] = [];
  for (const id of prevById.keys()) dels.push(del(id));
  return { puts, dels };
}

/**
 * Full-domain diff. FK checks are deferred inside the transaction, so op
 * order is free — puts are still emitted before deletes per table for
 * readability of the batch.
 */
export function diffDomain(prev: DomainData, next: DomainData): DbOp[] {
  const lists = diffTable(prev.lists, next.lists,
    (row) => ({ kind: "putList", row }), (id) => ({ kind: "delList", id }));
  const groups = diffTable(prev.groups, next.groups,
    (row) => ({ kind: "putGroup", row }), (id) => ({ kind: "delGroup", id }));
  const todos = diffTable(prev.todos, next.todos,
    (row) => ({ kind: "putTodo", row }), (id) => ({ kind: "delTodo", id }));
  const subtasks = diffTable(prev.subtasks, next.subtasks,
    (row) => ({ kind: "putSubtask", row }), (id) => ({ kind: "delSubtask", id }));
  const activity = diffTable(prev.activity, next.activity,
    (row) => ({ kind: "putActivity", row }), (id) => ({ kind: "delActivity", id }));
  const labels = diffTable(prev.colorLabels, next.colorLabels,
    (row) => ({ kind: "putLabel", row }), (id) => ({ kind: "delLabel", id }));

  return [
    ...lists.puts, ...groups.puts, ...todos.puts,
    ...subtasks.puts, ...activity.puts, ...labels.puts,
    ...subtasks.dels, ...activity.dels, ...todos.dels,
    ...groups.dels, ...lists.dels, ...labels.dels,
  ];
}
