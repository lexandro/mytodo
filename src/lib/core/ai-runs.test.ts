import { describe, expect, it } from "vitest";
import { MAX_RUN_LOG_LINES, emptyRunResult, type AIRun } from "./ai-types";
import { capLog, parseRunResult, rowToRun, rowsToRuns, runToRow } from "./ai-runs";

function sampleRun(overrides: Partial<AIRun> = {}): AIRun {
  return {
    id: "r1",
    listId: "l1",
    todoId: "t1",
    provider: "claude",
    action: "investigate",
    mode: "analyze",
    status: "completed",
    startedAt: 1000,
    finishedAt: 2000,
    sessionId: "sess-1",
    log: ["Reading workspace (git repository)…", "Analyzing implementation…"],
    result: {
      ...emptyRunResult(),
      summary: "The timeout comes from a stale session cache.",
      findings: ["session.ts ignores the refresh token"],
      proposals: [{
        id: "p1",
        label: 'Add subtask "Invalidate cache"',
        recommended: true,
        applied: false,
        action: { kind: "addSubtask", todoId: "t1", text: "Invalidate cache" },
      }],
    },
    error: null,
    ...overrides,
  };
}

describe("runToRow / rowToRun roundtrip", () => {
  it("preserves a completed run with result and proposals", () => {
    const run = sampleRun();
    const back = rowToRun(runToRow(run));
    expect(back).toEqual(run);
  });

  it("preserves a failed run with error and no result", () => {
    const run = sampleRun({ status: "failed", result: null, error: "Codex was not found." });
    expect(rowToRun(runToRow(run))).toEqual(run);
  });
});

describe("rowToRun robustness", () => {
  const row = runToRow(sampleRun());

  it("skips rows with unknown provider/action/status (newer app version)", () => {
    expect(rowToRun({ ...row, provider: "gemini" })).toBeNull();
    expect(rowToRun({ ...row, action: "refactorEverything" })).toBeNull();
    expect(rowToRun({ ...row, status: "queued" })).toBeNull();
    expect(rowsToRuns([row, { ...row, provider: "gemini" }])).toHaveLength(1);
  });

  it("surfaces an interrupted (still-running) row as failed", () => {
    const run = rowToRun({ ...row, status: "running", finishedAt: null, result: null, error: null });
    expect(run?.status).toBe("failed");
    expect(run?.error).toContain("Interrupted");
  });

  it("tolerates corrupted log/result JSON", () => {
    const run = rowToRun({ ...row, log: "{not json", result: "also broken" });
    expect(run?.log).toEqual([]);
    expect(run?.result).toEqual(emptyRunResult());
  });

  it("derives the mode from the action, not the stored column", () => {
    const run = rowToRun({ ...row, mode: "execute" });
    expect(run?.mode).toBe("analyze"); // investigate is always read-only
  });
});

describe("parseRunResult", () => {
  it("keeps valid blocks and drops malformed ones", () => {
    const result = parseRunResult({
      summary: "ok",
      findings: ["a", 42, "b"],
      checks: [{ ok: true, text: "tests pass" }, { ok: "yes", text: "x" }],
      mapping: [{ text: "Auth timeout", tone: "done" }, { text: "x", tone: "purple" }],
      verdict: { value: "partial", why: "tests missing" },
      recommendation: { text: "Mark as In Progress", proposalId: "p1" },
      question: "Where is auth handled?",
      answer: "In session.ts",
      proposals: "not-an-array",
    });
    expect(result.findings).toEqual(["a", "b"]);
    expect(result.checks).toEqual([{ ok: true, text: "tests pass" }]);
    expect(result.mapping).toEqual([{ text: "Auth timeout", tone: "done" }]);
    expect(result.verdict).toEqual({ value: "partial", why: "tests missing" });
    expect(result.recommendation).toEqual({ text: "Mark as In Progress", proposalId: "p1" });
    expect(result.proposals).toEqual([]);
  });

  it("returns an empty result for garbage", () => {
    expect(parseRunResult("boom")).toEqual(emptyRunResult());
    expect(parseRunResult(null)).toEqual(emptyRunResult());
  });
});

describe("capLog", () => {
  it("keeps the NEWEST lines when over the cap", () => {
    const long = Array.from({ length: MAX_RUN_LOG_LINES + 10 }, (_, i) => `line ${i}`);
    const capped = capLog(long);
    expect(capped).toHaveLength(MAX_RUN_LOG_LINES);
    expect(capped[capped.length - 1]).toBe(`line ${MAX_RUN_LOG_LINES + 9}`);
    expect(capped[0]).toBe("line 10");
  });
});
