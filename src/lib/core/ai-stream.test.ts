import { describe, expect, it } from "vitest";
import { parseStreamLine } from "./ai-stream";

const claude = (event: unknown): ReturnType<typeof parseStreamLine> =>
  parseStreamLine("claude", JSON.stringify(event));
const codex = (event: unknown): ReturnType<typeof parseStreamLine> =>
  parseStreamLine("codex", JSON.stringify(event));

describe("claude stream-json", () => {
  it("init announces the session and a start line", () => {
    const u = claude({ type: "system", subtype: "init", session_id: "sess-42" });
    expect(u.sessionId).toBe("sess-42");
    expect(u.progress).toBe("Starting Claude Code…");
  });

  it("tool_use events become human progress phrases", () => {
    const read = claude({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Read", input: { file_path: "C:\\repo\\auth\\session.ts" } }] },
    });
    expect(read.progress).toBe("Reading session.ts…");
    const bash = claude({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Bash", input: { command: "bun run test" } }] },
    });
    expect(bash.progress).toBe("Running bun run test…");
    const unknownTool = claude({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "FancyNewTool", input: {} }] },
    });
    expect(unknownTool.progress).toBe("FancyNewTool…");
  });

  it("plain text chunks are not progress", () => {
    const u = claude({ type: "assistant", message: { content: [{ type: "text", text: "thinking" }] } });
    expect(u.progress).toBeNull();
  });

  it("result success carries the final text + session id", () => {
    const u = claude({ type: "result", subtype: "success", result: "All done.", session_id: "sess-42" });
    expect(u.resultText).toBe("All done.");
    expect(u.sessionId).toBe("sess-42");
    expect(u.error).toBeNull();
  });

  it("result error surfaces as error, not resultText", () => {
    const u = claude({ type: "result", subtype: "error_max_turns", is_error: true, result: "Too long" });
    expect(u.error).toBe("Too long");
    expect(u.resultText).toBeNull();
  });

  it("unknown event types and non-JSON lines are silently ignored (§24)", () => {
    expect(claude({ type: "telemetry_v9", data: [1, 2] })).toMatchObject({ progress: null, error: null });
    expect(parseStreamLine("claude", "npm warn config production")).toMatchObject({ progress: null });
  });
});

describe("codex JSONL", () => {
  it("thread.started announces the session", () => {
    const u = codex({ type: "thread.started", thread_id: "th-7" });
    expect(u.sessionId).toBe("th-7");
  });

  it("command execution items become progress", () => {
    const u = codex({ type: "item.started", item: { item_type: "command_execution", command: "git status" } });
    expect(u.progress).toBe("Running git status…");
  });

  it("agent_message completion carries the final text", () => {
    const u = codex({ type: "item.completed", item: { item_type: "agent_message", text: "Done." } });
    expect(u.resultText).toBe("Done.");
  });

  it("turn.failed / error events surface an error", () => {
    expect(codex({ type: "turn.failed", message: "sandbox denied" }).error).toBe("sandbox denied");
    expect(codex({ type: "error", error: { message: "boom" } }).error).toBe("boom");
  });

  it("unknown items/events are ignored", () => {
    expect(codex({ type: "item.completed", item: { item_type: "hologram" } })).toMatchObject({
      progress: null,
      resultText: null,
      error: null,
    });
    expect(codex({ type: "future.event" })).toMatchObject({ progress: null });
  });
});
