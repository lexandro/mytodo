// The Settings → Behavior "move by status" switch has exactly ONE gate: this
// module. Manual status changes and applied AI proposals both route through it,
// and the reposition always rides inside the caller's store.apply — so it is a
// single undo step together with the status change itself.

import { placeNewTodo, placeTodoByStatus } from "$lib/core/status-order";
import type { DomainData } from "$lib/core/types";
import { ui } from "./ui.svelte";

export function placeByStatusIfEnabled(
  data: DomainData,
  ids: readonly string[],
  now: number,
): void {
  if (!ui.moveByStatus) return;
  for (const id of ids) placeTodoByStatus(data, id, now);
}

/**
 * Slots freshly created todos per Settings → Behavior. Every path that makes
 * a todo (quick add, group menu, the global quick-add window, applied AI
 * proposals) routes through here, so "where new todos go" has one answer.
 *
 * A batch going to the top is placed back-to-front: each one lands above the
 * previous, which would otherwise reverse the batch's own order.
 */
export function placeNewTodos(data: DomainData, ids: readonly string[]): void {
  const placement = ui.newTodoPlacement;
  const ordered = placement === "top" ? [...ids].reverse() : ids;
  for (const id of ordered) placeNewTodo(data, id, placement);
}
