import { describe, expect, it } from "vitest";
import {
  ACTION_MODES, TODO_ACTIONS, WORKSPACE_ACTIONS, emptyRunResult, isTodoAction,
} from "./ai-types";

describe("action → mode mapping", () => {
  it("covers every action exactly once across todo + workspace lists", () => {
    const all = [...TODO_ACTIONS, ...WORKSPACE_ACTIONS];
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(Object.keys(ACTION_MODES).sort());
  });

  it("Implement is the ONLY execute-mode action (aiprompt §15–16)", () => {
    const executeActions = Object.entries(ACTION_MODES)
      .filter(([, mode]) => mode === "execute")
      .map(([action]) => action);
    expect(executeActions).toEqual(["implement"]);
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
