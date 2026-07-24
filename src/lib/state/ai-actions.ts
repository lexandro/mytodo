// AI panel + menu actions: open/close transitions, run start from the
// panel, retry, and the narrow-window exclusivity rule between the detail
// panel and the AI panel (design DESIGN.md §AI run panel).

import { TODO_ACTIONS, isTodoAction, type AIAction } from "$lib/core/ai-types";
import { findTodo } from "$lib/core/todos-ops";
import { aiClients } from "./ai-clients.svelte";
import { aiConfig } from "./ai-config.svelte";
import { aiRuns } from "./ai-runs.svelte";
import { store } from "./store.svelte";
import { ui, type AiPanelState } from "./ui.svelte";

/** Below this effective width the detail and AI panels never show together. */
const NARROW_WIDTH = 1250;

function isNarrow(): boolean {
  return window.innerWidth / (ui.uiScale / 100) < NARROW_WIDTH;
}

function basePanel(listId: string, todoId: string | null, action: AIAction): AiPanelState {
  return { listId, todoId, action, question: "", runId: null, history: false, error: null };
}

/** Opens the panel in the ready phase for a todo- or workspace-level action. */
export function openAiPanel(listId: string, todoId: string | null, action?: AIAction): void {
  const resolved = action ?? (todoId !== null ? "investigate" : "analyzeWorkspace");
  ui.aiPanel = basePanel(listId, isTodoAction(resolved) ? todoId : null, resolved);
  ui.aiMenuOpen = false;
  if (isNarrow()) ui.detailOpen = false;
  if (aiConfig.linkFor(listId) !== undefined) void aiConfig.refreshMissing(listId);
}

/** Ctrl+Shift+A: panel for the selected todo, else the active pane's list. */
export function openAiPanelForSelection(): void {
  const selected = ui.selectedId !== null ? findTodo(store.data, ui.selectedId) : undefined;
  if (selected !== undefined && !selected.trashed) {
    openAiPanel(selected.listId, selected.id);
    return;
  }
  const listId = ui.activePaneState.listId;
  if (listId !== null) openAiPanel(listId, null);
}

export function openAiHistory(listId: string): void {
  ui.aiPanel = { ...basePanel(listId, null, "analyzeWorkspace"), history: true };
  ui.aiMenuOpen = false;
  if (isNarrow()) ui.detailOpen = false;
}

/** Reopens a run (history rows, AI tab) — result, failure or live view. */
export function openAiRun(runId: string): void {
  const run = aiRuns.runById(runId);
  if (run === undefined) return;
  ui.aiPanel = { ...basePanel(run.listId, run.todoId, run.action), runId };
  ui.aiMenuOpen = false;
  if (isNarrow()) ui.detailOpen = false;
}

export function closeAiPanel(): void {
  // a running run keeps going in the background — state owns it, not the UI
  ui.aiPanel = null;
}

/** The detail panel side of the narrow-window exclusivity rule. */
export function detailOpened(): void {
  if (isNarrow()) ui.aiPanel = null;
}

/** Run button: starts the panel's action; guard errors render in-panel. */
export async function runFromPanel(): Promise<void> {
  const panel = ui.aiPanel;
  if (panel === null) return;
  panel.error = null;
  const error = await aiRuns.startAction({
    listId: panel.listId,
    todoId: isTodoAction(panel.action) ? panel.todoId : null,
    action: panel.action,
    question: panel.action === "askWorkspace" ? panel.question : undefined,
  });
  if (ui.aiPanel !== panel) return; // panel was closed/replaced meanwhile
  if (error !== null) {
    panel.error = error;
    return;
  }
  // bind the newest run (startAction pushes it to the front)
  panel.runId = aiRuns.runs[0]?.id ?? null;
}

/** Retry from a failed/cancelled run: back to ready with the same action. */
export function retryFromRun(runId: string): void {
  const run = aiRuns.runById(runId);
  if (run === undefined || ui.aiPanel === null) return;
  ui.aiPanel = { ...basePanel(run.listId, run.todoId, run.action), question: ui.aiPanel.question };
  void runFromPanel();
}

/** New run: ready phase again, keeping the panel's context. */
export function newRunFromPanel(): void {
  const panel = ui.aiPanel;
  if (panel === null) return;
  ui.aiPanel = { ...panel, runId: null, history: false, error: null };
}

export function openAiClientsFromPanel(): void {
  aiClients.openDialog();
}

/** The todo whose id a todo-level action would use, when valid. */
export function panelTodoTitle(panel: AiPanelState): string | null {
  if (panel.todoId === null) return null;
  return findTodo(store.data, panel.todoId)?.title ?? null;
}

export { TODO_ACTIONS };
