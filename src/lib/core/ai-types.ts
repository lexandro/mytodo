// AI Workspace Integration domain types (aiprompt.md §3/§15–17/§20/§23/§25;
// design AI_INTEGRATION.md). Pure types + tiny pure helpers only — no Tauri,
// Svelte or DOM imports. Mirrored by src-tauri/src/db/ai_runs.rs for the
// persisted run row (camelCase over IPC).

import type { TodoStatus } from "./types";

export type AIProviderId = "claude" | "codex";

export const PROVIDER_IDS: readonly AIProviderId[] = ["claude", "codex"];

export function isProviderId(value: unknown): value is AIProviderId {
  return PROVIDER_IDS.includes(value as AIProviderId);
}

export const PROVIDER_LABELS: Record<AIProviderId, string> = {
  claude: "Claude Code",
  codex: "Codex",
};

// ── linked workspace ─────────────────────────────────────────────────────────

export type WorkspaceType = "git" | "generic";

/** A list's optional linked directory (max one per list — V1). */
export interface WorkspaceLink {
  path: string;
  type: WorkspaceType;
  /** Plain-text AI Brief added to every run's context ("" = none). */
  brief: string;
  /** null = use the global default client. */
  preferredProvider: AIProviderId | null;
}

// ── actions and modes ────────────────────────────────────────────────────────

export type AIAction =
  | "investigate"
  | "breakIntoSubtasks"
  | "planImplementation"
  | "implement"
  | "verify"
  | "analyzeWorkspace"
  | "suggestTodos"
  | "reconcile"
  | "askWorkspace";

/** Semantic permission mode; Execute may modify the LINKED WORKSPACE only. */
export type AIMode = "analyze" | "plan" | "execute";

export const TODO_ACTIONS: readonly AIAction[] = [
  "investigate",
  "breakIntoSubtasks",
  "planImplementation",
  "implement",
  "verify",
];

export const WORKSPACE_ACTIONS: readonly AIAction[] = [
  "analyzeWorkspace",
  "suggestTodos",
  "reconcile",
  "askWorkspace",
];

export const ACTION_MODES: Record<AIAction, AIMode> = {
  investigate: "analyze",
  breakIntoSubtasks: "plan",
  planImplementation: "plan",
  implement: "execute",
  verify: "analyze",
  analyzeWorkspace: "analyze",
  suggestTodos: "analyze",
  reconcile: "analyze",
  askWorkspace: "analyze",
};

export const ACTION_LABELS: Record<AIAction, string> = {
  investigate: "Investigate",
  breakIntoSubtasks: "Break into Subtasks",
  planImplementation: "Plan Implementation",
  implement: "Implement",
  verify: "Verify",
  analyzeWorkspace: "Analyze Workspace",
  suggestTodos: "Suggest Todos",
  reconcile: "Reconcile Todos ↔ Workspace",
  askWorkspace: "Ask Workspace…",
};

export function isTodoAction(action: AIAction): boolean {
  return TODO_ACTIONS.includes(action);
}

// ── proposals (the mandatory boundary, aiprompt §25–26) ──────────────────────

/**
 * Strongly-typed proposed todo mutations. The AI can never emit SQL or
 * arbitrary commands — only these, validated like manual edits before apply.
 */
export type ProposalAction =
  | { kind: "createTodo"; listId: string; groupId: string | null; title: string; description: string }
  | { kind: "updateTodo"; todoId: string; title: string | null; description: string | null }
  | { kind: "changeStatus"; todoId: string; status: TodoStatus }
  | { kind: "addSubtask"; todoId: string; text: string }
  | { kind: "updateSubtask"; subtaskId: string; text: string | null; checked: boolean | null }
  | { kind: "moveTodo"; todoId: string; listId: string; groupId: string | null }
  | { kind: "archiveTodo"; todoId: string };

export type ProposalKind = ProposalAction["kind"];

/** One reviewable proposal row; `applied` persists so reopened runs show it. */
export interface AIProposal {
  id: string;
  /** Human label shown in the review row. */
  label: string;
  /** AI-recommended → pre-checked in the review UI. */
  recommended: boolean;
  applied: boolean;
  action: ProposalAction;
}

// ── run results (design AIResult blocks) ─────────────────────────────────────

export type AIVerdictValue = "complete" | "partial" | "incomplete" | "uncertain";

export interface AICheck {
  ok: boolean;
  text: string;
}

/** Reconcile mapping row: todo title + tone-colored verdict word. */
export interface AIMappingRow {
  text: string;
  tone: "done" | "missing" | "partial" | "new";
}

/** Only the blocks the action produced are present (design: AIResult). */
export interface AIRunResult {
  summary: string | null;
  findings: string[];
  checks: AICheck[];
  mapping: AIMappingRow[];
  verdict: { value: AIVerdictValue; why: string } | null;
  /** Verify's recommendation; applying fires the referenced proposal. */
  recommendation: { text: string; proposalId: string | null } | null;
  question: string | null;
  answer: string | null;
  proposals: AIProposal[];
}

export function emptyRunResult(): AIRunResult {
  return {
    summary: null,
    findings: [],
    checks: [],
    mapping: [],
    verdict: null,
    recommendation: null,
    question: null,
    answer: null,
    proposals: [],
  };
}

// ── AI run (aiprompt §20) ────────────────────────────────────────────────────

export type AIRunStatus = "running" | "completed" | "failed" | "cancelled";

export interface AIRun {
  id: string;
  listId: string;
  /** null = workspace-level run. */
  todoId: string | null;
  provider: AIProviderId;
  action: AIAction;
  mode: AIMode;
  status: AIRunStatus;
  startedAt: number;
  finishedAt: number | null;
  /** Provider session/thread id when one was reported (aiprompt §35). */
  sessionId: string | null;
  /** Human progress lines, capped at MAX_RUN_LOG_LINES. */
  log: string[];
  result: AIRunResult | null;
  error: string | null;
}

/** Cap for persisted progress lines per run (aiprompt §21 — no raw dumps). */
export const MAX_RUN_LOG_LINES = 200;
/** Newest terminal-status runs kept per list; running rows are never pruned. */
export const MAX_RUNS_PER_LIST = 50;
