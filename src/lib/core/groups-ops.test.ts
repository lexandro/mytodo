import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import {
  createGroup, deleteGroup, groupDepth, moveGroup, renameGroup,
  reorderGroup, subtreeHeight, toggleGroupCollapsed,
} from "./groups-ops";
import { createList } from "./lists-ops";
import { createTodo } from "./todos-ops";
import { emptyDomainData, type DomainData, type Group } from "./types";

function base(): { data: DomainData; listId: string } {
  const data = emptyDomainData();
  ensureInbox(data);
  const list = createList(data, "Work");
  return { data, listId: list.id };
}

function mustCreate(data: DomainData, listId: string, parentId: string | null, name: string): Group {
  const group = createGroup(data, listId, parentId, name);
  expect(group).not.toBeNull();
  return group as Group;
}

describe("createGroup / depth cap", () => {
  it("allows exactly 3 levels and rejects the 4th", () => {
    const { data, listId } = base();
    const g1 = mustCreate(data, listId, null, "L1");
    const g2 = mustCreate(data, listId, g1.id, "L2");
    const g3 = mustCreate(data, listId, g2.id, "L3");
    expect(groupDepth(data, g3.id)).toBe(3);
    expect(createGroup(data, listId, g3.id, "L4")).toBeNull();
    expect(data.groups).toHaveLength(3);
  });
});

describe("deleteGroup", () => {
  it("re-parents child groups and todos to the grandparent", () => {
    const { data, listId } = base();
    const g1 = mustCreate(data, listId, null, "L1");
    const g2 = mustCreate(data, listId, g1.id, "L2");
    const g3 = mustCreate(data, listId, g2.id, "L3");
    const todo = createTodo(data, listId, g2.id, "in g2", 1);
    deleteGroup(data, g2.id);
    expect(data.groups.map((g) => g.id)).toEqual([g1.id, g3.id]);
    expect(g3.parentId).toBe(g1.id);
    expect(todo.groupId).toBe(g1.id);
  });

  it("moves content to list root when a root group is deleted", () => {
    const { data, listId } = base();
    const g1 = mustCreate(data, listId, null, "L1");
    const todo = createTodo(data, listId, g1.id, "x", 1);
    deleteGroup(data, g1.id);
    expect(todo.groupId).toBeNull();
  });
});

describe("moveGroup", () => {
  it("rejects moves that would exceed the depth cap", () => {
    const { data, listId } = base();
    const a1 = mustCreate(data, listId, null, "A1");
    const a2 = mustCreate(data, listId, a1.id, "A2");
    const b1 = mustCreate(data, listId, null, "B1");
    const b2 = mustCreate(data, listId, b1.id, "B2");
    // moving A1 (height 2) under B2 (depth 2) would create depth 4
    expect(subtreeHeight(data, a1.id)).toBe(2);
    expect(moveGroup(data, a1.id, listId, b2.id)).toBe(false);
    expect(a1.parentId).toBeNull();
    // moving A2 (height 1) under B2 is legal (depth 3)
    expect(moveGroup(data, a2.id, listId, b2.id)).toBe(true);
    expect(a2.parentId).toBe(b2.id);
  });

  it("rejects cycles (group under its own descendant)", () => {
    const { data, listId } = base();
    const g1 = mustCreate(data, listId, null, "G1");
    const g2 = mustCreate(data, listId, g1.id, "G2");
    expect(moveGroup(data, g1.id, listId, g2.id)).toBe(false);
    expect(moveGroup(data, g1.id, listId, g1.id)).toBe(false);
  });

  it("moves the whole subtree (groups + todos) to another list", () => {
    const { data, listId } = base();
    const other = createList(data, "Other");
    const g1 = mustCreate(data, listId, null, "G1");
    const g2 = mustCreate(data, listId, g1.id, "G2");
    const todo = createTodo(data, listId, g2.id, "deep", 1);
    expect(moveGroup(data, g1.id, other.id, null)).toBe(true);
    expect(g1.listId).toBe(other.id);
    expect(g2.listId).toBe(other.id);
    expect(todo.listId).toBe(other.id);
    expect(todo.groupId).toBe(g2.id);
  });
});

describe("reorderGroup", () => {
  it("reorders among same-parent siblings only", () => {
    const { data, listId } = base();
    const a = mustCreate(data, listId, null, "A");
    const b = mustCreate(data, listId, null, "B");
    const child = mustCreate(data, listId, a.id, "child");
    reorderGroup(data, b.id, a.id, "before");
    expect(b.order).toBeLessThan(a.order);
    const before = child.order;
    reorderGroup(data, child.id, a.id, "before"); // different parent: no-op
    expect(child.order).toBe(before);
  });
});

describe("rename / collapse", () => {
  it("renames and toggles collapse", () => {
    const { data, listId } = base();
    const g = mustCreate(data, listId, null, "Old");
    renameGroup(data, g.id, "New", "📁");
    expect(g.name).toBe("New");
    expect(g.emoji).toBe("📁");
    toggleGroupCollapsed(data, g.id);
    expect(g.collapsed).toBe(true);
  });
});
