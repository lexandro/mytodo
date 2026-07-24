// AIRun ↔ persisted row conversion. The Rust side (db/ai_runs.rs) stores
// log/result as opaque JSON strings — all parsing and validation lives here
// so a corrupted row degrades to a readable failed run instead of crashing
// the app (aiprompt §24/§42).

import {
  ACTION_MODES, MAX_RUN_LOG_LINES, emptyRunResult, isProviderId,
  type AIAction, type AIMode, type AIRun, type AIRunResult,
  type AIRunStatus, type AICheck, type AIMappingRow, type AIVerdictValue,
} from "./ai-types";
import { parseProposals } from "./ai-proposals";

/** Wire format of one ai_runs row (mirrors src-tauri/src/db/ai_runs.rs). */
export interface AIRunRow {
  id: string;
  listId: string;
  todoId: string | null;
  provider: string;
  action: string;
  mode: string;
  status: string;
  startedAt: number;
  finishedAt: number | null;
  sessionId: string | null;
  /** JSON array of progress lines. */
  log: string;
  /** JSON AIRunResult, or null while running. */
  result: string | null;
  error: string | null;
}

const STATUSES: readonly string[] = ["running", "completed", "failed", "cancelled"];
const VERDICTS: readonly string[] = ["complete", "partial", "incomplete", "uncertain"];
const MAPPING_TONES: readonly string[] = ["done", "missing", "partial", "new"];

export function capLog(log: readonly string[]): string[] {
  return log.length <= MAX_RUN_LOG_LINES ? [...log] : log.slice(log.length - MAX_RUN_LOG_LINES);
}

export function runToRow(run: AIRun): AIRunRow {
  return {
    id: run.id,
    listId: run.listId,
    todoId: run.todoId,
    provider: run.provider,
    action: run.action,
    mode: run.mode,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    sessionId: run.sessionId,
    log: JSON.stringify(capLog(run.log)),
    result: run.result === null ? null : JSON.stringify(run.result),
    error: run.error,
  };
}

function parseJson(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseLog(raw: string): string[] {
  const value = parseJson(raw);
  if (!Array.isArray(value)) return [];
  return capLog(value.filter((line): line is string => typeof line === "string"));
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

function parseChecks(raw: unknown): AICheck[] {
  if (!Array.isArray(raw)) return [];
  const checks: AICheck[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const v = item as Record<string, unknown>;
    if (typeof v.ok === "boolean" && typeof v.text === "string") checks.push({ ok: v.ok, text: v.text });
  }
  return checks;
}

function parseMapping(raw: unknown): AIMappingRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: AIMappingRow[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const v = item as Record<string, unknown>;
    if (typeof v.text === "string" && MAPPING_TONES.includes(v.tone as string)) {
      rows.push({ text: v.text, tone: v.tone as AIMappingRow["tone"] });
    }
  }
  return rows;
}

/** Lenient block-by-block parse; anything malformed degrades to empty. */
export function parseRunResult(raw: unknown): AIRunResult {
  const result = emptyRunResult();
  if (typeof raw !== "object" || raw === null) return result;
  const v = raw as Record<string, unknown>;
  if (typeof v.summary === "string") result.summary = v.summary;
  result.findings = parseStringArray(v.findings);
  result.checks = parseChecks(v.checks);
  result.mapping = parseMapping(v.mapping);
  const verdict = v.verdict as Record<string, unknown> | null | undefined;
  if (
    typeof verdict === "object" && verdict !== null &&
    VERDICTS.includes(verdict.value as string) && typeof verdict.why === "string"
  ) {
    result.verdict = { value: verdict.value as AIVerdictValue, why: verdict.why };
  }
  const rec = v.recommendation as Record<string, unknown> | null | undefined;
  if (typeof rec === "object" && rec !== null && typeof rec.text === "string") {
    result.recommendation = {
      text: rec.text,
      proposalId: typeof rec.proposalId === "string" ? rec.proposalId : null,
    };
  }
  if (typeof v.question === "string") result.question = v.question;
  if (typeof v.answer === "string") result.answer = v.answer;
  result.proposals = parseProposals(v.proposals);
  return result;
}

/**
 * Row → domain run. Rows with unknown enum values (written by a NEWER app
 * version) are skipped by returning null — never rendered as garbage.
 * A row still marked running was interrupted (app killed mid-run): it is
 * surfaced as failed so history stays truthful.
 */
export function rowToRun(row: AIRunRow): AIRun | null {
  if (!isProviderId(row.provider) || !STATUSES.includes(row.status)) return null;
  if (!(row.action in ACTION_MODES)) return null;
  const action = row.action as AIAction;
  const expectedMode: AIMode = ACTION_MODES[action];
  const interrupted = row.status === "running";
  return {
    id: row.id,
    listId: row.listId,
    todoId: row.todoId,
    provider: row.provider,
    action,
    // the mode column is informational; the action is authoritative
    mode: expectedMode,
    status: interrupted ? "failed" : (row.status as AIRunStatus),
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    sessionId: row.sessionId,
    log: parseLog(row.log),
    result: row.result === null ? null : parseRunResult(parseJson(row.result)),
    error: interrupted ? "Interrupted — the app closed while this run was in progress." : row.error,
  };
}

export function rowsToRuns(rows: readonly AIRunRow[]): AIRun[] {
  return rows.map(rowToRun).filter((run): run is AIRun => run !== null);
}

/**
 * Concurrency guard (decision #11): ONE run per workspace directory at a
 * time, regardless of mode. Two lists linked to the same directory share
 * the guard — the workspace, not the list, is the unit.
 */
export function hasActiveRunForWorkspace(
  runs: readonly AIRun[],
  workspacePathByList: Readonly<Record<string, string>>,
  workspacePath: string,
): boolean {
  const normalized = workspacePath.toLowerCase();
  return runs.some(
    (run) =>
      run.status === "running" &&
      (workspacePathByList[run.listId] ?? "").toLowerCase() === normalized,
  );
}
