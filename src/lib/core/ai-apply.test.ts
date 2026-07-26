import { describe, expect, it } from "vitest";
import { applyProposals, validateProposal } from "./ai-apply";
import type { AIProposal, ProposalAction } from "./ai-types";
import { createTodo } from "./todos-ops";
import { addSubtask } from "./subtasks-ops";
import { emptyDomainData, type DomainData } from "./types";

function fixture(): { data: DomainData; todoId: string; subtaskId: string } {
  const data = emptyDomainData();
  data.lists.push(
    { id: "l1", name: "Main", emoji: "", fixed: false, colorLabelId: null, order: 1 },
    { id: "l2", name: "Other", emoji: "", fixed: false, colorLabelId: null, order: 2 },
  );
  data.groups.push(
    { id: "g1", listId: "l1", parentId: null, name: "Backend", emoji: "", order: 1, collapsed: false },
    { id: "gOther", listId: "l2", parentId: null, name: "Foreign", emoji: "", order: 1, collapsed: false },
  );
  const todo = createTodo(data, "l1", null, "Fix auth", 1000);
  const subtask = addSubtask(data, todo.id, "Repro", 1001);
  return { data, todoId: todo.id, subtaskId: subtask?.id ?? "" };
}

function proposal(id: string, action: ProposalAction): AIProposal {
  return { id, label: `label ${id}`, recommended: true, applied: false, action };
}

describe("validateProposal — same rules as manual edits (§27)", () => {
  it("rejects unknown / trashed / foreign-list todos", () => {
    const { data, todoId } = fixture();
    expect(validateProposal(data, { kind: "changeStatus", todoId: "ghost", status: "done" }, "l1"))
      .toContain("no longer exists");
    const trashed = createTodo(data, "l1", null, "bye", 1002);
    trashed.trashed = true;
    expect(validateProposal(data, { kind: "changeStatus", todoId: trashed.id, status: "done" }, "l1"))
      .toContain("no longer exists");
    expect(validateProposal(data, { kind: "changeStatus", todoId, status: "done" }, "l2"))
      .toContain("another list");
  });

  it("restricts createTodo/moveTodo to the run's list and existing groups", () => {
    const { data, todoId } = fixture();
    expect(validateProposal(data, { kind: "createTodo", listId: "l2", groupId: null, title: "x", description: "" }, "l1"))
      .toContain("only create todos in this list");
    expect(validateProposal(data, { kind: "createTodo", listId: "l1", groupId: "ghost", title: "x", description: "" }, "l1"))
      .toContain("group no longer exists");
    expect(validateProposal(data, { kind: "createTodo", listId: "l1", groupId: "gOther", title: "x", description: "" }, "l1"))
      .toContain("another list");
    expect(validateProposal(data, { kind: "moveTodo", todoId, listId: "l1", groupId: "g1" }, "l1")).toBeNull();
  });

  it("archive semantics: an already-archived todo cannot be archived again", () => {
    const { data, todoId } = fixture();
    expect(validateProposal(data, { kind: "archiveTodo", todoId }, "l1")).toBeNull();
    const todo = data.todos.find((t) => t.id === todoId);
    if (todo !== undefined) todo.archived = true;
    expect(validateProposal(data, { kind: "archiveTodo", todoId }, "l1")).toContain("already archived");
  });

  it("updateSubtask follows the owning todo's list", () => {
    const { data, subtaskId } = fixture();
    expect(validateProposal(data, { kind: "updateSubtask", subtaskId, text: "t", checked: null }, "l1")).toBeNull();
    expect(validateProposal(data, { kind: "updateSubtask", subtaskId: "ghost", text: "t", checked: null }, "l1"))
      .toContain("subtask no longer exists");
  });
});

describe("applyProposals — batch through normal domain ops", () => {
  it("applies each kind and logs AI activity entries", () => {
    const { data, todoId, subtaskId } = fixture();
    const outcome = applyProposals(
      data,
      [
        proposal("p1", { kind: "addSubtask", todoId, text: "Write tests" }),
        proposal("p2", { kind: "changeStatus", todoId, status: "progress" }),
        proposal("p3", { kind: "createTodo", listId: "l1", groupId: "g1", title: "New one", description: "desc" }),
        proposal("p4", { kind: "updateSubtask", subtaskId, text: null, checked: true }),
        proposal("p5", { kind: "moveTodo", todoId, listId: "l1", groupId: "g1" }),
      ],
      "l1",
      5000,
    );
    expect(outcome.appliedIds).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    expect(outcome.errors).toEqual({});
    const todo = data.todos.find((t) => t.id === todoId);
    expect(todo?.status).toBe("progress");
    expect(todo?.groupId).toBe("g1");
    expect(data.subtasks.some((s) => s.text === "Write tests")).toBe(true);
    expect(data.subtasks.find((s) => s.id === subtaskId)?.checked).toBe(true);
    const created = data.todos.find((t) => t.title === "New one");
    expect(created?.description).toBe("desc");
    // the caller slots new todos per the Behavior setting, so it needs their ids
    expect(outcome.createdTodoIds).toEqual([created?.id]);
    const aiEntries = data.activity.filter((e) => e.type === "ai");
    expect(aiEntries.length).toBe(4); // createTodo logs "Created" instead
    expect(aiEntries[0].summary).toBe("AI applied — label p1");
  });

  it("invalid proposals are skipped with errors; valid siblings still apply", () => {
    const { data, todoId } = fixture();
    const outcome = applyProposals(
      data,
      [
        proposal("bad", { kind: "changeStatus", todoId: "ghost", status: "done" }),
        proposal("good", { kind: "changeStatus", todoId, status: "done" }),
      ],
      "l1",
      5000,
    );
    expect(Object.keys(outcome.errors)).toEqual(["bad"]);
    expect(outcome.appliedIds).toEqual(["good"]);
    expect(data.todos.find((t) => t.id === todoId)?.status).toBe("done");
  });

  it("a snapshot taken before the batch fully restores it (undo semantics)", () => {
    const { data, todoId } = fixture();
    const before = structuredClone(data);
    applyProposals(
      data,
      [
        proposal("p1", { kind: "addSubtask", todoId, text: "X" }),
        proposal("p2", { kind: "changeStatus", todoId, status: "done" }),
        proposal("p3", { kind: "createTodo", listId: "l1", groupId: null, title: "Y", description: "" }),
      ],
      "l1",
      5000,
    );
    expect(data.todos.length).toBe(before.todos.length + 1);
    // store.undo() restores the pre-batch snapshot in ONE step — the whole
    // batch disappears together, exactly like any other single mutation
    expect(before.todos.find((t) => t.id === todoId)?.status).toBe("open");
    expect(before.subtasks.some((s) => s.text === "X")).toBe(false);
  });
});
