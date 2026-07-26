// Toolbar glyphs as SVG path data, drawn on a 14×14 grid with a 1.3 stroke —
// the same weight as the title-bar icons, so the two bars read as one family.
// Kept out of Toolbar.svelte so that component stays about behaviour.

export type ToolbarIconName =
  | "undo"
  | "indent"
  | "outdent"
  | "done"
  | "pin"
  | "delete";

export const TOOLBAR_ICONS: Record<ToolbarIconName, readonly string[]> = {
  // arrow curving back to the left
  undo: ["M12 11.5A5 5 0 0 0 7 6.5H3", "M5.5 4L3 6.5L5.5 9"],
  // text lines pushed right, chevron pointing into them
  indent: ["M6 3h7", "M6 7h7", "M6 11h7", "M1.5 4.5L4 7l-2.5 2.5"],
  outdent: ["M6 3h7", "M6 7h7", "M6 11h7", "M4 4.5L1.5 7L4 9.5"],
  done: ["M2.5 7.5l3.2 3.2L11.5 3.5"],
  // pin stuck in at an angle
  pin: ["M8.8 1.6l3.6 3.6-2 .5-2.6 3.5-3-3 3.5-2.6z", "M4.8 8.2L1.4 12.6"],
  delete: ["M2.5 4h9", "M5.4 4V2.4h3.2V4", "M3.6 4l.7 8.4h5.4L10.4 4"],
};
