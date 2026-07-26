import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { createGroup } from "./groups-ops";
import { createList } from "./lists-ops";
import { byOrder } from "./ordering";
import { placeTodoByStatus, statusPlacement } from "./status-order";
import { createTodo, setStatus } from "./todos-ops";
import { emptyDomainData, type DomainData, type Group } from "./types";

function base(): { data: DomainData; listId: string } {
  const data = emptyDomainData();
  ensureInbox(data);
  const list = createList(data, "Work");
  return { data, listId: list.id };
}

/** Titles of one scope in render order — what the pane would show. */
function scopeTitles(data: DomainData, groupId: string | null): string[] {
  return data.todos
    .filter((t) => t.groupId === groupId && !t.trashed && !t.archived)
    .sort(byOrder)
    .map((t) => t.title);
}

describe("statusPlacement", () => {
  it("sends in progress to the top and done/cancelled to the bottom", () => {
    expect(statusPlacement("progress")).toBe("top");
    expect(statusPlacement("done")).toBe("bottom");
    expect(statusPlacement("cancelled")).toBe("bottom");
  });

  it("leaves open todos where the user put them", () => {
    expect(statusPlacement("open")).toBe("none");
  });
});

describe("placeTodoByStatus", () => {
  it("lifts an in-progress todo to the top of its scope", () => {
    const { data, listId } = base();
    createTodo(data, listId, null, "a", 1);
    createTodo(data, listId, null, "b", 2);
    const c = createTodo(data, listId, null, "c", 3);
    setStatus(data, c.id, "progress", 4);
    expect(placeTodoByStatus(data, c.id, 4)).toBe(true);
    expect(scopeTitles(data, null)).toEqual(["c", "a", "b"]);
  });

  it("sinks a done todo to the bottom of its scope", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    createTodo(data, listId, null, "b", 2);
    createTodo(data, listId, null, "c", 3);
    setStatus(data, a.id, "done", 4);
    placeTodoByStatus(data, a.id, 4);
    expect(scopeTitles(data, null)).toEqual(["b", "c", "a"]);
  });

  it("sinks a cancelled todo the same way as a done one", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    createTodo(data, listId, null, "b", 2);
    setStatus(data, a.id, "cancelled", 3);
    placeTodoByStatus(data, a.id, 3);
    expect(scopeTitles(data, null)).toEqual(["b", "a"]);
  });

  it("moves inside the group and never out of it", () => {
    const { data, listId } = base();
    const group = createGroup(data, listId, null, "G") as Group;
    createTodo(data, listId, null, "root", 1);
    createTodo(data, listId, group.id, "g1", 2);
    const g2 = createTodo(data, listId, group.id, "g2", 3);
    setStatus(data, g2.id, "progress", 4);
    placeTodoByStatus(data, g2.id, 4);
    expect(g2.groupId).toBe(group.id);
    expect(scopeTitles(data, group.id)).toEqual(["g2", "g1"]);
    expect(scopeTitles(data, null)).toEqual(["root"]);
  });

  it("does nothing for an open todo", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    createTodo(data, listId, null, "b", 2);
    expect(placeTodoByStatus(data, a.id, 3)).toBe(false);
    expect(scopeTitles(data, null)).toEqual(["a", "b"]);
  });

  it("leaves pinned todos alone — the Pinned section is their home", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    createTodo(data, listId, null, "b", 2);
    a.pinLocal = true;
    setStatus(data, a.id, "done", 3);
    expect(placeTodoByStatus(data, a.id, 3)).toBe(false);
    expect(scopeTitles(data, null)).toEqual(["a", "b"]);
  });

  it("leaves archived todos alone — they are not part of the scope", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    createTodo(data, listId, null, "b", 2);
    a.archived = true;
    setStatus(data, a.id, "done", 3);
    expect(placeTodoByStatus(data, a.id, 3)).toBe(false);
  });

  it("is a no-op when the todo already sits at that edge", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    createTodo(data, listId, null, "b", 2);
    setStatus(data, a.id, "progress", 3);
    const order = a.order;
    expect(placeTodoByStatus(data, a.id, 3)).toBe(false);
    expect(a.order).toBe(order);
  });

  it("is a no-op for a lone todo and for an unknown id", () => {
    const { data, listId } = base();
    const only = createTodo(data, listId, null, "only", 1);
    setStatus(data, only.id, "done", 2);
    expect(placeTodoByStatus(data, only.id, 2)).toBe(false);
    expect(placeTodoByStatus(data, "nope", 2)).toBe(false);
  });

  it("stamps updatedAt on a real move", () => {
    const { data, listId } = base();
    createTodo(data, listId, null, "a", 1);
    const b = createTodo(data, listId, null, "b", 2);
    setStatus(data, b.id, "progress", 3);
    placeTodoByStatus(data, b.id, 99);
    expect(b.updatedAt).toBe(99);
  });
});
