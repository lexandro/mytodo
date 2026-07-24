import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { createList, deleteList, renameList, reorderList } from "./lists-ops";
import { createTodo } from "./todos-ops";
import { emptyDomainData, type DomainData } from "./types";

function base(): DomainData {
  const data = emptyDomainData();
  ensureInbox(data);
  return data;
}

describe("createList", () => {
  it("appends after existing lists", () => {
    const data = base();
    const a = createList(data, "Work", "💼");
    const b = createList(data, "Home");
    expect(data.lists.map((l) => l.name)).toEqual(["Inbox", "Work", "Home"]);
    expect(a.order).toBeLessThan(b.order);
    expect(a.fixed).toBe(false);
  });
});

describe("renameList", () => {
  it("renames and optionally sets emoji", () => {
    const data = base();
    const list = createList(data, "Work");
    renameList(data, list.id, "Projects", "🗂️");
    expect(list.name).toBe("Projects");
    expect(list.emoji).toBe("🗂️");
    renameList(data, list.id, "Only name");
    expect(list.emoji).toBe("🗂️");
  });
});

describe("deleteList", () => {
  it("protects the fixed Inbox", () => {
    const data = base();
    deleteList(data, data.lists[0].id, 1);
    expect(data.lists).toHaveLength(1);
  });

  it("moves the list's todos to Inbox as trashed instead of destroying them", () => {
    const data = base();
    const inbox = data.lists[0];
    const list = createList(data, "Work");
    const todo = createTodo(data, list.id, null, "task", 1);
    deleteList(data, list.id, 2);
    expect(data.lists.map((l) => l.id)).toEqual([inbox.id]);
    expect(todo.trashed).toBe(true);
    expect(todo.listId).toBe(inbox.id);
    expect(todo.groupId).toBeNull();
  });

  it("drops the list's groups", () => {
    const data = base();
    const list = createList(data, "Work");
    data.groups.push({ id: "g", listId: list.id, parentId: null, name: "G", emoji: "", order: 1, collapsed: false });
    deleteList(data, list.id, 1);
    expect(data.groups).toHaveLength(0);
  });
});

describe("reorderList", () => {
  it("drops before / after the target", () => {
    const data = base();
    const a = createList(data, "A");
    const b = createList(data, "B");
    const c = createList(data, "C");
    reorderList(data, c.id, a.id, "before");
    const names = (): string[] => [...data.lists].sort((x, y) => x.order - y.order).map((l) => l.name);
    expect(names()).toEqual(["Inbox", "C", "A", "B"]);
    reorderList(data, c.id, b.id, "after");
    expect(names()).toEqual(["Inbox", "A", "B", "C"]);
  });
});
