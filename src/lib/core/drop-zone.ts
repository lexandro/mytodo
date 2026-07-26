// Which part of a row the pointer is over during a drag. Classic Explorer /
// outliner behaviour: the wide middle band means "drop ONTO this row" (make a
// sub-item), thin bands at the top and bottom mean "drop BETWEEN two rows".
//
// Pure geometry so the rule is testable without a DOM: the row hands over its
// height and the pointer offset inside it.

export type DropZone = "before" | "into" | "after";

/** Share of the row height that counts as an edge band, top and bottom alike. */
const EDGE_RATIO = 0.25;

/**
 * `offsetY` is the pointer position measured from the row's top edge.
 * When `nestable` is false the middle band is split between the neighbours,
 * so a row that cannot take children still reorders normally.
 */
export function dropZoneAt(offsetY: number, height: number, nestable: boolean): DropZone {
  if (height <= 0) return "before";
  if (!nestable) return offsetY < height / 2 ? "before" : "after";
  const edge = height * EDGE_RATIO;
  if (offsetY < edge) return "before";
  if (offsetY > height - edge) return "after";
  return "into";
}
