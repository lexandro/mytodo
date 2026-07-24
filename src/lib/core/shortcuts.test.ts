import { describe, expect, it } from "vitest";
import {
  acceleratorFromEvent, conflictingAction, defaultShortcutConfig,
  toTauriAccelerator, validateAccelerator,
} from "./shortcuts";

describe("defaultShortcutConfig", () => {
  it("matches shortcut.md defaults", () => {
    const config = defaultShortcutConfig();
    expect(config.bindings.summon).toEqual({ accelerator: "Ctrl+Alt+T", enabled: true });
    expect(config.bindings.quickAdd).toEqual({ accelerator: "Ctrl+Shift+Space", enabled: true });
    expect(config.bindings.pinned).toEqual({ accelerator: null, enabled: false });
    expect(config.bindings.search).toEqual({ accelerator: null, enabled: false });
    expect(config.summonBehavior).toBe("toggle");
  });
});

describe("validateAccelerator", () => {
  it("rejects a bare key (would block normal typing)", () => {
    expect(validateAccelerator("T").ok).toBe(false);
    expect(validateAccelerator("Shift+T").ok).toBe(false);
  });

  it("accepts proper modifier combos", () => {
    expect(validateAccelerator("Ctrl+Alt+T").ok).toBe(true);
    expect(validateAccelerator("Ctrl+Shift+Space").ok).toBe(true);
    expect(validateAccelerator("Alt+F9").ok).toBe(true);
  });

  it("rejects reserved system combinations", () => {
    expect(validateAccelerator("Ctrl+Alt+Delete").ok).toBe(false);
    expect(validateAccelerator("Alt+Tab").ok).toBe(false);
    expect(validateAccelerator("Super+L").ok).toBe(false);
  });

  it("rejects multiple non-modifier keys and empty input", () => {
    expect(validateAccelerator("Ctrl+A+B").ok).toBe(false);
    expect(validateAccelerator("").ok).toBe(false);
  });

  it("warns about AltGr collisions (Ctrl+Alt on Hungarian layouts)", () => {
    const result = validateAccelerator("Ctrl+Alt+F");
    expect(result.ok).toBe(true);
    expect(result.warning).toContain("AltGr");
    expect(validateAccelerator("Ctrl+Shift+F").warning).toBeNull();
  });
});

describe("conflictingAction", () => {
  it("detects the same accelerator on another action", () => {
    const config = defaultShortcutConfig();
    expect(conflictingAction(config, "pinned", "Ctrl+Alt+T")).toBe("summon");
    expect(conflictingAction(config, "summon", "Ctrl+Alt+T")).toBeNull();
    expect(conflictingAction(config, "pinned", "Ctrl+Alt+P")).toBeNull();
  });
});

describe("acceleratorFromEvent (recorder)", () => {
  const base = { ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, code: "" };

  it("returns null while only modifiers are held", () => {
    expect(acceleratorFromEvent({ ...base, key: "Control", ctrlKey: true })).toBeNull();
    expect(acceleratorFromEvent({ ...base, key: "Shift", shiftKey: true })).toBeNull();
  });

  it("builds the accelerator from a full chord", () => {
    expect(
      acceleratorFromEvent({ ...base, key: "w", ctrlKey: true, altKey: true, code: "KeyW" }),
    ).toBe("Ctrl+Alt+W");
    expect(
      acceleratorFromEvent({ ...base, key: " ", ctrlKey: true, shiftKey: true, code: "Space" }),
    ).toBe("Ctrl+Shift+Space");
  });
});

describe("toTauriAccelerator", () => {
  it("maps Ctrl to Control, keeps the rest", () => {
    expect(toTauriAccelerator("Ctrl+Alt+T")).toBe("Control+Alt+T");
    expect(toTauriAccelerator("Super+F9")).toBe("Super+F9");
  });
});
