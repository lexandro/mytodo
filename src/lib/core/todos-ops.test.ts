import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { createGroup } from "./groups-ops";
import { createList } from "./lists-ops";
import {
  createTodo, cycleStatus, deleteTodoPermanently, emptyTrash, moveTodo,
  renameTodo, reorderTodo, restoreTodo, setStatus, trashTodo,
} from "./todos-ops";
import { emptyDomainData, type DomainData, type Group } from "./types";

function base(): { data: DomainData; listId: string } {
  const data = emptyDomainData();
  ensureInbox(data);
  const list = createList(data, "Work");
  return { data, listId: list.id };
}

function lastActivity(data: DomainData, todoId: string): string {
  const events = data.activity.filter((a) => a.todoId === todoId);
  return events[events.length - 1]?.summary ?? "";
}

describe("createTodo", () => {
  it("creates an open todo with a Created activity entry", () => {
    const { data, listId } = base();
    const todo = createTodo(data, listId, null, "Fix bug", 42);
    expect(todo.status).toBe("open");
    expect(todo.createdAt).toBe(42);
    expect(lastActivity(data, todo.id)).toBe("Created");
  });

  it("appends to the end of its scope", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    const b = createTodo(data, listId, null, "b", 2);
    expect(a.order).toBeLessThan(b.order);
  });
});

describe("status", () => {
  it("cycles Open → In Progress → Done → Open, never into Cancelled", () => {
    const { data, listId } = base();
    const t = createTodo(data, listId, null, "x", 1);
    cycleStatus(data, t.id, 2);
    expect(t.status).toBe("progress");
    cycleStatus(data, t.id, 3);
    expect(t.status).toBe("done");
    cycleStatus(data, t.id, 4);
    expect(t.status).toBe("open");
  });

  it("cancelled cycles back to open (deliberate state, set explicitly)", () => {
    const { data, listId } = base();
    const t = createTodo(data, listId, null, "x", 1);
    setStatus(data, t.id, "cancelled", 2);
    expect(lastActivity(data, t.id)).toBe("Open → Cancelled");
    cycleStatus(data, t.id, 3);
    expect(t.status).toBe("open");
  });

  it("status transitions persist as activity summaries", () => {
    const { data, listId } = base();
    const t = createTodo(data, listId, null, "x", 1);
    setStatus(data, t.id, "progress", 2);
    expect(lastActivity(data, t.id)).toBe("Open → In Progress");
  });
});

describe("rename", () => {
  it("logs a Renamed entry once per change and skips no-ops", () => {
    const { data, listId } = base();
    const t = createTodo(data, listId, null, "a", 1);
    renameTodo(data, t.id, "b", 2);
    expect(t.title).toBe("b");
    expect(lastActivity(data, t.id)).toBe("Renamed");
    const count = data.activity.length;
    renameTodo(data, t.id, "b", 3);
    expect(data.activity.length).toBe(count);
  });
});

describe("move / reorder", () => {
  function withGroup(): { data: DomainData; listId: string; group: Group } {
    const { data, listId } = base();
    const group = createGroup(data, listId, null, "G") as Group;
    return { data, listId, group };
  }

  it("moveTodo adopts the target scope and logs the path", () => {
    const { data, listId, group } = withGroup();
    const t = createTodo(data, listId, null, "x", 1);
    moveTodo(data, t.id, listId, group.id, 2);
    expect(t.groupId).toBe(group.id);
    expect(lastActivity(data, t.id)).toBe("Moved to Work / G");
  });

  it("reorderTodo places before/after the target within its scope", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    const b = createTodo(data, listId, null, "b", 2);
    const c = createTodo(data, listId, null, "c", 3);
    reorderTodo(data, c.id, a.id, "before", 4);
    expect(c.order).toBeLessThan(a.order);
    reorderTodo(data, a.id, b.id, "after", 5);
    expect(a.order).toBeGreaterThan(b.order);
  });

  it("cross-group reorder logs a move, same-scope reorder does not", () => {
    const { data, listId, group } = withGroup();
    const inGroup = createTodo(data, listId, group.id, "g", 1);
    const atRoot = createTodo(data, listId, null, "r", 2);
    const before = data.activity.length;
    reorderTodo(data, atRoot.id, inGroup.id, "after", 3);
    expect(atRoot.groupId).toBe(group.id);
    expect(data.activity.length).toBe(before + 1);
    const count = data.activity.length;
    reorderTodo(data, atRoot.id, inGroup.id, "before", 4);
    expect(data.activity.length).toBe(count);
  });
});

describe("trash", () => {
  it("soft-deletes, restores to original location", () => {
    const { data, listId } = base();
    const t = createTodo(data, listId, null, "x", 1);
    trashTodo(data, t.id, 2);
    expect(t.trashed).toBe(true);
    expect(t.trashedAt).toBe(2);
    restoreTodo(data, t.id, 3);
    expect(t.trashed).toBe(false);
    expect(t.listId).toBe(listId);
  });

  it("restores to list root when the original group is gone", () => {
    const { data, listId } = base();
    const group = createGroup(data, listId, null, "G") as Group;
    const t = createTodo(data, listId, group.id, "x", 1);
    trashTodo(data, t.id, 2);
    data.groups = data.groups.filter((g) => g.id !== group.id);
    restoreTodo(data, t.id, 3);
    expect(t.groupId).toBeNull();
  });

  it("permanent delete removes todo with subtasks and activity", () => {
    const { data, listId } = base();
    const t = createTodo(data, listId, null, "x", 1);
    data.subtasks.push({ id: "s", todoId: t.id, text: "sub", checked: false, order: 1 });
    deleteTodoPermanently(data, t.id);
    expect(data.todos).toHaveLength(0);
    expect(data.subtasks).toHaveLength(0);
    expect(data.activity).toHaveLength(0);
  });

  it("emptyTrash only removes trashed todos", () => {
    const { data, listId } = base();
    const keep = createTodo(data, listId, null, "keep", 1);
    const gone = createTodo(data, listId, null, "gone", 2);
    trashTodo(data, gone.id, 3);
    emptyTrash(data);
    expect(data.todos.map((t) => t.id)).toEqual([keep.id]);
  });
});
