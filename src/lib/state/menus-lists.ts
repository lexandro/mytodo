// Context menus for the containers: groups and lists. The todo menu and the
// shared menu plumbing live in menus.ts.

import { groupDepth } from "$lib/core/groups-ops";
import { createTodo } from "$lib/core/todos-ops";
import { MAX_GROUP_DEPTH, type Group, type List } from "$lib/core/types";
import { armRename, deleteGroupAction, deleteListAction, newGroup, openDetails } from "./actions";
import { aiConfig } from "./ai-config.svelte";
import { closeAnd } from "./menus";
import { placeNewTodos } from "./status-placement";
import { store } from "./store.svelte";
import { ui, type CtxItem } from "./ui.svelte";

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
    placeNewTodos(data, [id]);
  });
  openDetails(id);
}

export function listMenuItems(list: List): CtxItem[] {
  const linked = aiConfig.linkFor(list.id) !== undefined;
  return [
    { label: "Rename", hint: "F2", action: () => armRename("list", list.id) },
    { label: "Icon & color…", action: closeAnd(() => (ui.listAppearance = list.id)) },
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
