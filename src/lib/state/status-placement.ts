// The Settings → Behavior "move by status" switch has exactly ONE gate: this
// module. Manual status changes and applied AI proposals both route through it,
// and the reposition always rides inside the caller's store.apply — so it is a
// single undo step together with the status change itself.

import { placeTodoByStatus } from "$lib/core/status-order";
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
