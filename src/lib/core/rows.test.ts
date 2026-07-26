import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { createGroup } from "./groups-ops";
import { createList } from "./lists-ops";
import { buildPaneRows, listOpenCount } from "./rows";
import { setArchived } from "./todos-detail-ops";
import { createTodo, setStatus, trashTodo } from "./todos-ops";
import { nestTodo } from "./todos-tree-ops";
import { emptyDomainData, type DomainData, type Group } from "./types";

function base(): { data: DomainData; listId: string } {
  const data = emptyDomainData();
  ensureInbox(data);
  const list = createList(data, "Work");
  return { data, listId: list.id };
}

function rowKinds(data: DomainData, listId: string, archivedOpen = false): string[] {
  return buildPaneRows(data, { listId, archivedOpen }).rows.map((r) =>
    r.kind === "section" ? `sec:${r.label}` : r.kind === "group" ? `g:${r.group.name}` : `t:${r.todo.title}`,
  );
}

/** Indentation of the todo rows only — the sub-item nesting made visible. */
function todoDepths(data: DomainData, listId: string, archivedOpen = false): number[] {
  return buildPaneRows(data, { listId, archivedOpen }).rows
    .filter((r) => r.kind === "todo")
    .map((r) => (r.kind === "todo" ? r.depth : -1));
}

