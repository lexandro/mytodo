import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { createGroup } from "./groups-ops";
import { createList } from "./lists-ops";
import { buildPaneRows, listOpenCount } from "./rows";
import { createTodo, setStatus, trashTodo } from "./todos-ops";
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
