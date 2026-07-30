import { describe, expect, it } from "vitest";
import { rangeBetween, rowAt, toggleInSelection } from "./selection";

const ROWS = ["a", "b", "c", "d", "e"];

describe("rangeBetween", () => {
  it("spans the same rows whichever end the anchor is on", () => {
    expect(rangeBetween(ROWS, "b", "d")).toEqual(["b", "c", "d"]);
    expect(rangeBetween(ROWS, "d", "b")).toEqual(["b", "c", "d"]);
  });

  it("is a single row when the anchor is the focus", () => {
    expect(rangeBetween(ROWS, "c", "c")).toEqual(["c"]);
  });

  it("is empty when either end is off screen", () => {
    expect(rangeBetween(ROWS, "gone", "c")).toEqual([]);
    expect(rangeBetween(ROWS, "c", "gone")).toEqual([]);
  });
});

describe("toggleInSelection", () => {
  it("adds a row and keeps the result in row order, not click order", () => {
    expect(toggleInSelection(ROWS, ["d"], "b")).toEqual(["b", "d"]);
  });

  it("removes a row that was already in", () => {
    expect(toggleInSelection(ROWS, ["b", "c", "d"], "c")).toEqual(["b", "d"]);
  });

  it("drops ids that scrolled out of the row list", () => {
    expect(toggleInSelection(ROWS, ["b", "gone"], "c")).toEqual(["b", "c"]);
  });
});

describe("rowAt", () => {
  it("steps one row in either direction", () => {
    expect(rowAt(ROWS, "c", { by: 1 })).toBe("d");
    expect(rowAt(ROWS, "c", { by: -1 })).toBe("b");
  });

  it("jumps to the ends for Home and End", () => {
    expect(rowAt(ROWS, "c", { to: "first" })).toBe("a");
    expect(rowAt(ROWS, "c", { to: "last" })).toBe("e");
    expect(rowAt(ROWS, null, { to: "last" })).toBe("e");
  });

  it("clamps a page step to the end of the list instead of overshooting", () => {
    expect(rowAt(ROWS, "d", { by: 10 })).toBe("e");
    expect(rowAt(ROWS, "b", { by: -10 })).toBe("a");
  });

  it("stays put at the very edge rather than doing nothing surprising", () => {
    expect(rowAt(ROWS, "e", { by: 1 })).toBe("e");
    expect(rowAt(ROWS, "a", { by: -1 })).toBe("a");
  });

  it("starts at the near end when nothing is focused yet", () => {
    expect(rowAt(ROWS, null, { by: 1 })).toBe("a");
    expect(rowAt(ROWS, null, { by: -1 })).toBe("e");
    expect(rowAt(ROWS, "gone", { by: 1 })).toBe("a");
  });

  it("has nowhere to go in an empty list", () => {
    expect(rowAt([], "a", { by: 1 })).toBeNull();
    expect(rowAt([], null, { to: "first" })).toBeNull();
  });
});

describe("growing and shrinking a range", () => {
  // Shift+↓ ×2 then Shift+↑ ×3 must pass back through the starting row
  it("shrinks back onto the anchor and then flips to the other side", () => {
    const anchor = "c";
    let focus = "c";
    focus = rowAt(ROWS, focus, { by: 1 }) as string;
    expect(rangeBetween(ROWS, anchor, focus)).toEqual(["c", "d"]);
    focus = rowAt(ROWS, focus, { by: 1 }) as string;
    expect(rangeBetween(ROWS, anchor, focus)).toEqual(["c", "d", "e"]);
    focus = rowAt(ROWS, focus, { by: -1 }) as string;
    expect(rangeBetween(ROWS, anchor, focus)).toEqual(["c", "d"]);
    focus = rowAt(ROWS, focus, { by: -1 }) as string;
    expect(rangeBetween(ROWS, anchor, focus)).toEqual(["c"]);
    focus = rowAt(ROWS, focus, { by: -1 }) as string;
    expect(rangeBetween(ROWS, anchor, focus)).toEqual(["b", "c"]);
  });

  // Shift+End then Shift+Home sweeps the whole list either way
  it("takes everything to an end of the list", () => {
    expect(rangeBetween(ROWS, "c", rowAt(ROWS, "c", { to: "last" }) as string))
      .toEqual(["c", "d", "e"]);
    expect(rangeBetween(ROWS, "c", rowAt(ROWS, "c", { to: "first" }) as string))
      .toEqual(["a", "b", "c"]);
  });
});
