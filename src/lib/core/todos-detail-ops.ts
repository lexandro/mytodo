// Detail-panel operations: field edits, pinning, archive, duplicate.
// Split from todos-ops.ts to keep both modules focused.

import { logActivity } from "./activity";
import { newId } from "./ids";
import { orderBetween } from "./ordering";
import { sortedByOrder } from "./scope";
import { subtreeOf } from "./todo-tree";
import { findTodo } from "./todos-ops";
import type { DomainData, Todo } from "./types";

export function setDescription(data: DomainData, id: string, description: string, now: number): void {
  const todo = findTodo(data, id);
  if (todo === undefined || todo.description === description) return;
  todo.description = description;
  todo.updatedAt = now;
}

export function setEmoji(data: DomainData, id: string, emoji: string, now: number): void {
  const todo = findTodo(data, id);
  if (todo === undefined || todo.emoji === emoji) return;
  todo.emoji = emoji;
  todo.updatedAt = now;
}

export function setColorLabel(data: DomainData, id: string, colorLabelId: string | null, now: number): void {
  const todo = findTodo(data, id);
  if (todo === undefined || todo.colorLabelId === colorLabelId) return;
  todo.colorLabelId = colorLabelId;
  todo.updatedAt = now;
}

export function togglePin(data: DomainData, id: string, kind: "local" | "global", now: number): void {
  const todo = findTodo(data, id);
  if (todo === undefined) return;
  const wasPinned = kind === "local" ? todo.pinLocal : todo.pinGlobal;
  if (kind === "local") todo.pinLocal = !wasPinned;
  else todo.pinGlobal = !wasPinned;
  todo.updatedAt = now;
  const verb = wasPinned ? "Unpinned" : "Pinned";
  const suffix = kind === "global" ? " globally" : " to list";
  logActivity(data, id, "pin", verb + suffix, now);
}

/** Archives/unarchives the whole subtree — sub-items follow their parent. */
export function setArchived(data: DomainData, id: string, archived: boolean, now: number): void {
  const todo = findTodo(data, id);
  if (todo === undefined || todo.archived === archived) return;
  for (const member of subtreeOf(data, id)) {
    if (member.trashed || member.archived === archived) continue;
    member.archived = archived;
    member.updatedAt = now;
  }
  logActivity(data, id, "archive", archived ? "Archived" : "Restored from archive", now);
}

/**
 * Duplicate (daprompt §27): copies title/description/emoji/color/subtasks;
 * new id, Open status, pins cleared, not archived, fresh activity log.
 * Placed right after the original in its scope — including under the same
 * parent todo. Sub-items are NOT copied: the duplicate lands as a leaf.
 */
export function duplicateTodo(data: DomainData, id: string, now: number): Todo | null {
  const original = findTodo(data, id);
  if (original === undefined) return null;
  const scope = sortedByOrder(
    data.todos.filter(
      (t) =>
        t.listId === original.listId &&
        t.groupId === original.groupId &&
        t.parentId === original.parentId &&
        !t.trashed &&
        !t.archived &&
        t.id !== id,
    ),
  );
  // midpoint between the original and its next sibling → "right after"
  const next = scope.find((t) => t.order > original.order);
  const copy: Todo = {
    ...original,
    id: newId(),
    status: "open",
    pinLocal: false,
    pinGlobal: false,
    archived: false,
    trashed: false,
    trashedAt: null,
    order: orderBetween(original.order, next?.order ?? null),
    createdAt: now,
    updatedAt: now,
  };
  data.todos.push(copy);
  for (const subtask of sortedByOrder(data.subtasks.filter((s) => s.todoId === id))) {
    data.subtasks.push({ ...subtask, id: newId(), todoId: copy.id });
  }
  logActivity(data, copy.id, "created", `Created — duplicate of "${original.title}"`, now);
  return copy;
}
