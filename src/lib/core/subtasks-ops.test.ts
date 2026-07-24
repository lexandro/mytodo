import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { createList } from "./lists-ops";
import { addSubtask, editSubtask, removeSubtask, reorderSubtask, toggleSubtask } from "./subtasks-ops";
import { createTodo } from "./todos-ops";
import { emptyDomainData, type DomainData, type Subtask, type Todo } from "./types";

function base(): { data: DomainData; todo: Todo } {
  const data = emptyDomainData();
  ensureInbox(data);
  const list = createList(data, "Work");
  const todo = createTodo(data, list.id, null, "parent", 1);
  return { data, todo };
}

function lastActivity(data: DomainData, todoId: string): string {
  const events = data.activity.filter((a) => a.todoId === todoId);
  return events[events.length - 1]?.summary ?? "";
}

describe("addSubtask", () => {
  it("appends in order and logs activity", () => {
    const { data, todo } = base();
    const a = addSubtask(data, todo.id, "first", 2) as Subtask;
    const b = addSubtask(data, todo.id, "second", 3) as Subtask;
    expect(a.order).toBeLessThan(b.order);
    expect(lastActivity(data, todo.id)).toBe('Added subtask "second"');
  });

  it("rejects blank text and unknown todos", () => {
    const { data, todo } = base();
    expect(addSubtask(data, todo.id, "   ", 2)).toBeNull();
    expect(addSubtask(data, "missing", "x", 2)).toBeNull();
    expect(data.subtasks).toHaveLength(0);
  });
});

describe("toggleSubtask", () => {
  it("checks and unchecks with matching activity", () => {
    const { data, todo } = base();
    const sub = addSubtask(data, todo.id, "fix retry", 2) as Subtask;
    toggleSubtask(data, sub.id, 3);
    expect(sub.checked).toBe(true);
    expect(lastActivity(data, todo.id)).toBe('Completed subtask "fix retry"');
    toggleSubtask(data, sub.id, 4);
    expect(sub.checked).toBe(false);
    expect(lastActivity(data, todo.id)).toBe('Reopened subtask "fix retry"');
  });
});

describe("editSubtask", () => {
  it("edits text, ignores blank", () => {
    const { data, todo } = base();
    const sub = addSubtask(data, todo.id, "old", 2) as Subtask;
    editSubtask(data, sub.id, "new");
    expect(sub.text).toBe("new");
    editSubtask(data, sub.id, "  ");
    expect(sub.text).toBe("new");
  });
});

describe("removeSubtask", () => {
  it("removes and logs", () => {
    const { data, todo } = base();
    const sub = addSubtask(data, todo.id, "gone", 2) as Subtask;
    removeSubtask(data, sub.id, 3);
    expect(data.subtasks).toHaveLength(0);
    expect(lastActivity(data, todo.id)).toBe('Removed subtask "gone"');
  });
});

describe("reorderSubtask", () => {
  it("reorders within the same todo only", () => {
    const { data, todo } = base();
    const a = addSubtask(data, todo.id, "a", 2) as Subtask;
    const b = addSubtask(data, todo.id, "b", 3) as Subtask;
    const c = addSubtask(data, todo.id, "c", 4) as Subtask;
    reorderSubtask(data, c.id, a.id, "before");
    expect(c.order).toBeLessThan(a.order);
    const other = createTodo(data, todo.listId, null, "other", 5);
    const foreign = addSubtask(data, other.id, "x", 6) as Subtask;
    const before = foreign.order;
    reorderSubtask(data, foreign.id, b.id, "before");
    expect(foreign.order).toBe(before);
  });
});
