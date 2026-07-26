import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { createList } from "./lists-ops";
import {
  canNest, childrenOf, indentCheck, isSelfOrAncestor, subtreeHeight, subtreeOf, todoDepth,
} from "./todo-tree";
import { createTodo } from "./todos-ops";
import { nestTodo } from "./todos-tree-ops";
import { emptyDomainData, type DomainData, type Todo } from "./types";

function base(): { data: DomainData; listId: string } {
  const data = emptyDomainData();
  ensureInbox(data);
  const list = createList(data, "Work");
  return { data, listId: list.id };
}

/** a → b → c chain plus a loose sibling, the shape most tests need. */
function chain(): { data: DomainData; listId: string; a: Todo; b: Todo; c: Todo; loose: Todo } {
  const { data, listId } = base();
  const a = createTodo(data, listId, null, "a", 1);
  const b = createTodo(data, listId, null, "b", 2);
  const c = createTodo(data, listId, null, "c", 3);
  const loose = createTodo(data, listId, null, "loose", 4);
  nestTodo(data, b.id, a.id, 5);
  nestTodo(data, c.id, b.id, 6);
  return { data, listId, a, b, c, loose };
}

describe("childrenOf", () => {
  it("returns direct children in order, not grandchildren", () => {
    const { data, a, b } = chain();
    expect(childrenOf(data, a.id).map((t) => t.title)).toEqual(["b"]);
    expect(childrenOf(data, b.id).map((t) => t.title)).toEqual(["c"]);
  });
});

describe("todoDepth", () => {
  it("counts 1 for a top-level todo and one more per parent hop", () => {
    const { data, a, b, c } = chain();
    expect(todoDepth(data, a.id)).toBe(1);
    expect(todoDepth(data, b.id)).toBe(2);
    expect(todoDepth(data, c.id)).toBe(3);
  });

  it("terminates on a corrupted parent cycle", () => {
    const { data, a, b } = chain();
    a.parentId = b.id; // only reachable through a broken import
    expect(todoDepth(data, a.id)).toBeLessThanOrEqual(3);
  });
});

describe("subtreeOf / subtreeHeight", () => {
  it("lists the todo and every descendant, parents first", () => {
    const { data, a } = chain();
    expect(subtreeOf(data, a.id).map((t) => t.title)).toEqual(["a", "b", "c"]);
  });

  it("measures how many levels the branch spans", () => {
    const { data, a, b, c, loose } = chain();
    expect(subtreeHeight(data, a.id)).toBe(3);
    expect(subtreeHeight(data, b.id)).toBe(2);
    expect(subtreeHeight(data, c.id)).toBe(1);
    expect(subtreeHeight(data, loose.id)).toBe(1);
  });

  it("is empty for an unknown id", () => {
    const { data } = chain();
    expect(subtreeOf(data, "nope")).toEqual([]);
  });
});

describe("isSelfOrAncestor", () => {
  it("recognises the todo itself and everything above it", () => {
    const { data, a, b, c, loose } = chain();
    expect(isSelfOrAncestor(data, c.id, c.id)).toBe(true);
    expect(isSelfOrAncestor(data, c.id, a.id)).toBe(true);
    expect(isSelfOrAncestor(data, a.id, c.id)).toBe(false);
    expect(isSelfOrAncestor(data, loose.id, a.id)).toBe(false);
  });
});

describe("canNest", () => {
  it("refuses a todo into itself or into its own subtree", () => {
    const { data, a, b, c } = chain();
    expect(canNest(data, a.id, a.id)).toBe(false);
    expect(canNest(data, a.id, b.id)).toBe(false);
    expect(canNest(data, a.id, c.id)).toBe(false);
  });

  it("refuses what would push the branch past the depth cap", () => {
    const { data, c, loose } = chain();
    // loose would become level 4 under c
    expect(canNest(data, loose.id, c.id)).toBe(false);
  });

  it("counts the moved subtree's own height against the cap", () => {
    const { data, listId, a, b } = chain();
    const other = createTodo(data, listId, null, "other", 7);
    const otherChild = createTodo(data, listId, null, "other-child", 8);
    nestTodo(data, otherChild.id, other.id, 9);
    // "other" is 2 levels tall: fits under a (→2,3) but not under b (→3,4)
    expect(canNest(data, other.id, a.id)).toBe(true);
    expect(canNest(data, other.id, b.id)).toBe(false);
  });

  it("refuses a trashed or unknown parent", () => {
    const { data, a, loose } = chain();
    a.trashed = true;
    expect(canNest(data, loose.id, a.id)).toBe(false);
    expect(canNest(data, loose.id, "nope")).toBe(false);
  });
});

describe("indentCheck", () => {
  it("points at the preceding sibling", () => {
    const { data, listId } = base();
    createTodo(data, listId, null, "first", 1);
    const second = createTodo(data, listId, null, "second", 2);
    const check = indentCheck(data, second.id);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.target.title).toBe("first");
  });

  it("reports no-sibling for the first todo of a scope", () => {
    const { data, listId } = base();
    const first = createTodo(data, listId, null, "first", 1);
    createTodo(data, listId, null, "second", 2);
    expect(indentCheck(data, first.id)).toEqual({ ok: false, reason: "no-sibling" });
    expect(indentCheck(data, "nope")).toEqual({ ok: false, reason: "no-sibling" });
  });

  it("reports too-deep when the cap blocks the move", () => {
    const { data, listId, b, c } = chain();
    // a sibling of c, so both sit at level 3 — indenting would make level 4
    const sibling = createTodo(data, listId, null, "sibling", 7);
    expect(nestTodo(data, sibling.id, b.id, 8)).toBe(true);
    expect(todoDepth(data, sibling.id)).toBe(3);
    expect(childrenOf(data, b.id).map((t) => t.id)).toEqual([c.id, sibling.id]);
    expect(indentCheck(data, sibling.id)).toEqual({ ok: false, reason: "too-deep" });
  });

  it("only considers siblings of the same scope", () => {
    const { data, a, b } = chain();
    // b is a's only child — nothing precedes it under a
    expect(indentCheck(data, b.id)).toEqual({ ok: false, reason: "no-sibling" });
    expect(childrenOf(data, a.id)).toHaveLength(1);
  });
});
