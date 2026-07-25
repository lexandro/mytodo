import { describe, expect, it } from "vitest";
import {
  ACTION_MODES, TODO_ACTIONS, WORKSPACE_ACTIONS, emptyRunResult, isTodoAction,
  runMode,
} from "./ai-types";

describe("action → mode mapping", () => {
  it("covers every action exactly once: the preset lists plus chat", () => {
    const presets = [...TODO_ACTIONS, ...WORKSPACE_ACTIONS];
    expect(new Set(presets).size).toBe(presets.length);
    expect(presets).not.toContain("chat"); // chat is the composer, not a card
    expect([...presets, "chat"].sort()).toEqual(Object.keys(ACTION_MODES).sort());
  });

  it("Implement is the ONLY execute-mode preset action (aiprompt §15–16)", () => {
    const executeActions = Object.entries(ACTION_MODES)
      .filter(([, mode]) => mode === "execute")
      .map(([action]) => action);
    expect(executeActions).toEqual(["implement"]);
  });

  it("chat defaults to read-only and only executes when explicitly chosen", () => {
    expect(runMode("chat", null)).toBe("analyze");
    expect(runMode("chat", "analyze")).toBe("analyze");
    expect(runMode("chat", "plan")).toBe("analyze"); // plan is not a chat mode
    expect(runMode("chat", "execute")).toBe("execute");
  });

  it("preset actions ignore a stored mode — the action stays authoritative", () => {
    expect(runMode("investigate", "execute")).toBe("analyze");
    expect(runMode("implement", "analyze")).toBe("execute");
  });

  it("read-only defaults: Investigate/Verify analyze, planning actions plan", () => {
    expect(ACTION_MODES.investigate).toBe("analyze");
    expect(ACTION_MODES.verify).toBe("analyze");
    expect(ACTION_MODES.breakIntoSubtasks).toBe("plan");
    expect(ACTION_MODES.planImplementation).toBe("plan");
    expect(ACTION_MODES.askWorkspace).toBe("analyze");
  });

  it("isTodoAction separates todo scope from workspace scope", () => {
    expect(isTodoAction("investigate")).toBe(true);
    expect(isTodoAction("analyzeWorkspace")).toBe(false);
  });
});

describe("emptyRunResult", () => {
  it("returns independent instances with empty blocks", () => {
    const a = emptyRunResult();
    const b = emptyRunResult();
    a.findings.push("x");
    expect(b.findings).toEqual([]);
    expect(b.summary).toBeNull();
    expect(b.proposals).toEqual([]);
  });
});