describe("buildPaneRows", () => {
  it("renders pinned section, group tree, root todos, archived section", () => {
    const { data, listId } = base();
    const g1 = createGroup(data, listId, null, "Backend") as Group;
    const g2 = createGroup(data, listId, g1.id, "Auth") as Group;
    createTodo(data, listId, g2.id, "deep", 1);
    createTodo(data, listId, null, "root", 2);
    const pinnedTodo = createTodo(data, listId, null, "pinned", 3);
    pinnedTodo.pinLocal = true;
    const archivedTodo = createTodo(data, listId, null, "old", 4);
    archivedTodo.archived = true;

    expect(rowKinds(data, listId)).toEqual([
      "sec:Pinned", "t:pinned",
      "g:Backend", "g:Auth", "t:deep",
      "t:root",
      "sec:Archived",
    ]);
    expect(rowKinds(data, listId, true)).toContain("t:old");
  });

  it("collapsed groups hide their subtree", () => {
    const { data, listId } = base();
    const g1 = createGroup(data, listId, null, "G") as Group;
    createTodo(data, listId, g1.id, "hidden", 1);
    g1.collapsed = true;
    expect(rowKinds(data, listId)).toEqual(["g:G"]);
  });

  it("excludes trashed todos everywhere", () => {
    const { data, listId } = base();
    const t = createTodo(data, listId, null, "x", 1);
    trashTodo(data, t.id, 2);
    expect(rowKinds(data, listId)).toEqual([]);
  });

  it("filter prunes non-matching branches and force-expands", () => {
    const { data, listId } = base();
    const g1 = createGroup(data, listId, null, "Backend") as Group;
    const g2 = createGroup(data, listId, null, "Frontend") as Group;
    g1.collapsed = true;
    createTodo(data, listId, g1.id, "api timeout", 1);
    createTodo(data, listId, g2.id, "button color", 2);
    const { rows, visibleTodoIds } = buildPaneRows(data, {
      listId, archivedOpen: false,
      matches: (t) => t.title.includes("timeout"),
    });
    expect(rows.map((r) => (r.kind === "group" ? r.group.name : r.kind))).toEqual(["Backend", "todo"]);
    expect(visibleTodoIds).toHaveLength(1);
  });

  it("renders sub-items under their parent, indented one level", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    const grandchild = createTodo(data, listId, null, "grandchild", 3);
    const after = createTodo(data, listId, null, "after", 4);
    nestTodo(data, child.id, parent.id, 5);
    nestTodo(data, grandchild.id, child.id, 6);

    expect(rowKinds(data, listId)).toEqual([
      "t:parent", "t:child", "t:grandchild", "t:after",
    ]);
    expect(todoDepths(data, listId)).toEqual([0, 1, 2, 0]);
  });

  it("indents sub-items relative to their group", () => {
    const { data, listId } = base();
    const group = createGroup(data, listId, null, "G") as Group;
    const parent = createTodo(data, listId, group.id, "parent", 1);
    const child = createTodo(data, listId, group.id, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    // group sits at depth 0, so its todos start at 1 and the sub-item at 2
    expect(todoDepths(data, listId)).toEqual([1, 2]);
  });

  it("keeps a pinned todo's sub-items with it instead of leaving them behind", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    parent.pinLocal = true;

    expect(rowKinds(data, listId)).toEqual(["sec:Pinned", "t:parent", "t:child"]);
    expect(todoDepths(data, listId)).toEqual([0, 1]);
  });

  it("hides a sub-item whose parent is trashed", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    trashTodo(data, parent.id, 4); // cascades to the child
    expect(rowKinds(data, listId)).toEqual([]);
  });

  it("keeps a matching sub-item's parent as context when filtering", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "api timeout", 2);
    createTodo(data, listId, null, "unrelated", 3);
    nestTodo(data, child.id, parent.id, 4);
    const { rows } = buildPaneRows(data, {
      listId, archivedOpen: false,
      matches: (t) => t.title.includes("timeout"),
    });
    expect(rows.map((r) => (r.kind === "todo" ? r.todo.title : r.kind))).toEqual([
      "parent", "api timeout",
    ]);
  });

  it("archives a branch into the Archived section as one tree", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    nestTodo(data, child.id, parent.id, 3);
    setArchived(data, parent.id, true, 4);
    expect(rowKinds(data, listId, true)).toEqual(["sec:Archived", "t:parent", "t:child"]);
    expect(todoDepths(data, listId, true)).toEqual([0, 1]);
  });

  it("hides the branch of a collapsed todo but keeps the todo itself", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    const grandchild = createTodo(data, listId, null, "grandchild", 3);
    const after = createTodo(data, listId, null, "after", 4);
    nestTodo(data, child.id, parent.id, 5);
    nestTodo(data, grandchild.id, child.id, 6);
    parent.collapsed = true;

    expect(rowKinds(data, listId)).toEqual(["t:parent", "t:after"]);
    // keyboard navigation skips what the caret hides
    const { visibleTodoIds } = buildPaneRows(data, { listId, archivedOpen: false });
    expect(visibleTodoIds).toEqual([parent.id, after.id]);
  });

  it("reports the whole subtree size and open state for the caret", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    const grandchild = createTodo(data, listId, null, "grandchild", 3);
    const leaf = createTodo(data, listId, null, "leaf", 4);
    nestTodo(data, child.id, parent.id, 5);
    nestTodo(data, grandchild.id, child.id, 6);

    const todoRows = buildPaneRows(data, { listId, archivedOpen: false }).rows
      .filter((r) => r.kind === "todo")
      .map((r) => (r.kind === "todo" ? { title: r.todo.title, childCount: r.childCount, open: r.open } : null));
    expect(todoRows).toEqual([
      { title: "parent", childCount: 2, open: true },
      { title: "child", childCount: 1, open: true },
      { title: "grandchild", childCount: 0, open: true },
      { title: leaf.title, childCount: 0, open: true },
    ]);
  });

  it("counts only the rows the caret would actually hide", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "child", 2);
    const grandchild = createTodo(data, listId, null, "grandchild", 3);
    nestTodo(data, child.id, parent.id, 4);
    nestTodo(data, grandchild.id, child.id, 5);
    child.collapsed = true; // the grandchild is already out of sight

    const parentRow = buildPaneRows(data, { listId, archivedOpen: false }).rows
      .find((r) => r.kind === "todo" && r.todo.id === parent.id);
    expect(parentRow?.kind === "todo" ? parentRow.childCount : -1).toBe(1);
  });

  it("force-expands a collapsed branch while filtering", () => {
    const { data, listId } = base();
    const parent = createTodo(data, listId, null, "parent", 1);
    const child = createTodo(data, listId, null, "api timeout", 2);
    nestTodo(data, child.id, parent.id, 3);
    parent.collapsed = true;
    const { rows } = buildPaneRows(data, {
      listId, archivedOpen: false,
      matches: (t) => t.title.includes("timeout"),
    });
    expect(rows.map((r) => (r.kind === "todo" ? r.todo.title : r.kind))).toEqual([
      "parent", "api timeout",
    ]);
  });

  it("visibleTodoIds follows render order for keyboard navigation", () => {
    const { data, listId } = base();
    const g = createGroup(data, listId, null, "G") as Group;
    const inGroup = createTodo(data, listId, g.id, "a", 1);
    const root = createTodo(data, listId, null, "b", 2);
    const pinned = createTodo(data, listId, null, "c", 3);
    pinned.pinGlobal = true;
    const { visibleTodoIds } = buildPaneRows(data, { listId, archivedOpen: false });
    expect(visibleTodoIds).toEqual([pinned.id, inGroup.id, root.id]);
  });
});

describe("listOpenCount", () => {
  it("counts open + in-progress, excludes done/cancelled/trashed/archived", () => {
    const { data, listId } = base();
    createTodo(data, listId, null, "open", 1);
    const prog = createTodo(data, listId, null, "prog", 2);
    setStatus(data, prog.id, "progress", 3);
    const done = createTodo(data, listId, null, "done", 4);
    setStatus(data, done.id, "done", 5);
    const trashed = createTodo(data, listId, null, "gone", 6);
    trashTodo(data, trashed.id, 7);
    const archived = createTodo(data, listId, null, "arch", 8);
    archived.archived = true;
    expect(listOpenCount(data, listId)).toBe(2);
  });
});
