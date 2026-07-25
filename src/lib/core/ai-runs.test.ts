import { describe, expect, it } from "vitest";
import { MAX_RUN_LOG_LINES, emptyRunResult, type AIRun } from "./ai-types";
import {
  capLog, conversationRuns, conversationSummaries, hasActiveRunForWorkspace,
  parseRunResult, resumeSessionId, rowToRun, rowsToRuns, runToRow,
} from "./ai-runs";

function sampleRun(overrides: Partial<AIRun> = {}): AIRun {
  return {
    id: "r1",
    listId: "l1",
    todoId: "t1",
    conversationId: "c1",
    userMessage: null,
    provider: "claude",
    model: null,
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

  it("keeps the stored mode for chat turns — there the user picks it", () => {
    expect(rowToRun({ ...row, action: "chat", mode: "execute" })?.mode).toBe("execute");
    expect(rowToRun({ ...row, action: "chat", mode: "analyze" })?.mode).toBe("analyze");
    expect(rowToRun({ ...row, action: "chat", mode: "nonsense" })?.mode).toBe("analyze");
  });

  it("drops an invalid model name instead of passing it on", () => {
    expect(rowToRun({ ...row, model: "sonnet" })?.model).toBe("sonnet");
    expect(rowToRun({ ...row, model: "--dangerously-skip-permissions" })?.model).toBeNull();
  });

  it("treats a pre-conversation row as a thread of its own", () => {
    const run = rowToRun({ ...row, conversationId: "" });
    expect(run?.conversationId).toBe(row.id);
  });
});

describe("conversations", () => {
  const turns = [
    // newest turn is still starting up and has not reported a session yet
    sampleRun({ id: "r3", conversationId: "c1", startedAt: 3000, userMessage: "and the second one?", action: "chat", status: "running", sessionId: null }),
    sampleRun({ id: "r1", conversationId: "c1", startedAt: 1000, sessionId: "sess-a" }),
    sampleRun({ id: "r2", conversationId: "c1", startedAt: 2000, userMessage: "what is left?", action: "chat", sessionId: "sess-b" }),
    sampleRun({ id: "r9", conversationId: "c2", startedAt: 500, action: "analyzeWorkspace" }),
  ];

  it("orders a thread oldest turn first", () => {
    expect(conversationRuns(turns, "c1").map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
  });

  it("resumes the NEWEST session id the thread reported", () => {
    expect(resumeSessionId(turns, "c1")).toBe("sess-b");
  });

  it("has no session to resume for an unknown or session-less thread", () => {
    expect(resumeSessionId(turns, "nope")).toBeNull();
    expect(resumeSessionId([sampleRun({ conversationId: "c3", sessionId: null })], "c3")).toBeNull();
  });

  it("summarizes threads newest first, titled by the first turn", () => {
    const summaries = conversationSummaries(turns);
    expect(summaries.map((s) => s.conversationId)).toEqual(["c1", "c2"]);
    expect(summaries[0]).toMatchObject({
      title: "Investigate", // first turn was a preset action, not a message
      turns: 3,
      status: "running", // the newest turn's status drives the row
    });
    expect(summaries[1].title).toBe("Analyze Workspace");
  });

  it("titles a chat-started thread with what the user typed", () => {
    const chatOnly = [sampleRun({ conversationId: "c4", action: "chat", userMessage: "hi there" })];
    expect(conversationSummaries(chatOnly)[0].title).toBe("hi there");
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

describe("hasActiveRunForWorkspace — one run per workspace (decision #11)", () => {
  const paths = { l1: "C:\\Projects\\conference", l2: "c:\\projects\\CONFERENCE", l3: "D:\\other" };

  it("blocks a second run on the same directory, case-insensitively", () => {
    const runs = [sampleRun({ status: "running", listId: "l1" })];
    expect(hasActiveRunForWorkspace(runs, paths, "C:\\Projects\\conference")).toBe(true);
    // ANOTHER LIST linked to the same directory is also blocked
    expect(hasActiveRunForWorkspace(runs, paths, "c:\\projects\\CONFERENCE")).toBe(true);
  });

  it("a different workspace or a finished run does not block", () => {
    expect(hasActiveRunForWorkspace([sampleRun({ status: "running", listId: "l1" })], paths, "D:\\other")).toBe(false);
    expect(hasActiveRunForWorkspace([sampleRun({ status: "completed", listId: "l1" })], paths, paths.l1)).toBe(false);
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
