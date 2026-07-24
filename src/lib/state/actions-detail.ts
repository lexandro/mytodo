// Detail-panel actions: field edits, pin/archive/duplicate, subtasks,
// custom labels, link opening. Kept separate from actions.ts for focus.

import { newId } from "$lib/core/ids";
import { canAddCustomLabel, deleteCustomLabel } from "$lib/core/labels";
import { isSafeWindowsPath } from "$lib/core/links";
import { ORDER_STEP } from "$lib/core/ordering";
import { addSubtask, editSubtask, removeSubtask, toggleSubtask } from "$lib/core/subtasks-ops";
import {
  duplicateTodo, setArchived, setColorLabel, setDescription, setEmoji, togglePin,
} from "$lib/core/todos-detail-ops";
import { renameTodo } from "$lib/core/todos-ops";
import { openFsPath, openWebUrl } from "$lib/ipc";
import { store } from "./store.svelte";
import { ui } from "./ui.svelte";

// ── field edits (autosave on change/blur) ───────────────────────────────────

export function renameTodoAction(id: string, title: string): void {
  const trimmed = title.trim();
  if (trimmed === "") return;
  store.apply("rename", (data) => renameTodo(data, id, trimmed, Date.now()));
}

export function setDescriptionAction(id: string, description: string): void {
  store.apply("edit description", (data) => setDescription(data, id, description, Date.now()));
}

export function setEmojiAction(id: string, emoji: string): void {
  store.apply("emoji change", (data) => setEmoji(data, id, emoji.trim(), Date.now()));
}

export function setColorLabelAction(id: string, colorLabelId: string | null): void {
  store.apply("color change", (data) => setColorLabel(data, id, colorLabelId, Date.now()));
}

// ── pin / archive / duplicate ───────────────────────────────────────────────

export function togglePinAction(id: string, kind: "local" | "global"): void {
  store.apply("pin change", (data) => togglePin(data, id, kind, Date.now()));
  ui.ctxMenu = null;
}

export function setArchivedAction(id: string, archived: boolean): void {
  store.apply(archived ? "archive" : "restore", (data) =>
    setArchived(data, id, archived, Date.now()),
  );
  ui.ctxMenu = null;
  ui.showToast(archived ? "Archived" : "Restored from archive", true);
}

export function duplicateAction(id: string): void {
  let copyId: string | null = null;
  store.apply("duplicate", (data) => {
    copyId = duplicateTodo(data, id, Date.now())?.id ?? null;
  });
  ui.ctxMenu = null;
  if (copyId !== null) {
    ui.selectedId = copyId;
    ui.showToast("Duplicated", true);
  }
}

// ── subtasks ────────────────────────────────────────────────────────────────

export function addSubtaskAction(todoId: string, text: string): boolean {
  if (text.trim() === "") return false;
  store.apply("add subtask", (data) => addSubtask(data, todoId, text, Date.now()));
  return true;
}

export function toggleSubtaskAction(id: string): void {
  store.apply("toggle subtask", (data) => toggleSubtask(data, id, Date.now()));
}

export function editSubtaskAction(id: string, text: string): void {
  store.apply("edit subtask", (data) => editSubtask(data, id, text));
}

export function removeSubtaskAction(id: string): void {
  store.apply("remove subtask", (data) => removeSubtask(data, id, Date.now()));
}

// ── custom color labels (max 12) ────────────────────────────────────────────

export function addCustomLabel(color: string, name: string | null): void {
  if (!canAddCustomLabel(store.data)) return;
  store.apply("add label", (data) => {
    const maxOrder = Math.max(0, ...data.colorLabels.map((c) => c.order));
    data.colorLabels.push({ id: newId(), name, color, order: maxOrder + ORDER_STEP });
  });
}

export function updateCustomLabel(id: string, color: string, name: string | null): void {
  store.apply("edit label", (data) => {
    const label = data.colorLabels.find((c) => c.id === id);
    if (label === undefined) return;
    label.color = color;
    label.name = name;
  });
}

export function removeCustomLabel(id: string): void {
  store.apply("remove label", (data) => deleteCustomLabel(data, id));
}

// ── links ───────────────────────────────────────────────────────────────────

export async function openLink(type: "url" | "path", text: string): Promise<void> {
  try {
    if (type === "url") {
      await openWebUrl(text);
    } else if (isSafeWindowsPath(text)) {
      await openFsPath(text);
    } else {
      ui.showToast("Path looks unsafe — not opened");
      return;
    }
  } catch (e) {
    ui.showToast(`Cannot open: ${e instanceof Error ? e.message : String(e)}`);
  }
}
