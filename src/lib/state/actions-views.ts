// Actions for the Pinned / Trash views and cross-view navigation.

import { findTodo, restoreTodo, deleteTodoPermanently, emptyTrash } from "$lib/core/todos-ops";
import { store } from "./store.svelte";
import { ui } from "./ui.svelte";

/**
 * Navigate home (INTERACTIONS.md): switch the active pane to the todo's
 * list, expand ancestor groups, open the Archived section if needed,
 * select and open details.
 */
export function navigateHome(todoId: string): void {
  const todo = findTodo(store.data, todoId);
  if (todo === undefined) return;
  // expand ancestors — view state, not undoable
  store.apply(
    "expand ancestors",
    (data) => {
      let cursor = todo.groupId;
      while (cursor !== null) {
        const group = data.groups.find((g) => g.id === cursor);
        if (group === undefined) break;
        group.collapsed = false;
        cursor = group.parentId;
      }
    },
    { undoable: false },
  );
  if (todo.archived) ui.archOpen[todo.listId] = true;
  ui.view = "main";
  ui.updatePane(ui.activePane, { listId: todo.listId });
  ui.selectedId = todoId;
  ui.detailOpen = true;
  ui.detailTab = "details";
}

export function restoreTodoAction(id: string): void {
  store.apply("restore", (data) => restoreTodo(data, id, Date.now()));
  ui.showToast("Restored", true);
}

export function deletePermanentlyAction(id: string): void {
  store.apply("permanent delete", (data) => deleteTodoPermanently(data, id));
  if (ui.selectedId === id) ui.selectedId = null;
  ui.showToast("Deleted permanently", true);
}

/** The ONE confirmed action in the app (recorded decision #2). */
export function emptyTrashAction(): void {
  store.apply("empty trash", (data) => emptyTrash(data));
  ui.showToast("Trash emptied", true);
}
