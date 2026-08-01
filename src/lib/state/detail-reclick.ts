// Timer side of the re-click gesture (core/reclick.ts). A click on the already
// selected row schedules the detail toggle; the next click, or the double click
// that turns into an inline rename, drops it again. Only TodoRow drives this.

import {
  isDetailToggleClick,
  RECLICK_TOGGLE_MS,
  undoneToggle,
  type FiredToggle,
  type ReclickContext,
} from "$lib/core/reclick";
import { openDetails } from "./actions";
import { ui } from "./ui.svelte";

let timer: ReturnType<typeof setTimeout> | undefined;
/** The last toggle that ran, while a late double click may still take it back. */
let fired: FiredToggle | null = null;

function clearPending(): void {
  if (timer === undefined) return;
  clearTimeout(timer);
  timer = undefined;
}

function toggleDetails(todoId: string): void {
  fired = { firedAt: Date.now(), openBefore: ui.detailOpen };
  if (ui.detailOpen) ui.detailOpen = false;
  else openDetails(todoId);
}

/**
 * Every click on a todo row enters here, BEFORE the selection changes — the
 * context describes the state the click arrived in.
 */
export function handleRowClick(ctx: ReclickContext): void {
  clearPending();
  // a first click starts a fresh gesture, so the previous one is settled for
  // good; the second click of a double click must leave it takeable-back
  if (ctx.clickCount === 1) fired = null;
  if (!isDetailToggleClick(ctx)) return;
  timer = setTimeout(() => {
    timer = undefined;
    // the row may have lost the selection in the meantime (keyboard, another pane)
    if (ui.selectedId === ctx.todoId) toggleDetails(ctx.todoId);
  }, RECLICK_TOGGLE_MS);
}

/** The click turned out to be a double click: drop the toggle, or undo it. */
export function handleRowDoubleClick(): void {
  clearPending();
  const restore = undoneToggle(fired, Date.now());
  if (restore !== null) ui.detailOpen = restore;
  fired = null;
}
