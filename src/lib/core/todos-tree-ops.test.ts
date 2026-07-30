import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { createGroup } from "./groups-ops";
import { createList } from "./lists-ops";
import { byOrder } from "./ordering";
import { childrenOf, subtreeOf, todoDepth } from "./todo-tree";
import { setArchived } from "./todos-detail-ops";
import {
  createTodo, deleteTodoPermanently, moveTodo, reorderTodo, restoreTodo, scopeSiblings, trashTodo,
} from "./todos-ops";
import {
  canMoveInScope, moveTodoInScope, nestTodo, outdentTodo, setStatusDeep,
} from "./todos-tree-ops";
import { emptyDomainData, type DomainData, type Group } from "./types";

function base(): { data: DomainData; listId: string } {
  const data = emptyDomainData();
  ensureInbox(data);
  const list = createList(data, "Work");
  return { data, listId: list.id };
}

/** Children of a parent in render order — what the pane would show under it. */
function childTitles(data: DomainData, parentId: string): string[] {
  return childrenOf(data, parentId).map((t) => t.title);
}

function lastActivity(data: DomainData, todoId: string): string {
  const events = data.activity.filter((a) => a.todoId === todoId);
  return events[events.length - 1]?.summary ?? "";
}

describe("nestTodo", () => {
  it("makes a todo a sub-item of another and logs it", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    expect(nestTodo(data, child.id, parent.id, 3)).toBe(true);
    expect(child.parentId).toBe(parent.id);
    expect(todoDepth(data, child.id)).toBe(2);
    expect(lastActivity(data, child.id)).toBe('Made a sub-item of "parent"');
  });

  it("appends after the existing sub-items", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const first = createTodo(data, listId, null, "first", 2);
    const second = createTodo(data, listId, null, "second", 3);
    nestTodo(data, first.id, parent.id, 4);
    nestTodo(data, second.id, parent.id, 5);
    expect(childTitles(data, parent.id)).toEqual(["first", "second"]);
  });

  it("pulls the todo into the parent's list and group", () => {
    const { data, listId } = base();
    const other = createList(data, "Other");
    const group = createGroup(data, listId, null, "G") as Group;
    const parent = createTodo(data, listId, group.id, "parent", 1);
    const child = createTodo(data, other.id, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    expect(child.listId).toBe(listId);
    expect(child.groupId).toBe(group.id);
  });

  it("drags the whole branch along", () => {
    const { data, listId } = base();
    const group = createGroup(data, listId, null, "G") as Group;
    const parent = createTodo(data, listId, group.id, "parent", 1);
    const moved = createTodo(data, listId, null, "moved", 2);
    const grandchild = createTodo(data, listId, null, "grandchild", 3);
    nestTodo(data, grandchild.id, moved.id, 4);
    nestTodo(data, moved.id, parent.id, 5);
    expect(grandchild.groupId).toBe(group.id);
    expect(grandchild.parentId).toBe(moved.id);
  });

  it("refuses a cycle and leaves the tree untouched", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    expect(nestTodo(data, parent.id, child.id, 4)).toBe(false);
    expect(parent.parentId).toBeNull();
    expect(child.parentId).toBe(parent.id);
  });

  it("is a no-op when the todo is already there", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    expect(nestTodo(data, child.id, parent.id, 4)).toBe(false);
  });
});

describe("outdentTodo", () => {
  it("lifts a sub-item to sit right after its former parent", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const after = createTodo(data, listId, null, "after", 2);
    const child = createTodo(data, listId, null, "child", 3);
    nestTodo(data, child.id, parent.id, 4);
    expect(outdentTodo(data, child.id, 5)).toBe(true);
    expect(child.parentId).toBeNull();
    const roots = data.todos.filter((t) => t.parentId === null).sort(byOrder);
    expect(roots.map((t) => t.title)).toEqual(["parent", "child", "after"]);
  });

  it("keeps the lifted todo's own sub-items", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    const grandchild = createTodo(data, listId, null, "grandchild", 3);
    nestTodo(data, child.id, parent.id, 4);
    nestTodo(data, grandchild.id, child.id, 5);
    outdentTodo(data, child.id, 6);
    expect(grandchild.parentId).toBe(child.id);
    expect(todoDepth(data, grandchild.id)).toBe(2);
  });

  it("lifts one level only, into the grandparent", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    const b = createTodo(data, listId, null, "b", 2);
    const c = createTodo(data, listId, null, "c", 3);
    nestTodo(data, b.id, a.id, 4);
    nestTodo(data, c.id, b.id, 5);
    outdentTodo(data, c.id, 6);
    expect(c.parentId).toBe(a.id);
    expect(childTitles(data, a.id)).toEqual(["b", "c"]);
  });

  it("does nothing for a top-level todo", () => {
    const { data, listId } = base();
    const solo = createTodo(data, listId, null, "solo", 1);
    expect(outdentTodo(data, solo.id, 2)).toBe(false);
    expect(outdentTodo(data, "nope", 2)).toBe(false);
  });
});

