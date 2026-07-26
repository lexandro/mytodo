import { describe, expect, it } from "vitest";
import { diffDomain } from "./diff";
import { emptyDomainData, type DomainData, type List, type Todo } from "./types";

function list(id: string, name = "L"): List {
  return { id, name, emoji: "", fixed: false, colorLabelId: null, order: 1000 };
}

function todo(id: string, listId: string, title = "T"): Todo {
  return {
    id, listId, groupId: null, parentId: null, title, description: "", status: "open",
    emoji: "", colorLabelId: null, pinLocal: false, pinGlobal: false,
    archived: false, trashed: false, trashedAt: null,
    order: 1000, createdAt: 1, updatedAt: 1,
  };
}

function data(partial: Partial<DomainData>): DomainData {
  return { ...emptyDomainData(), ...partial };
}

describe("diffDomain", () => {
  it("returns no ops for identical snapshots", () => {
    const a = data({ lists: [list("l1")], todos: [todo("t1", "l1")] });
    const b = data({ lists: [list("l1")], todos: [todo("t1", "l1")] });
    expect(diffDomain(a, b)).toEqual([]);
  });

  it("emits puts for new rows", () => {
    const prev = data({});
    const next = data({ lists: [list("l1")], todos: [todo("t1", "l1")] });
    const ops = diffDomain(prev, next);
    expect(ops).toHaveLength(2);
    expect(ops[0]).toEqual({ kind: "putList", row: list("l1") });
    expect(ops[1]).toEqual({ kind: "putTodo", row: todo("t1", "l1") });
  });

  it("emits a put only for the changed row", () => {
    const prev = data({ todos: [todo("t1", "l1"), todo("t2", "l1")] });
    const changed = { ...todo("t2", "l1"), title: "renamed" };
    const next = data({ todos: [todo("t1", "l1"), changed] });
    expect(diffDomain(prev, next)).toEqual([{ kind: "putTodo", row: changed }]);
  });

  it("emits dels for removed rows", () => {
    const prev = data({ lists: [list("l1")], todos: [todo("t1", "l1")] });
    const next = data({ lists: [list("l1")] });
    expect(diffDomain(prev, next)).toEqual([{ kind: "delTodo", id: "t1" }]);
  });

  it("ignores array order changes (order lives in the rows)", () => {
    const prev = data({ todos: [todo("t1", "l1"), todo("t2", "l1")] });
    const next = data({ todos: [todo("t2", "l1"), todo("t1", "l1")] });
    expect(diffDomain(prev, next)).toEqual([]);
  });

  it("covers every table in one batch", () => {
    const prev = data({});
    const next: DomainData = {
      lists: [list("l1")],
      groups: [{ id: "g1", listId: "l1", parentId: null, name: "G", emoji: "", order: 1000, collapsed: false }],
      todos: [todo("t1", "l1")],
      subtasks: [{ id: "s1", todoId: "t1", text: "x", checked: false, order: 1000 }],
      activity: [{ id: "a1", todoId: "t1", type: "created", summary: "Created", createdAt: 1 }],
      colorLabels: [{ id: "c1", kind: "todo", name: null, color: "#fff", order: 1000 }],
      labelNames: [{ id: "l1::c1", listId: "l1", labelId: "c1", name: "Urgent" }],
    };
    const kinds = diffDomain(prev, next).map((op) => op.kind);
    expect(kinds).toEqual([
      "putList", "putGroup", "putTodo", "putSubtask", "putActivity", "putLabel", "putLabelName",
    ]);
  });
});
