import { describe, expect, it } from "vitest";
import {
  isDetailToggleClick,
  RECLICK_UNDO_MS,
  undoneToggle,
  type ReclickContext,
} from "./reclick";

/** A plain click on the row that is already the single selection of its pane. */
function reclick(over: Partial<ReclickContext> = {}): ReclickContext {
  return {
    todoId: "t1",
    paneIndex: 0,
    ctrl: false,
    shift: false,
    clickCount: 1,
    editing: false,
    selectedId: "t1",
    multiSelected: false,
    activePane: 0,
    ...over,
  };
}

describe("isDetailToggleClick", () => {
  it("takes a plain click on the already selected row", () => {
    expect(isDetailToggleClick(reclick())).toBe(true);
  });

  it("ignores a click that selects a different row", () => {
    expect(isDetailToggleClick(reclick({ selectedId: "t2" }))).toBe(false);
    expect(isDetailToggleClick(reclick({ selectedId: null }))).toBe(false);
  });

  it("ignores the modifier clicks — they change the selection", () => {
    expect(isDetailToggleClick(reclick({ ctrl: true }))).toBe(false);
    expect(isDetailToggleClick(reclick({ shift: true }))).toBe(false);
  });

  it("ignores the second click of a double click", () => {
    expect(isDetailToggleClick(reclick({ clickCount: 2 }))).toBe(false);
    expect(isDetailToggleClick(reclick({ clickCount: 3 }))).toBe(false);
  });

  it("ignores a click while several rows are selected", () => {
    // that click collapses the selection onto this row — a real change
    expect(isDetailToggleClick(reclick({ multiSelected: true }))).toBe(false);
  });

  it("ignores a click in another pane, even on the selected todo", () => {
    // the same todo can be on screen twice; that click switches panes
    expect(isDetailToggleClick(reclick({ paneIndex: 1 }))).toBe(false);
  });

  it("ignores a click inside the inline rename input", () => {
    expect(isDetailToggleClick(reclick({ editing: true }))).toBe(false);
  });
});

describe("undoneToggle", () => {
  it("has nothing to take back without a fired toggle", () => {
    expect(undoneToggle(null, 1_000)).toBe(null);
  });

  it("restores what the panel was before a just-fired toggle", () => {
    expect(undoneToggle({ firedAt: 1_000, openBefore: false }, 1_100)).toBe(false);
    expect(undoneToggle({ firedAt: 1_000, openBefore: true }, 1_100)).toBe(true);
  });

  it("keeps the toggle once the undo window has passed", () => {
    const fired = { firedAt: 1_000, openBefore: false };
    expect(undoneToggle(fired, 1_000 + RECLICK_UNDO_MS)).toBe(false);
    expect(undoneToggle(fired, 1_000 + RECLICK_UNDO_MS + 1)).toBe(null);
  });
});
