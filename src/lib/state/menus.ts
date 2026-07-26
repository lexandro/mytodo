// Context menu plumbing and the todo menu — per COMPONENTS.md/prototype.
// Right-clicking a todo also selects it (INTERACTIONS.md). The group and list
// menus live in menus-lists.ts.

import { STATUS_LABEL, locationPath } from "$lib/core/activity";
import { ACTION_LABELS, ACTION_MODES, TODO_ACTIONS } from "$lib/core/ai-types";
import { childrenOf, indentCheck } from "$lib/core/todo-tree";
import { MAX_TODO_DEPTH, type Todo, type TodoStatus } from "$lib/core/types";
import { moveTodoAction, openDetails, setTodoStatus, trashTodoAction } from "./actions";
import { duplicateAction, setArchivedAction, togglePinAction } from "./actions-detail";
import {
  indentTodoAction, moveTodoInScopeAction, outdentTodoAction, setStatusDeepAction,
} from "./actions-tree";
import { openAiPanel } from "./ai-actions";
import { aiConfig } from "./ai-config.svelte";
import { store } from "./store.svelte";
import { ui, type CtxItem } from "./ui.svelte";

const MENU_WIDTH = 230;

export function openContextMenu(e: MouseEvent, items: CtxItem[]): void {
  e.preventDefault();
  e.stopPropagation();
  const estHeight = Math.min(items.length * 30 + 20, 380);
  ui.ctxMenu = {
    x: Math.min(e.clientX, window.innerWidth - MENU_WIDTH),
    y: Math.min(e.clientY, window.innerHeight - estHeight),
    items,
  };
}

/** Wraps an action so the menu closes before it runs. */
export function closeAnd(action: () => void): () => void {
  return () => {
    ui.ctxMenu = null;
    action();
  };
}

export function todoMenuItems(todo: Todo): CtxItem[] {
  const statuses: TodoStatus[] = ["open", "progress", "done", "cancelled"];
  const hasSubItems = childrenOf(store.data, todo.id).length > 0;
  const indent = indentCheck(store.data, todo.id);
  return [
    { label: "Open details", action: closeAnd(() => openDetails(todo.id)) },
    { separator: true },
    ...statuses.map((st): CtxItem => ({
      label: `${todo.status === st ? "●" : "○"}  ${STATUS_LABEL[st]}`,
      action: closeAnd(() => setTodoStatus(todo.id, st)),
    })),
    // only worth offering when there is a branch to close in one go
    ...(hasSubItems
      ? [{
          label: "✓  Done with sub-items",
          action: () => setStatusDeepAction(todo.id, "done"),
        } satisfies CtxItem]
      : []),
    { separator: true },
    {
      label: todo.pinLocal ? "Unpin from list" : "Pin to list",
      hint: "Ctrl+P",
      action: () => togglePinAction(todo.id, "local"),
    },
    {
      label: todo.pinGlobal ? "Unpin globally" : "Pin globally",
      action: () => togglePinAction(todo.id, "global"),
    },
    { label: "Move up", hint: "Alt+↑", action: () => moveTodoInScopeAction(todo.id, "up") },
    { label: "Move down", hint: "Alt+↓", action: () => moveTodoInScopeAction(todo.id, "down") },
    indent.ok
      ? { label: "Make sub-item", hint: "Tab", action: () => indentTodoAction(todo.id) }
      : {
          label: "Make sub-item",
          hint: indent.reason === "too-deep" ? `max ${MAX_TODO_DEPTH} levels` : "nothing above",
          disabled: true,
          action: () => {},
        },
    todo.parentId !== null
      ? { label: "Lift out", hint: "Shift+Tab", action: () => outdentTodoAction(todo.id) }
      : { label: "Lift out", hint: "not a sub-item", disabled: true, action: () => {} },
    todo.groupId !== null
      ? { label: "Move up one level", hint: "Alt+←", action: closeAnd(() => moveUpOneLevel(todo)) }
      : { label: "Move up one level", hint: "at root", disabled: true, action: () => {} },
    { label: "Move to…", action: () => (ui.ctxMenu = ui.ctxMenu === null ? null : { ...ui.ctxMenu, items: moveTargetItems(todo) }) },
    { label: "Duplicate", action: () => duplicateAction(todo.id) },
    { label: "AI actions…", action: () => (ui.ctxMenu = ui.ctxMenu === null ? null : { ...ui.ctxMenu, items: aiActionItems(todo) }) },
    { separator: true },
    {
      label: todo.archived ? "Restore from archive" : "Archive",
      action: () => setArchivedAction(todo.id, !todo.archived),
    },
    { label: "Delete", hint: "Del", danger: true, action: () => trashTodoAction(todo.id) },
  ];
}

export function moveUpOneLevel(todo: Todo): void {
  const group = store.data.groups.find((g) => g.id === todo.groupId);
  moveTodoAction(todo.id, todo.listId, group?.parentId ?? null, "Moved up one level");
}

/** "Move to…" morphs the open menu into a list + group target list. */
export function moveTargetItems(todo: Todo): CtxItem[] {
  const items: CtxItem[] = [{ label: "Move to…", disabled: true, action: () => {} }];
  for (const list of store.data.lists) {
    const current = list.id === todo.listId && todo.groupId === null;
    items.push({
      label: list.emoji === "" ? list.name : `${list.emoji}  ${list.name}`,
      hint: current ? "current" : "",
      action: () => moveTodoAction(todo.id, list.id, null, `Moved to ${list.name}`),
    });
  }
  for (const group of store.data.groups.filter((g) => g.listId === todo.listId)) {
    const path = locationPath(store.data, todo.listId, group.id).split(" / ").slice(1).join(" / ");
    items.push({
      label: `↳  ${path}`,
      hint: group.id === todo.groupId ? "current" : "",
      action: () => moveTodoAction(todo.id, todo.listId, group.id, "Moved"),
    });
  }
  return items;
}

/** "AI actions…" morphs the todo menu into the 5 todo-level AI actions. */
export function aiActionItems(todo: Todo): CtxItem[] {
  if (aiConfig.linkFor(todo.listId) === undefined) {
    return [
      {
        label: "Link a workspace to use AI",
        action: closeAnd(() => (ui.workspaceSettings = todo.listId)),
      },
    ];
  }
  return TODO_ACTIONS.map((action): CtxItem => ({
    label: ACTION_LABELS[action],
    hint: ACTION_MODES[action] === "execute" ? "may modify files" : "read only",
    action: closeAnd(() => openAiPanel(todo.listId, todo.id, action)),
  }));
}
