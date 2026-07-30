// The pane's row list as a viewport: how far one PageUp/PageDown step reaches,
// and keeping the focused row on screen after a keyboard move.
//
// The only measuring module in the state layer. It works off the scroll
// containers registered in ui.paneRowsEls, the same way ui.quickAddEls holds
// the quick-add inputs — the core stays free of pixels.

import { ui } from "./ui.svelte";

/** Rows a page step covers when the pane cannot be measured (yet). */
const FALLBACK_PAGE = 10;

function containerOf(paneIndex: number): HTMLElement | null {
  return ui.paneRowsEls[paneIndex] ?? null;
}

export function pageSizeOf(paneIndex: number): number {
  const container = containerOf(paneIndex);
  if (container === null) return FALLBACK_PAGE;
  const row = container.querySelector<HTMLElement>("[data-todo-id]");
  const rowHeight = row?.offsetHeight ?? 0;
  if (rowHeight <= 0) return FALLBACK_PAGE;
  // one row of overlap, so the row you were reading stays on screen
  return Math.max(1, Math.floor(container.clientHeight / rowHeight) - 1);
}

/**
 * Scrolls the focused row just far enough to be visible, never further.
 *
 * Home and End are the exception: they pin the list to its very top or bottom.
 * Scrolling the first row barely into view would leave the section header above
 * it cut off, and to a reader that header is part of "the top".
 */
export function revealFocus(paneIndex: number, edge?: "first" | "last"): void {
  const container = containerOf(paneIndex);
  const focusId = ui.selectedId;
  if (container === null || focusId === null) return;
  if (edge === "first") {
    container.scrollTop = 0;
    return;
  }
  if (edge === "last") {
    container.scrollTop = container.scrollHeight;
    return;
  }
  const row = container.querySelector<HTMLElement>(`[data-todo-id="${CSS.escape(focusId)}"]`);
  row?.scrollIntoView({ block: "nearest" });
}