describe("moveTodoInScope", () => {
  /** Titles of one scope in render order. */
  function order(data: DomainData, parentId: string | null = null): string[] {
    return data.todos
      .filter((t) => t.parentId === parentId && !t.trashed && !t.archived)
      .sort(byOrder)
      .map((t) => t.title);
  }

  it("swaps with the row above and below", () => {
    const { data, listId } = base();
    createTodo(data, listId, null, "a", 1);
    const b = createTodo(data, listId, null, "b", 2);
    createTodo(data, listId, null, "c", 3);

    expect(moveTodoInScope(data, b.id, "up", 4)).toBe(true);
    expect(order(data)).toEqual(["b", "a", "c"]);
    expect(moveTodoInScope(data, b.id, "down", 5)).toBe(true);
    expect(order(data)).toEqual(["a", "b", "c"]);
    expect(moveTodoInScope(data, b.id, "down", 6)).toBe(true);
    expect(order(data)).toEqual(["a", "c", "b"]);
  });

  it("stops at the edges instead of leaving the scope", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    const b = createTodo(data, listId, null, "b", 2);
    expect(moveTodoInScope(data, a.id, "up", 3)).toBe(false);
    expect(moveTodoInScope(data, b.id, "down", 4)).toBe(false);
    expect(order(data)).toEqual(["a", "b"]);
  });

  it("moves among sub-items without escaping the parent", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const first = createTodo(data, listId, null, "first", 2);
    const second = createTodo(data, listId, null, "second", 3);
    nestTodo(data, first.id, parent.id, 4);
    nestTodo(data, second.id, parent.id, 5);

    expect(moveTodoInScope(data, second.id, "up", 6)).toBe(true);
    expect(order(data, parent.id)).toEqual(["second", "first"]);
    expect(second.parentId).toBe(parent.id);
    // the top sub-item cannot climb out to become a sibling of its parent
    expect(moveTodoInScope(data, second.id, "up", 7)).toBe(false);
  });

  it("swaps a pinned todo with pinned neighbours only", () => {
    const { data, listId } = base();
    const pinnedA = createTodo(data, listId, null, "pin-a", 1);
    createTodo(data, listId, null, "plain", 2);
    const pinnedB = createTodo(data, listId, null, "pin-b", 3);
    pinnedA.pinLocal = true;
    pinnedB.pinLocal = true;

    // in the Pinned section pin-b sits right under pin-a, so one step swaps them
    expect(moveTodoInScope(data, pinnedB.id, "up", 4)).toBe(true);
    expect(order(data)).toEqual(["pin-b", "pin-a", "plain"]);
    expect(moveTodoInScope(data, pinnedB.id, "up", 5)).toBe(false);
  });

  it("leaves an unpinned todo's neighbours to the unpinned rows", () => {
    const { data, listId } = base();
    const pinned = createTodo(data, listId, null, "pinned", 1);
    const plainA = createTodo(data, listId, null, "plain-a", 2);
    createTodo(data, listId, null, "plain-b", 3);
    pinned.pinLocal = true;
    // plain-a is the first row of the list proper — nothing above it to swap with
    expect(moveTodoInScope(data, plainA.id, "up", 4)).toBe(false);
  });

  it("refuses trashed, archived and unknown todos", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    createTodo(data, listId, null, "b", 2);
    a.archived = true;
    expect(moveTodoInScope(data, a.id, "down", 3)).toBe(false);
    a.archived = false;
    a.trashed = true;
    expect(moveTodoInScope(data, a.id, "down", 4)).toBe(false);
    expect(moveTodoInScope(data, "nope", "up", 5)).toBe(false);
  });

  it("stamps updatedAt on a real move", () => {
    const { data, listId } = base();
    createTodo(data, listId, null, "a", 1);
    const b = createTodo(data, listId, null, "b", 2);
    moveTodoInScope(data, b.id, "up", 99);
    expect(b.updatedAt).toBe(99);
  });
});

describe("setStatusDeep", () => {
  it("applies the status to the whole branch and reports what changed", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    const grandchild = createTodo(data, listId, null, "grandchild", 3);
    nestTodo(data, child.id, parent.id, 4);
    nestTodo(data, grandchild.id, child.id, 5);
    const changed = setStatusDeep(data, parent.id, "done", 6);
    expect(changed).toEqual([parent.id, child.id, grandchild.id]);
    expect(subtreeOf(data, parent.id).every((t) => t.status === "done")).toBe(true);
  });

  it("skips rows that already have the status", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    setStatusDeep(data, parent.id, "done", 4);
    expect(setStatusDeep(data, parent.id, "done", 5)).toEqual([]);
  });

  it("leaves trashed sub-items alone", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    child.trashed = true;
    expect(setStatusDeep(data, parent.id, "done", 4)).toEqual([parent.id]);
    expect(child.status).toBe("open");
  });
});

