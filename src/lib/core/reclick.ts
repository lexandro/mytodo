// The "click the selected row again" gesture: it opens and closes the detail
// panel. The same row is ALSO renamed in place by a DOUBLE click, and the first
// click of a double click is indistinguishable from a lone click — so the
// toggle waits out the double-click window instead of firing right away, and
// the rename either cancels it or, when the second click came in late, takes it
// back. Timing lives here; state/detail-reclick.ts owns the timer.

/**
 * How long the toggle waits for a possible second click. Windows' own
 * double-click time is 500 ms, but that much lag on a whole panel reads as a
 * broken click; 250 ms covers an ordinary double click, and a slower one is
 * still put right afterwards by `undoneToggle`.
 */
export const RECLICK_TOGGLE_MS = 250;

/**
 * How long after the toggle fired a double click may still take it back. It
 * only has to span the gap between the timer firing and the second click, so a
 * later, deliberate double click never reverts an earlier honest toggle.
 */
export const RECLICK_UNDO_MS = 400;

/** What the gesture is decided from — all of it read BEFORE the click lands. */
export interface ReclickContext {
  /** The row that was clicked. */
  todoId: string;
  /** The pane that row is rendered in. */
  paneIndex: number;
  ctrl: boolean;
  shift: boolean;
  /** MouseEvent.detail: 2 on the second click of a double click. */
  clickCount: number;
  /** The row is in inline rename mode, so the click landed in its input. */
  editing: boolean;
  /** The single selection before the click. */
  selectedId: string | null;
  /** True while several rows are selected. */
  multiSelected: boolean;
  /** The active pane before the click. */
  activePane: number;
}

/**
 * True when the click leaves the selection exactly as it was — same row, same
 * pane, no modifier, no multi-selection to collapse first — and is therefore
 * the "again" click that means "show me the details" (or hide them).
 */
export function isDetailToggleClick(ctx: ReclickContext): boolean {
  if (ctx.ctrl || ctx.shift || ctx.editing) return false;
  if (ctx.clickCount !== 1) return false; // the tail of a double click
  if (ctx.multiSelected) return false; // a plain click collapses the selection
  return ctx.selectedId === ctx.todoId && ctx.activePane === ctx.paneIndex;
}

/** A toggle that already ran and can still be taken back. */
export interface FiredToggle {
  firedAt: number;
  /** What `detailOpen` was before the toggle. */
  openBefore: boolean;
}

/**
 * What the detail panel must be set back to when the double click arrives after
 * the toggle already fired — null when there is nothing to take back.
 */
export function undoneToggle(fired: FiredToggle | null, now: number): boolean | null {
  if (fired === null || now - fired.firedAt > RECLICK_UNDO_MS) return null;
  return fired.openBefore;
}
