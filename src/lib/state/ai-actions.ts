// AI panel actions: open/close transitions, preset runs and chat turns
// inside the panel's conversation, and the narrow-window exclusivity rule
// between the detail panel and the AI panel (design DESIGN.md §AI run panel).
// The ✦ AI button opens this panel directly — there is no dropdown menu.

import { conversationRuns } from "$lib/core/ai-runs";
import { isTodoAction, type AIAction, type AIMode } from "$lib/core/ai-types";
import { newId } from "$lib/core/ids";
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

function basePanel(listId: string, todoId: string | null): AiPanelState {
  return {
    listId,
    todoId,
    conversationId: newId(),
    draft: "",
    chatMode: "analyze",
    presetsOpen: true,
    history: false,
    error: null,
  };
}

function show(panel: AiPanelState): void {
  ui.aiPanel = panel;
  if (isNarrow()) ui.detailOpen = false;
  if (aiConfig.linkFor(panel.listId) !== undefined) void aiConfig.refreshMissing(panel.listId);
}

/** Opens the panel on a fresh conversation for a list (and optional todo). */
export function openAiPanel(listId: string, todoId: string | null, action?: AIAction): void {
  show(basePanel(listId, todoId));
  if (action !== undefined) void runPreset(action);
}

/** ✦ AI / Ctrl+Shift+A: the selected todo's list, else the active pane's. */
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
  show({ ...basePanel(listId, null), history: true });
}

/** Reopens a stored conversation (history rows, AI tab) for further turns. */
export function openConversation(conversationId: string): void {
  const turns = conversationRuns(aiRuns.runs, conversationId);
  const first = turns[0];
  if (first === undefined) return;
  const last = turns[turns.length - 1];
  show({
    ...basePanel(first.listId, first.todoId),
    conversationId,
    // a resumed thread keeps the permission mode it was created with
    chatMode: last.mode === "execute" ? "execute" : "analyze",
    presetsOpen: false,
  });
}

export function closeAiPanel(): void {
  // a running run keeps going in the background — state owns it, not the UI
  ui.aiPanel = null;
}

/** The detail panel side of the narrow-window exclusivity rule. */
export function detailOpened(): void {
  if (isNarrow()) ui.aiPanel = null;
}

/** Preset action card: runs it as the newest turn of the panel's thread. */
export async function runPreset(action: AIAction): Promise<void> {
  const panel = ui.aiPanel;
  if (panel === null) return;
  panel.error = null;
  panel.presetsOpen = false;
  const error = await aiRuns.startAction({
    listId: panel.listId,
    todoId: isTodoAction(action) ? panel.todoId : null,
    action,
    conversationId: panel.conversationId,
  });
  if (ui.aiPanel === panel && error !== null) panel.error = error;
}

/** Composer: sends the draft as the next turn of the conversation. */
export async function sendChatMessage(): Promise<void> {
  const panel = ui.aiPanel;
  if (panel === null) return;
  const message = panel.draft.trim();
  if (message === "") return;
  panel.error = null;
  panel.draft = "";
  panel.presetsOpen = false;
  const error = await aiRuns.sendChatTurn({
    listId: panel.listId,
    todoId: panel.todoId,
    conversationId: panel.conversationId,
    message,
    mode: panel.chatMode,
  });
  if (ui.aiPanel !== panel || error === null) return;
  panel.error = error;
  panel.draft = message; // nothing ran — give the text back
}

/**
 * Chat mode is locked once the thread has turns: the provider session was
 * created with that sandbox/permission mode and a resumed turn must not
 * quietly widen it.
 */
export function chatModeLocked(panel: AiPanelState): boolean {
  return aiRuns.turnsOf(panel.conversationId).length > 0;
}

export function setChatMode(mode: AIMode): void {
  const panel = ui.aiPanel;
  if (panel === null || chatModeLocked(panel)) return;
  panel.chatMode = mode;
}

/** Starts an empty thread in the same list/todo context. */
export function newConversation(): void {
  const panel = ui.aiPanel;
  if (panel === null) return;
  ui.aiPanel = { ...basePanel(panel.listId, panel.todoId), chatMode: panel.chatMode };
}

export function openAiClientsFromPanel(): void {
  aiClients.openDialog();
}

/** Title of the todo the panel is bound to, when it still exists. */
export function panelTodoTitle(panel: AiPanelState): string | null {
  if (panel.todoId === null) return null;
  return findTodo(store.data, panel.todoId)?.title ?? null;
}
