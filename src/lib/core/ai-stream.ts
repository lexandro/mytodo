// Provider stream parsing: raw stdout lines → human progress lines, final
// result text and session ids. This is the ONLY place that knows Claude's
// stream-json / Codex's JSONL shapes — the domain and UI never see them
// (aiprompt §6, §22, §24). Unknown event types are ignored, never fatal.

import type { AIProviderId } from "./ai-types";

/** What one parsed stdout line contributes to the run. */
export interface StreamUpdate {
  /** Compact human progress line ("Reading session.ts…"); null = nothing to show. */
  progress: string | null;
  /** Final result text, present on the terminal event. */
  resultText: string | null;
  /** Provider session/thread id when announced (aiprompt §35). */
  sessionId: string | null;
  /** Provider-reported fatal error text. */
  error: string | null;
}

const EMPTY: StreamUpdate = { progress: null, resultText: null, sessionId: null, error: null };

function update(patch: Partial<StreamUpdate>): StreamUpdate {
  return { ...EMPTY, ...patch };
}

function baseName(path: string): string {
  const parts = path.split(/[\\/]+/).filter((p) => p !== "");
  return parts.length === 0 ? path : parts[parts.length - 1];
}

function truncate(text: string, max: number): string {
  const single = text.replace(/\s+/g, " ").trim();
  return single.length <= max ? single : `${single.slice(0, max - 1)}…`;
}

export function parseStreamLine(provider: AIProviderId, line: string): StreamUpdate {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return EMPTY; // non-JSON noise (npm shim banners etc.) is not an error
  }
  if (typeof parsed !== "object" || parsed === null) return EMPTY;
  const event = parsed as Record<string, unknown>;
  return provider === "claude" ? parseClaudeEvent(event) : parseCodexEvent(event);
}

// ── Claude Code stream-json ──────────────────────────────────────────────────

/** tool_use name+input → design-style progress phrase. */
function claudeToolProgress(name: string, input: Record<string, unknown>): string {
  const filePath = typeof input.file_path === "string" ? baseName(input.file_path) : null;
  switch (name) {
    case "Read":
      return filePath === null ? "Reading files…" : `Reading ${filePath}…`;
    case "Edit":
    case "Write":
    case "NotebookEdit":
      return filePath === null ? "Editing files…" : `Editing ${filePath}…`;
    case "Grep":
    case "Glob":
      return typeof input.pattern === "string"
        ? `Searching for ${truncate(input.pattern, 32)}…`
        : "Searching the workspace…";
    case "Bash":
      return typeof input.command === "string"
        ? `Running ${truncate(input.command, 40)}…`
        : "Running a command…";
    case "Task":
      return "Delegating a subtask…";
    case "TodoWrite":
      return "Planning…";
    default:
      return `${name}…`;
  }
}

function parseClaudeEvent(event: Record<string, unknown>): StreamUpdate {
  switch (event.type) {
    case "system": {
      const sessionId = typeof event.session_id === "string" ? event.session_id : null;
      return update({
        sessionId,
        progress: event.subtype === "init" ? "Starting Claude Code…" : null,
      });
    }
    case "assistant": {
      const message = event.message as Record<string, unknown> | undefined;
      const content = Array.isArray(message?.content) ? message.content : [];
      for (const block of content as Record<string, unknown>[]) {
        if (block.type === "tool_use" && typeof block.name === "string") {
          return update({
            progress: claudeToolProgress(block.name, (block.input ?? {}) as Record<string, unknown>),
          });
        }
      }
      return EMPTY; // pure text chunks are not progress
    }
    case "result": {
      const sessionId = typeof event.session_id === "string" ? event.session_id : null;
      if (event.is_error === true || event.subtype !== "success") {
        const text = typeof event.result === "string" ? event.result : "The run ended with an error.";
        return update({ error: text, sessionId });
      }
      return update({
        resultText: typeof event.result === "string" ? event.result : "",
        sessionId,
      });
    }
    default:
      return EMPTY; // user/tool-result/unknown events carry no UI progress
  }
}

// ── Codex exec --json (JSONL) ────────────────────────────────────────────────

function codexItemProgress(item: Record<string, unknown>): string | null {
  const itemType = typeof item.item_type === "string" ? item.item_type : item.type;
  switch (itemType) {
    case "command_execution":
      return typeof item.command === "string"
        ? `Running ${truncate(item.command, 40)}…`
        : "Running a command…";
    case "file_change":
    case "patch_apply":
      return "Editing files…";
    case "web_search":
      return "Searching the web…";
    case "reasoning":
    case "agent_message":
      return null; // reasoning/noise; the final message arrives separately
    default:
      return null;
  }
}

function parseCodexEvent(event: Record<string, unknown>): StreamUpdate {
  const type = typeof event.type === "string" ? event.type : "";
  if (type === "thread.started") {
    return update({
      sessionId: typeof event.thread_id === "string" ? event.thread_id : null,
      progress: "Starting Codex…",
    });
  }
  if (type === "item.started" || type === "item.completed" || type === "item.updated") {
    const item = (event.item ?? {}) as Record<string, unknown>;
    const itemType = typeof item.item_type === "string" ? item.item_type : item.type;
    if (type === "item.completed" && itemType === "agent_message" && typeof item.text === "string") {
      return update({ resultText: item.text });
    }
    return update({ progress: type === "item.started" ? codexItemProgress(item) : null });
  }
  if (type === "turn.failed" || type === "error") {
    const message =
      typeof event.message === "string"
        ? event.message
        : typeof (event.error as Record<string, unknown> | undefined)?.message === "string"
          ? ((event.error as Record<string, unknown>).message as string)
          : "The run ended with an error.";
    // Only turn.failed is terminal. Bare `error` events are also emitted for
    // recoverable trouble ("Reconnecting... 2/5") — treating those as fatal
    // would fail a run that then finishes fine, so they become progress and
    // the real outcome is decided by turn.failed / the exit code.
    if (type === "error") return update({ progress: truncate(message, 60) });
    return update({ error: message });
  }
  return EMPTY;
}
