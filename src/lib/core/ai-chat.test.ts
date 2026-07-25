import { describe, expect, it } from "vitest";
import { buildChatPrompt } from "./ai-chat";
import type { WorkspaceLink } from "./ai-types";
import { createTodo } from "./todos-ops";
import { emptyDomainData, type DomainData } from "./types";

function fixture(): { data: DomainData; link: WorkspaceLink; todoId: string } {
  const data = emptyDomainData();
  data.lists.push(
    { id: "l1", name: "Conference App", emoji: "", fixed: false, colorLabelId: null, order: 1 },
    { id: "l2", name: "Other", emoji: "", fixed: false, colorLabelId: null, order: 2 },
  );
  const todo = createTodo(data, "l1", null, "Fix authentication timeout", 1000);
  createTodo(data, "l2", null, "OTHER LIST TODO", 1002);
  const link: WorkspaceLink = {
    path: "C:\\p", type: "git", brief: "Use Bun, never npm.", preferredProvider: null,
  };
  return { data, link, todoId: todo.id };
}

const base = { listId: "l1", todoId: null, mode: "analyze" as const, firstTurn: true };

describe("buildChatPrompt — first turn", () => {
  it("carries workspace, brief, list snapshot, rules and the message", () => {
    const { data, link, todoId } = fixture();
    const prompt = buildChatPrompt(data, link, { ...base, message: "  what is left?  " });
    expect(prompt).toContain("READ-ONLY");
    expect(prompt).toContain("Use Bun, never npm.");
    expect(prompt).toContain(`[${todoId}] Fix authentication timeout — Open`);
    expect(prompt).toContain("Reply conversationally in plain text");
    expect(prompt).toContain("The user says\nwhat is left?");
    // §18: another list's todos never leak in
    expect(prompt).not.toContain("OTHER LIST TODO");
  });

  it("includes the bound todo when the chat was opened from one", () => {
    const { data, link, todoId } = fixture();
    const prompt = buildChatPrompt(data, link, { ...base, todoId, message: "status?" });
    expect(prompt).toContain("The selected todo");
    expect(prompt).toContain(`todoId of the selected todo: ${todoId}`);
  });

  it("execute mode says so explicitly", () => {
    const { data, link } = fixture();
    const prompt = buildChatPrompt(data, link, { ...base, mode: "execute", message: "do it" });
    expect(prompt).toContain("EXECUTE");
    expect(prompt).toContain("may modify files");
  });
});

describe("buildChatPrompt — follow-up turn", () => {
  it("sends only the refreshed list plus the message (the session has the rest)", () => {
    const { data, link, todoId } = fixture();
    const prompt = buildChatPrompt(data, link, {
      ...base, firstTurn: false, message: "and the second one?",
    });
    expect(prompt).toContain("refreshed");
    expect(prompt).toContain(`[${todoId}] Fix authentication timeout`);
    expect(prompt).toContain("The user says\nand the second one?");
    // no repeated preamble/rules — those live in the resumed session
    expect(prompt).not.toContain("You are an AI agent");
    expect(prompt).not.toContain("Reply conversationally");
    expect(prompt.length).toBeLessThan(600);
  });
});
