import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { createList } from "./lists-ops";
import { addSubtask } from "./subtasks-ops";
import { duplicateTodo, setArchived, setColorLabel, togglePin } from "./todos-detail-ops";
import { createTodo } from "./todos-ops";
import { emptyDomainData, type DomainData, type Todo } from "./types";

function base(): { data: DomainData; listId: string; todo: Todo } {
  const data = emptyDomainData();
  ensureInbox(data);
  const list = createList(data, "Work");
  const todo = createTodo(data, list.id, null, "original", 1);
  return { data, listId: list.id, todo };
}

function lastActivity(data: DomainData, todoId: string): string {
  const events = data.activity.filter((a) => a.todoId === todoId);
  return events[events.length - 1]?.summary ?? "";
}

describe("togglePin", () => {
  it("pins locally and globally with distinct activity entries", () => {
    const { data, todo } = base();
    togglePin(data, todo.id, "local", 2);
    expect(todo.pinLocal).toBe(true);
    expect(lastActivity(data, todo.id)).toBe("Pinned to list");
    togglePin(data, todo.id, "global", 3);
    expect(todo.pinGlobal).toBe(true);
    expect(lastActivity(data, todo.id)).toBe("Pinned globally");
    togglePin(data, todo.id, "global", 4);
    expect(todo.pinGlobal).toBe(false);
    expect(lastActivity(data, todo.id)).toBe("Unpinned globally");
  });
});

describe("setArchived", () => {
  it("archives keeping status, restores, logs both", () => {
    const { data, todo } = base();
    todo.status = "done";
    setArchived(data, todo.id, true, 2);
    expect(todo.archived).toBe(true);
    expect(todo.status).toBe("done");
    expect(lastActivity(data, todo.id)).toBe("Archived");
    setArchived(data, todo.id, false, 3);
    expect(lastActivity(data, todo.id)).toBe("Restored from archive");
  });
});

describe("duplicateTodo", () => {
  it("copies content but resets identity, status, pins and activity", () => {
    const { data, todo } = base();
    todo.description = "desc";
    todo.emoji = "🔥";
    todo.colorLabelId = "preset-red";
    todo.status = "done";
    todo.pinLocal = true;
    todo.pinGlobal = true;
    addSubtask(data, todo.id, "step 1", 2);
    addSubtask(data, todo.id, "step 2", 3);

    const copy = duplicateTodo(data, todo.id, 10) as Todo;
    expect(copy.id).not.toBe(todo.id);
    expect(copy.title).toBe("original");
    expect(copy.description).toBe("desc");
    expect(copy.emoji).toBe("🔥");
    expect(copy.colorLabelId).toBe("preset-red");
    expect(copy.status).toBe("open");
    expect(copy.pinLocal).toBe(false);
    expect(copy.pinGlobal).toBe(false);
    expect(copy.archived).toBe(false);
    expect(copy.createdAt).toBe(10);

    const copySubs = data.subtasks.filter((s) => s.todoId === copy.id);
    expect(copySubs.map((s) => s.text)).toEqual(["step 1", "step 2"]);
    expect(lastActivity(data, copy.id)).toBe('Created — duplicate of "original"');
    // original untouched
    expect(data.subtasks.filter((s) => s.todoId === todo.id)).toHaveLength(2);
  });

  it("places the copy right after the original", () => {
    const { data, listId, todo } = base();
    const after = createTodo(data, listId, null, "after", 2);
    const copy = duplicateTodo(data, todo.id, 3) as Todo;
    expect(copy.order).toBeGreaterThan(todo.order);
    expect(copy.order).toBeLessThan(after.order);
  });
});

describe("setColorLabel", () => {
  it("sets and clears", () => {
    const { data, todo } = base();
    setColorLabel(data, todo.id, "preset-blue", 2);
    expect(todo.colorLabelId).toBe("preset-blue");
    setColorLabel(data, todo.id, null, 3);
    expect(todo.colorLabelId).toBeNull();
  });
});
