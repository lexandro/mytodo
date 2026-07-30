import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { moveMany, moveManyInScope, nestMany, reorderMany } from "./bulk-move";
import { createList } from "./lists-ops";
import { createTodo, findTodo, scopeSiblings } from "./todos-ops";
import { nestTodo } from "./todos-tree-ops";
import { emptyDomainData, type DomainData } from "./types";

/** Four top-level todos, "a" … "d", in one list. */
function base(): { data: DomainData; listId: string; ids: Record<string, string> } {
  const data = emptyDomainData();
  ensureInbox(data);
  const list = createList(data, "Work");
  const ids: Record<string, string> = {};
  ["a", "b", "c", "d"].forEach((title, i) => {
    ids[title] = createTodo(data, list.id, null, title, i + 1).id;
  });
  return { data, listId: list.id, ids };
}

/** Top-level titles of a list, in render order. */
function titlesIn(data: DomainData, listId: string): string[] {
  return scopeSiblings(data, listId, null, null).map((t) => t.title);
}

describe("moveMany", () => {
  it("moves the selection to another list in row order", () => {
    const { data, listId, ids } = base();
    const target = createList(data, "Home");
    expect(moveMany(data, [ids.a, ids.c], target.id, null, 10)).toBe(2);
    expect(titlesIn(data, target.id)).toEqual(["a", "c"]);
    expect(titlesIn(data, listId)).toEqual(["b", "d"]);
  });

  it("does not churn rows that are already at the destination", () => {
    const { data, listId, ids } = base();
    expect(moveMany(data, [ids.a], listId, null, 10)).toBe(0);
  });

  it("takes a sub-item along with its parent instead of flattening it", () => {
    const { data, ids } = base();
    const target = createList(data, "Home");
    nestTodo(data, ids.b, ids.a, 5);
    expect(moveMany(data, [ids.a, ids.b], target.id, null, 10)).toBe(1); // roots only
    expect(findTodo(data, ids.b)?.listId).toBe(target.id);
    expect(findTodo(data, ids.b)?.parentId).toBe(ids.a);
  });
});

describe("reorderMany", () => {
  it("drops the block in its own order", () => {
    const { data, listId, ids } = base();
    expect(reorderMany(data, [ids.a, ids.c], ids.d, "after", 10)).toBe(2);
    expect(titlesIn(data, listId)).toEqual(["b", "d", "a", "c"]);
  });

  it("keeps the order when dropping before a row", () => {
    const { data, listId, ids } = base();
    reorderMany(data, [ids.c, ids.d], ids.a, "before", 10);
    expect(titlesIn(data, listId)).toEqual(["c", "d", "a", "b"]);
  });

  it("refuses to drop a branch inside itself", () => {
    const { data, ids } = base();
    nestTodo(data, ids.b, ids.a, 5);
    expect(reorderMany(data, [ids.a], ids.b, "after", 10)).toBe(0);
  });
});

describe("nestMany", () => {
  it("puts every selected row under the target", () => {
    const { data, ids } = base();
    expect(nestMany(data, [ids.a, ids.b], ids.d, 10)).toEqual({ nested: 2, blocked: 0 });
    expect(findTodo(data, ids.a)?.parentId).toBe(ids.d);
    expect(findTodo(data, ids.b)?.parentId).toBe(ids.d);
  });

  it("reports the rows the depth cap turns away", () => {
    const { data, ids } = base();
    nestTodo(data, ids.b, ids.a, 5);
    nestTodo(data, ids.c, ids.b, 6); // a → b → c is already the full depth
    expect(nestMany(data, [ids.a], ids.d, 10)).toEqual({ nested: 0, blocked: 1 });
    expect(findTodo(data, ids.a)?.parentId).toBeNull();
  });

  it("skips the target itself and rows already under it", () => {
    const { data, ids } = base();
    nestTodo(data, ids.b, ids.a, 5);
    expect(nestMany(data, [ids.a, ids.b], ids.a, 10)).toEqual({ nested: 0, blocked: 0 });
  });
});

describe("moveManyInScope", () => {
  it("steps a whole block up as one", () => {
    const { data, listId, ids } = base();
    expect(moveManyInScope(data, [ids.c, ids.d], "up", 10)).toBe(2);
    expect(titlesIn(data, listId)).toEqual(["a", "c", "d", "b"]);
  });

  it("steps a whole block down as one", () => {
    const { data, listId, ids } = base();
    moveManyInScope(data, [ids.a, ids.b], "down", 10);
    expect(titlesIn(data, listId)).toEqual(["c", "a", "b", "d"]);
  });

  it("reports that nothing moved at the edge of the list", () => {
    const { data, listId, ids } = base();
    expect(moveManyInScope(data, [ids.a], "up", 10)).toBe(0);
    expect(titlesIn(data, listId)).toEqual(["a", "b", "c", "d"]);
  });

  // the block must not shuffle itself when one of its rows has nowhere to go —
  // that used to swap the pair and then flip-flop forever
  it("refuses to move at all once the block reaches the top", () => {
    const { data, listId, ids } = base();
    expect(moveManyInScope(data, [ids.a, ids.b], "up", 10)).toBe(0);
    expect(titlesIn(data, listId)).toEqual(["a", "b", "c", "d"]);
    expect(moveManyInScope(data, [ids.a, ids.b], "up", 11)).toBe(0);
    expect(titlesIn(data, listId)).toEqual(["a", "b", "c", "d"]);
  });

  it("refuses to move at all once the block reaches the bottom", () => {
    const { data, listId, ids } = base();
    expect(moveManyInScope(data, [ids.c, ids.d], "down", 10)).toBe(0);
    expect(titlesIn(data, listId)).toEqual(["a", "b", "c", "d"]);
  });

  it("still moves back the other way after hitting an edge", () => {
    const { data, listId, ids } = base();
    moveManyInScope(data, [ids.a, ids.b], "up", 10); // refused
    expect(moveManyInScope(data, [ids.a, ids.b], "down", 11)).toBe(2);
    expect(titlesIn(data, listId)).toEqual(["c", "a", "b", "d"]);
    expect(moveManyInScope(data, [ids.a, ids.b], "up", 12)).toBe(2);
    expect(titlesIn(data, listId)).toEqual(["a", "b", "c", "d"]);
  });

  it("holds a non-contiguous selection together at the edge", () => {
    const { data, listId, ids } = base();
    // "a" cannot go up, so "c" must not sneak past "b" on its own
    expect(moveManyInScope(data, [ids.a, ids.c], "up", 10)).toBe(0);
    expect(titlesIn(data, listId)).toEqual(["a", "b", "c", "d"]);
  });

  it("moves as one block even when the caller's ids are out of row order", () => {
    const { data, listId, ids } = base();
    expect(moveManyInScope(data, [ids.b, ids.a], "down", 10)).toBe(2);
    expect(titlesIn(data, listId)).toEqual(["c", "a", "b", "d"]);
  });
});
