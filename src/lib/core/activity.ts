// Activity log helpers — meaningful user actions only (daprompt §23).

import { newId } from "./ids";
import type { DomainData, TodoStatus } from "./types";

export const STATUS_LABEL: Record<TodoStatus, string> = {
  open: "Open",
  progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

export function logActivity(
  data: DomainData,
  todoId: string,
  type: string,
  summary: string,
  now: number,
): void {
  data.activity.push({ id: newId(), todoId, type, summary, createdAt: now });
}

/** "List / Group / Subgroup" path for a location, used in move summaries. */
export function locationPath(data: DomainData, listId: string, groupId: string | null): string {
  const parts: string[] = [];
  let cursor = groupId;
  while (cursor !== null) {
    const group = data.groups.find((g) => g.id === cursor);
    if (group === undefined) break;
    parts.unshift(group.name);
    cursor = group.parentId;
  }
  const list = data.lists.find((l) => l.id === listId);
  parts.unshift(list?.name ?? "?");
  return parts.join(" / ");
}
