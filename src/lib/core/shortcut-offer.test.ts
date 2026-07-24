import { describe, expect, it } from "vitest";
import { decideShortcutOffer, type LnkState, type ShortcutStatus } from "./shortcut-offer";

const EXE = "D:\\apps\\myTODO\\myTODO.exe";

function lnk(partial: Partial<LnkState>): LnkState {
  return { exists: false, target: null, targetExists: false, pointsHere: false, ...partial };
}

function status(desktop: LnkState, startMenu: LnkState): ShortcutStatus {
  return { desktop, startMenu, exePath: EXE };
}

describe("decideShortcutOffer", () => {
  it("offers to create both when no shortcut exists anywhere", () => {
    expect(decideShortcutOffer(status(lnk({}), lnk({})), false)).toEqual({
      kind: "create",
      desktop: true,
      startMenu: true,
    });
  });

  it("stays quiet when a healthy shortcut points at this exe", () => {
    const here = lnk({ exists: true, target: EXE, targetExists: true, pointsHere: true });
    expect(decideShortcutOffer(status(here, lnk({})), false)).toBeNull();
  });

  it("stays quiet when a healthy shortcut points at ANOTHER live install", () => {
    const other = lnk({
      exists: true,
      target: "C:\\Program Files\\myTODO\\mytodo.exe",
      targetExists: true,
      pointsHere: false,
    });
    expect(decideShortcutOffer(status(lnk({}), other), false)).toBeNull();
  });

  it("offers to repair the stale spots when the target is gone (folder moved)", () => {
    const stale = lnk({ exists: true, target: "E:\\old\\myTODO.exe", targetExists: false });
    expect(decideShortcutOffer(status(stale, lnk({})), false)).toEqual({
      kind: "repair",
      desktop: true,
      startMenu: false,
    });
  });

  it("one healthy shortcut silences a stale one elsewhere", () => {
    const healthy = lnk({ exists: true, target: EXE, targetExists: true, pointsHere: true });
    const stale = lnk({ exists: true, target: "E:\\old\\myTODO.exe", targetExists: false });
    expect(decideShortcutOffer(status(stale, healthy), false)).toBeNull();
  });

  it("dont-ask-again wins over everything", () => {
    expect(decideShortcutOffer(status(lnk({}), lnk({})), true)).toBeNull();
  });
});
