import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { createGroup } from "./groups-ops";
import { createList } from "./lists-ops";
import { byOrder } from "./ordering";
import { placeNewTodo, placeTodoByStatus, statusPlacement } from "./status-order";
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

describe("placeNewTodo", () => {
  /** A scope shaped like a worked-on list: progress, open, then finished. */
  function worked(): { data: DomainData; listId: string } {
    const { data, listId } = base();
    const prog = createTodo(data, listId, null, "prog", 1);
    createTodo(data, listId, null, "open1", 2);
    createTodo(data, listId, null, "open2", 3);
    const done = createTodo(data, listId, null, "done", 4);
    const cancelled = createTodo(data, listId, null, "cancelled", 5);
    setStatus(data, prog.id, "progress", 6);
    setStatus(data, done.id, "done", 6);
    setStatus(data, cancelled.id, "cancelled", 6);
    return { data, listId };
  }

  it("puts a new todo under the in-progress ones", () => {
    const { data, listId } = worked();
    const fresh = createTodo(data, listId, null, "fresh", 7);
    expect(placeNewTodo(data, fresh.id, "top")).toBe(true);
    expect(scopeTitles(data, null)).toEqual([
      "prog", "fresh", "open1", "open2", "done", "cancelled",
    ]);
  });

  it("puts a new todo above the done and cancelled ones", () => {
    const { data, listId } = worked();
    const fresh = createTodo(data, listId, null, "fresh", 7);
    expect(placeNewTodo(data, fresh.id, "bottom")).toBe(true);
    expect(scopeTitles(data, null)).toEqual([
      "prog", "open1", "open2", "fresh", "done", "cancelled",
    ]);
  });

  it("lands after everything when nothing is finished", () => {
    const { data, listId } = base();
    createTodo(data, listId, null, "a", 1);
    createTodo(data, listId, null, "b", 2);
    const fresh = createTodo(data, listId, null, "fresh", 3);
    placeNewTodo(data, fresh.id, "bottom");
    expect(scopeTitles(data, null)).toEqual(["a", "b", "fresh"]);
  });

  it("goes first when nothing is in progress", () => {
    const { data, listId } = base();
    createTodo(data, listId, null, "a", 1);
    createTodo(data, listId, null, "b", 2);
    const fresh = createTodo(data, listId, null, "fresh", 3);
    placeNewTodo(data, fresh.id, "top");
    expect(scopeTitles(data, null)).toEqual(["fresh", "a", "b"]);
  });

  it("stays above a list where everything is done", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    const b = createTodo(data, listId, null, "b", 2);
    setStatus(data, a.id, "done", 3);
    setStatus(data, b.id, "cancelled", 3);
    const fresh = createTodo(data, listId, null, "fresh", 4);
    placeNewTodo(data, fresh.id, "bottom");
    expect(scopeTitles(data, null)).toEqual(["fresh", "a", "b"]);
  });

  it("stays below a list where everything is in progress", () => {
    const { data, listId } = base();
    const a = createTodo(data, listId, null, "a", 1);
    const b = createTodo(data, listId, null, "b", 2);
    setStatus(data, a.id, "progress", 3);
    setStatus(data, b.id, "progress", 3);
    const fresh = createTodo(data, listId, null, "fresh", 4);
    placeNewTodo(data, fresh.id, "top");
    expect(scopeTitles(data, null)).toEqual(["a", "b", "fresh"]);
  });

  it("ignores pinned rows — they render in their own section", () => {
    const { data, listId } = base();
    const pinned = createTodo(data, listId, null, "pinned", 1);
    const done = createTodo(data, listId, null, "done", 2);
    pinned.pinLocal = true;
    setStatus(data, done.id, "done", 3);
    const fresh = createTodo(data, listId, null, "fresh", 4);
    placeNewTodo(data, fresh.id, "bottom");
    // above "done", and the pinned row's position never entered the decision
    expect(scopeTitles(data, null)).toEqual(["pinned", "fresh", "done"]);
  });

  it("is a no-op for the first todo of a scope and for an unknown id", () => {
    const { data, listId } = base();
    const first = createTodo(data, listId, null, "first", 1);
    expect(placeNewTodo(data, first.id, "top")).toBe(false);
    expect(placeNewTodo(data, "nope", "bottom")).toBe(false);
  });

  it("only considers the todo's own group", () => {
    const { data, listId } = base();
    const group = createGroup(data, listId, null, "G") as Group;
    const rootDone = createTodo(data, listId, null, "root-done", 1);
    setStatus(data, rootDone.id, "done", 2);
    createTodo(data, listId, group.id, "g-open", 3);
    const fresh = createTodo(data, listId, group.id, "g-fresh", 4);
    placeNewTodo(data, fresh.id, "bottom");
    expect(scopeTitles(data, group.id)).toEqual(["g-open", "g-fresh"]);
    expect(scopeTitles(data, null)).toEqual(["root-done"]);
  });
});
