// Context menu builders — per COMPONENTS.md/prototype. Right-clicking a todo
// also selects it (INTERACTIONS.md).

import { STATUS_LABEL, locationPath } from "$lib/core/activity";
import { groupDepth } from "$lib/core/groups-ops";
import { createTodo, setStatus } from "$lib/core/todos-ops";
import { MAX_GROUP_DEPTH, type Group, type List, type Todo, type TodoStatus } from "$lib/core/types";
import {
  armRename, deleteGroupAction, deleteListAction, moveTodoAction, newGroup,
  openDetails, trashTodoAction,
} from "./actions";
import { duplicateAction, setArchivedAction, togglePinAction } from "./actions-detail";
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

function closeAnd(action: () => void): () => void {
  return () => {
    ui.ctxMenu = null;
    action();
  };
}

export function todoMenuItems(todo: Todo): CtxItem[] {
  const statuses: TodoStatus[] = ["open", "progress", "done", "cancelled"];
  return [
    { label: "Open details", action: closeAnd(() => openDetails(todo.id)) },
    { separator: true },
    ...statuses.map((st): CtxItem => ({
      label: `${todo.status === st ? "●" : "○"}  ${STATUS_LABEL[st]}`,
      action: closeAnd(() =>
        store.apply("status change", (data) => setStatus(data, todo.id, st, Date.now())),
      ),
    })),
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
    todo.groupId !== null
      ? { label: "Move up one level", hint: "Alt+←", action: closeAnd(() => moveUpOneLevel(todo)) }
      : { label: "Move up one level", hint: "at root", disabled: true, action: () => {} },
    { label: "Move to…", action: () => (ui.ctxMenu = ui.ctxMenu === null ? null : { ...ui.ctxMenu, items: moveTargetItems(todo) }) },
    { label: "Duplicate", action: () => duplicateAction(todo.id) },
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

export function groupMenuItems(group: Group): CtxItem[] {
  const depth = groupDepth(store.data, group.id);
  return [
    { label: "Rename", hint: "F2", action: () => armRename("group", group.id) },
    { label: "New todo here", action: closeAnd(() => newTodoInGroup(group)) },
    depth < MAX_GROUP_DEPTH
      ? { label: "New subgroup", action: () => newGroup(group.listId, group.id) }
      : { label: "New subgroup", hint: "3-level limit", disabled: true, action: () => {} },
    { separator: true },
    { label: "Delete group", danger: true, action: () => deleteGroupAction(group.id) },
  ];
}

/** Prototype: creates "New todo" in the group and opens details to edit it. */
function newTodoInGroup(group: Group): void {
  let id = "";
  store.apply("add todo", (data) => {
    id = createTodo(data, group.listId, group.id, "New todo", Date.now()).id;
  });
  openDetails(id);
}

export function listMenuItems(list: List): CtxItem[] {
  const linked = aiConfig.linkFor(list.id) !== undefined;
  return [
    { label: "Rename", hint: "F2", action: () => armRename("list", list.id) },
    { label: "New group", action: () => newGroup(list.id, null) },
    { separator: true },
    {
      label: linked ? "Workspace settings…" : "Link Workspace…",
      action: closeAnd(() => {
        ui.workspaceSettings = list.id;
        if (linked) void aiConfig.refreshMissing(list.id);
      }),
    },
    { separator: true },
    list.fixed
      ? { label: "Delete list", hint: "Inbox is permanent", disabled: true, action: () => {} }
      : { label: "Delete list", danger: true, action: () => deleteListAction(list.id) },
  ];
}
