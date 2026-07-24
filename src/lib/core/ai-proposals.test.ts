import { describe, expect, it } from "vitest";
import { parseProposal, parseProposalAction, parseProposals } from "./ai-proposals";

describe("parseProposalAction", () => {
  it("parses every supported kind", () => {
    expect(parseProposalAction({ kind: "createTodo", listId: "l1", title: " New todo " }))
      .toEqual({ kind: "createTodo", listId: "l1", groupId: null, title: "New todo", description: "" });
    expect(parseProposalAction({ kind: "updateTodo", todoId: "t1", title: "Renamed" }))
      .toEqual({ kind: "updateTodo", todoId: "t1", title: "Renamed", description: null });
    expect(parseProposalAction({ kind: "changeStatus", todoId: "t1", status: "done" }))
      .toEqual({ kind: "changeStatus", todoId: "t1", status: "done" });
    expect(parseProposalAction({ kind: "addSubtask", todoId: "t1", text: "Write tests" }))
      .toEqual({ kind: "addSubtask", todoId: "t1", text: "Write tests" });
    expect(parseProposalAction({ kind: "updateSubtask", subtaskId: "s1", checked: true }))
      .toEqual({ kind: "updateSubtask", subtaskId: "s1", text: null, checked: true });
    expect(parseProposalAction({ kind: "moveTodo", todoId: "t1", listId: "l2", groupId: "g1" }))
      .toEqual({ kind: "moveTodo", todoId: "t1", listId: "l2", groupId: "g1" });
    expect(parseProposalAction({ kind: "archiveTodo", todoId: "t1" }))
      .toEqual({ kind: "archiveTodo", todoId: "t1" });
  });

  it("rejects unknown kinds instead of crashing (aiprompt §24)", () => {
    expect(parseProposalAction({ kind: "dropTable", table: "todos" })).toBeNull();
    expect(parseProposalAction({ kind: "runSql", sql: "DELETE FROM todos" })).toBeNull();
    expect(parseProposalAction(null)).toBeNull();
    expect(parseProposalAction("archiveTodo")).toBeNull();
  });

  it("rejects incomplete shapes per kind", () => {
    expect(parseProposalAction({ kind: "createTodo", listId: "l1", title: "   " })).toBeNull();
    expect(parseProposalAction({ kind: "changeStatus", todoId: "t1", status: "blocked" })).toBeNull();
    expect(parseProposalAction({ kind: "addSubtask", todoId: "t1" })).toBeNull();
    expect(parseProposalAction({ kind: "updateTodo", todoId: "t1" })).toBeNull(); // empty update
    expect(parseProposalAction({ kind: "moveTodo", todoId: "t1" })).toBeNull();
  });
});

describe("parseProposal / parseProposals", () => {
  const valid = {
    id: "p1",
    label: 'Add subtask "Write tests"',
    recommended: true,
    applied: false,
    action: { kind: "addSubtask", todoId: "t1", text: "Write tests" },
  };

  it("keeps a full valid proposal", () => {
    const p = parseProposal(valid);
    expect(p).not.toBeNull();
    expect(p?.recommended).toBe(true);
    expect(p?.action.kind).toBe("addSubtask");
  });

  it("defaults missing flags to false", () => {
    const p = parseProposal({ id: "p1", label: "x", action: valid.action });
    expect(p?.recommended).toBe(false);
    expect(p?.applied).toBe(false);
  });

  it("drops proposals with a broken action but keeps valid siblings", () => {
    const list = parseProposals([
      valid,
      { id: "p2", label: "bad", action: { kind: "runSql", sql: "DROP TABLE todos" } },
      { id: "p3", label: "", action: valid.action },
      "garbage",
    ]);
    expect(list.map((p) => p.id)).toEqual(["p1"]);
  });

  it("returns empty for non-array input", () => {
    expect(parseProposals({})).toEqual([]);
    expect(parseProposals(null)).toEqual([]);
  });
});
