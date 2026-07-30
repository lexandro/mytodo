// Bulk edits on a selection of todos: status, pins, color, archive, trash,
// duplicate. Each function walks the ids in row order and reports what it
// actually changed, so the action layer can put one honest toast on one undo
// step. Two kinds of operation live here, and the difference matters:
//
//  - a todo's OWN field (status, color, pin) is set on every selected row;
//  - an operation that cascades into sub-items (archive, trash) runs on the
//    selection's roots only — the descendants follow their parent anyway.

import { selectionRoots } from "./todo-tree";
import { duplicateTodo, setArchived, setColorLabel, setPin } from "./todos-detail-ops";
import { findTodo, setStatus, trashTodo } from "./todos-ops";
import type { DomainData, TodoStatus } from "./types";

/** Returns the ids that actually changed — the caller repositions exactly those. */
export function setStatusMany(
  data: DomainData,
  ids: readonly string[],
  status: TodoStatus,
  now: number,
): string[] {
  const changed: string[] = [];
  for (const id of ids) {
    if (setStatus(data, id, status, now)) changed.push(id);
  }
  return changed;
}

/** Ctrl+Enter on a selection: one row still open is enough to mean "finish all". */
export function everyDone(data: DomainData, ids: readonly string[]): boolean {
  return ids.length > 0 && ids.every((id) => findTodo(data, id)?.status === "done");
}

/** The same rule for the pin toggles: all pinned → unpin, otherwise pin. */
export function everyPinned(
  data: DomainData,
  ids: readonly string[],
  kind: "local" | "global",
): boolean {
  return (
    ids.length > 0 &&
    ids.every((id) => {
      const todo = findTodo(data, id);
      if (todo === undefined) return false;
      return kind === "local" ? todo.pinLocal : todo.pinGlobal;
    })
  );
}

export function setPinMany(
  data: DomainData,
  ids: readonly string[],
  kind: "local" | "global",
  value: boolean,
  now: number,
): number {
  let changed = 0;
  for (const id of ids) {
    if (setPin(data, id, kind, value, now)) changed += 1;
  }
  return changed;
}

export function setColorLabelMany(
  data: DomainData,
  ids: readonly string[],
  colorLabelId: string | null,
  now: number,
): number {
  let changed = 0;
  for (const id of ids) {
    const todo = findTodo(data, id);
    if (todo === undefined || todo.colorLabelId === colorLabelId) continue;
    setColorLabel(data, id, colorLabelId, now);
    changed += 1;
  }
  return changed;
}

/** Counts the selected rows that ended up archived (or restored). */
export function setArchivedMany(
  data: DomainData,
  ids: readonly string[],
  archived: boolean,
  now: number,
): number {
  const pending = ids.filter((id) => {
    const todo = findTodo(data, id);
    return todo !== undefined && todo.archived !== archived;
  });
  for (const id of selectionRoots(data, pending)) setArchived(data, id, archived, now);
  return pending.filter((id) => findTodo(data, id)?.archived === archived).length;
}

export function trashMany(data: DomainData, ids: readonly string[], now: number): number {
  const pending = ids.filter((id) => findTodo(data, id)?.trashed === false);
  for (const id of selectionRoots(data, pending)) trashTodo(data, id, now);
  return pending.filter((id) => findTodo(data, id)?.trashed === true).length;
}

/** Every copy lands right after its own original, so a block keeps its order. */
export function duplicateMany(
  data: DomainData,
  ids: readonly string[],
  now: number,
): string[] {
  const copies: string[] = [];
  for (const id of ids) {
    const copy = duplicateTodo(data, id, now);
    if (copy !== null) copies.push(copy.id);
  }
  return copies;
}

/**
 * The selection as plain text lines. CRLF, because this goes to the Windows
 * clipboard and Notepad is the likeliest destination.
 */
export function titleLines(data: DomainData, ids: readonly string[]): string {
  const titles: string[] = [];
  for (const id of ids) {
    const todo = findTodo(data, id);
    if (todo !== undefined) titles.push(todo.title);
  }
  return titles.join("\r\n");
}