describe("subtree cascades", () => {
  it("trashes and restores the branch as one", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    trashTodo(data, parent.id, 4);
    expect(child.trashed).toBe(true);
    restoreTodo(data, parent.id, 5);
    restoreTodo(data, child.id, 6);
    expect(child.parentId).toBe(parent.id);
  });

  it("lifts a restored sub-item out when its parent stays in the trash", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    trashTodo(data, parent.id, 4);
    restoreTodo(data, child.id, 5);
    expect(child.parentId).toBeNull();
    expect(parent.trashed).toBe(true);
  });

  it("archives the branch as one", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    setArchived(data, parent.id, true, 4);
    expect(child.archived).toBe(true);
    setArchived(data, parent.id, false, 5);
    expect(child.archived).toBe(false);
  });

  it("deletes the branch permanently, with its subtasks and activity", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    deleteTodoPermanently(data, parent.id);
    expect(data.todos).toHaveLength(0);
    expect(data.activity.filter((a) => a.todoId === child.id)).toHaveLength(0);
  });

  it("moves the branch to another list, dropping the sub-item link only at the root", () => {
    const { data, listId } = base();
    const other = createList(data, "Other");
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    moveTodo(data, parent.id, other.id, null, 4);
    expect(parent.listId).toBe(other.id);
    expect(parent.parentId).toBeNull();
    expect(child.listId).toBe(other.id);
    expect(child.parentId).toBe(parent.id);
  });

  it("outdents a sub-item that is moved out on its own", () => {
    const { data, listId } = base();
    const other = createList(data, "Other");
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    moveTodo(data, child.id, other.id, null, 4);
    expect(child.parentId).toBeNull();
    expect(childrenOf(data, parent.id)).toHaveLength(0);
  });
});

describe("reorderTodo with sub-items", () => {
  it("adopts the target's parent, so a drop lands among its siblings", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    const dropped = createTodo(data, listId, null, "dropped", 3);
    nestTodo(data, child.id, parent.id, 4);
    reorderTodo(data, dropped.id, child.id, "after", 5);
    expect(dropped.parentId).toBe(parent.id);
    expect(childTitles(data, parent.id)).toEqual(["child", "dropped"]);
  });

  it("refuses to drop a todo inside its own subtree", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    reorderTodo(data, parent.id, child.id, "after", 4);
    expect(parent.parentId).toBeNull();
    expect(child.parentId).toBe(parent.id);
  });

  it("takes the branch along to another scope", () => {
    const { data, listId } = base();
    const group = createGroup(data, listId, null, "G") as Group;
    const inGroup = createTodo(data, listId, group.id, "in-group", 1);
    const parent = createTodo(data, listId, null, "parent", 2);
    const child = createTodo(data, listId, null, "child", 3);
    nestTodo(data, child.id, parent.id, 4);
    reorderTodo(data, parent.id, inGroup.id, "before", 5);
    expect(parent.groupId).toBe(group.id);
    expect(child.groupId).toBe(group.id);
    expect(child.parentId).toBe(parent.id);
  });
});

describe("canMoveInScope", () => {
  it("answers before anything moves, so a block move can refuse as a whole", () => {
    const { data, listId } = base();
    const first = createTodo(data, listId, null, "first", 1);
    const middle = createTodo(data, listId, null, "middle", 2);
    const last = createTodo(data, listId, null, "last", 3);
    expect(canMoveInScope(data, first.id, "up")).toBe(false);
    expect(canMoveInScope(data, first.id, "down")).toBe(true);
    expect(canMoveInScope(data, middle.id, "up")).toBe(true);
    expect(canMoveInScope(data, middle.id, "down")).toBe(true);
    expect(canMoveInScope(data, last.id, "down")).toBe(false);
    // asking must not have moved anything
    expect(scopeSiblings(data, listId, null, null).map((t) => t.title))
      .toEqual(["first", "middle", "last"]);
  });

  it("says no for an unknown, trashed or archived todo", () => {
    const { data, listId } = base();
    const todo = createTodo(data, listId, null, "only", 1);
    createTodo(data, listId, null, "other", 2);
    expect(canMoveInScope(data, "nope", "down")).toBe(false);
    todo.archived = true;
    expect(canMoveInScope(data, todo.id, "down")).toBe(false);
  });
});
