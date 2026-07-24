import { describe, expect, it } from "vitest";
import { MAX_SNAPSHOT_TODOS, buildRunPrompt } from "./ai-context";
import type { WorkspaceLink } from "./ai-types";
import { createTodo } from "./todos-ops";
import { addSubtask } from "./subtasks-ops";
import { emptyDomainData, type DomainData } from "./types";

function fixture(): { data: DomainData; link: WorkspaceLink; todoId: string } {
  const data = emptyDomainData();
  data.lists.push(
    { id: "l1", name: "Conference App", emoji: "", fixed: false, order: 1 },
    { id: "l2", name: "Other", emoji: "", fixed: false, order: 2 },
  );
  data.groups.push({ id: "g1", listId: "l1", parentId: null, name: "Backend", emoji: "", order: 1, collapsed: false });
  const todo = createTodo(data, "l1", "g1", "Fix authentication timeout", 1000);
  todo.description = "Session expires too early.";
  addSubtask(data, todo.id, "Reproduce the bug", 1001);
  createTodo(data, "l2", null, "OTHER LIST TODO", 1002);
  const link: WorkspaceLink = { path: "C:\\p", type: "git", brief: "Use Bun, never npm.", preferredProvider: null };
  return { data, link, todoId: todo.id };
}

describe("buildRunPrompt", () => {
  it("todo action: mode, brief, todo context, ids, contract — no other lists", () => {
    const { data, link, todoId } = fixture();
    const prompt = buildRunPrompt(data, link, {
      action: "investigate", listId: "l1", todoId, question: null,
    });
    expect(prompt).toContain("READ-ONLY");
    expect(prompt).toContain("Use Bun, never npm.");
    expect(prompt).toContain("Fix authentication timeout");
    expect(prompt).toContain("Session expires too early.");
    expect(prompt).toContain("Reproduce the bug");
    expect(prompt).toContain(`todoId of the selected todo: ${todoId}`);
    expect(prompt).toContain("Conference App / Backend");
    expect(prompt).toContain("```json");
    // §18: only the run's slice — the other list never leaks in
    expect(prompt).not.toContain("OTHER LIST TODO");
  });

  it("implement is the only execute-mode prompt", () => {
    const { data, link, todoId } = fixture();
    const implement = buildRunPrompt(data, link, { action: "implement", listId: "l1", todoId, question: null });
    expect(implement).toContain("EXECUTE");
    expect(implement).toContain("may modify files");
    const verify = buildRunPrompt(data, link, { action: "verify", listId: "l1", todoId, question: null });
    expect(verify).toContain("READ-ONLY");
    expect(verify).toContain("verdict");
  });

  it("suggest/reconcile include the id-tagged list snapshot", () => {
    const { data, link, todoId } = fixture();
    const prompt = buildRunPrompt(data, link, { action: "reconcile", listId: "l1", todoId: null, question: null });
    expect(prompt).toContain("Current todos in this list");
    expect(prompt).toContain(`[${todoId}] Fix authentication timeout — Open`);
    expect(prompt).toContain("mapping");
  });

  it("investigate does NOT dump the list snapshot (§18)", () => {
    const { data, link, todoId } = fixture();
    const prompt = buildRunPrompt(data, link, { action: "investigate", listId: "l1", todoId, question: null });
    expect(prompt).not.toContain("Current todos in this list");
  });

  it("askWorkspace carries the question and asks for an answer block", () => {
    const { data, link } = fixture();
    const prompt = buildRunPrompt(data, link, {
      action: "askWorkspace", listId: "l1", todoId: null, question: "  Where is auth handled?  ",
    });
    expect(prompt).toContain("The user's question\nWhere is auth handled?");
    expect(prompt).toContain("answer");
  });

  it("caps the snapshot and skips trashed todos", () => {
    const { data, link } = fixture();
    for (let i = 0; i < MAX_SNAPSHOT_TODOS + 20; i++) createTodo(data, "l1", null, `bulk ${i}`, 2000 + i);
    const trashed = createTodo(data, "l1", null, "TRASHED ONE", 9000);
    trashed.trashed = true;
    const prompt = buildRunPrompt(data, link, { action: "suggestTodos", listId: "l1", todoId: null, question: null });
    const rows = prompt.split("\n").filter((line) => line.startsWith("- ["));
    expect(rows.length).toBeLessThanOrEqual(MAX_SNAPSHOT_TODOS + data.groups.length);
    expect(prompt).not.toContain("TRASHED ONE");
  });
});
