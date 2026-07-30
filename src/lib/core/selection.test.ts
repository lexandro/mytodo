import { describe, expect, it } from "vitest";
import { rangeBetween, stepFocus, toggleInSelection } from "./selection";

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

describe("stepFocus", () => {
  it("steps one row in either direction", () => {
    expect(stepFocus(ROWS, "c", 1)).toBe("d");
    expect(stepFocus(ROWS, "c", -1)).toBe("b");
  });

  it("stops at the ends instead of wrapping", () => {
    expect(stepFocus(ROWS, "e", 1)).toBeNull();
    expect(stepFocus(ROWS, "a", -1)).toBeNull();
  });

  it("lands on the nearest end when the focus is not on screen", () => {
    expect(stepFocus(ROWS, "gone", 1)).toBe("a");
    expect(stepFocus(ROWS, "gone", -1)).toBe("e");
  });

  it("has nowhere to go in an empty list", () => {
    expect(stepFocus([], "a", 1)).toBeNull();
  });
});

describe("growing and shrinking a range", () => {
  // Shift+↓ ×2 then Shift+↑ ×2 must land back on the row it started from
  it("shrinks back onto the anchor and then flips to the other side", () => {
    const anchor = "c";
    let focus = "c";
    focus = stepFocus(ROWS, focus, 1) as string;
    expect(rangeBetween(ROWS, anchor, focus)).toEqual(["c", "d"]);
    focus = stepFocus(ROWS, focus, 1) as string;
    expect(rangeBetween(ROWS, anchor, focus)).toEqual(["c", "d", "e"]);
    focus = stepFocus(ROWS, focus, -1) as string;
    expect(rangeBetween(ROWS, anchor, focus)).toEqual(["c", "d"]);
    focus = stepFocus(ROWS, focus, -1) as string;
    expect(rangeBetween(ROWS, anchor, focus)).toEqual(["c"]);
    focus = stepFocus(ROWS, focus, -1) as string;
    expect(rangeBetween(ROWS, anchor, focus)).toEqual(["b", "c"]);
  });
});
