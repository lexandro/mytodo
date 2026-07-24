import { describe, expect, it } from "vitest";
import { proposalLabel, resultFromText } from "./ai-result";

describe("resultFromText — envelope extraction", () => {
  it("parses the LAST fenced json block", () => {
    const text = [
      "Here is an example: ```json\n{\"summary\":\"decoy\"}\n```",
      "Final:",
      "```json",
      '{"summary":"real one","findings":["a"]}',
      "```",
    ].join("\n");
    const result = resultFromText(text);
    expect(result.summary).toBe("real one");
    expect(result.findings).toEqual(["a"]);
  });

  it("accepts a bare JSON body without fences", () => {
    const result = resultFromText('{"answer":"In session.ts","summary":"ok"}');
    expect(result.answer).toBe("In session.ts");
  });

  it("falls back to summary-only for plain prose (§24 controlled fallback)", () => {
    const result = resultFromText("I could not produce structured output today.");
    expect(result.summary).toBe("I could not produce structured output today.");
    expect(result.proposals).toEqual([]);
  });

  it("normalizes proposals: local ids, derived labels, recommended default", () => {
    const result = resultFromText(
      JSON.stringify({
        summary: "s",
        proposals: [
          { kind: "addSubtask", todoId: "t1", text: "Write tests" },
          { kind: "changeStatus", todoId: "t1", status: "done", recommended: false },
          { kind: "runSql", sql: "DROP TABLE todos" },
        ],
      }),
    );
    expect(result.proposals.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(result.proposals[0].label).toBe('Add subtask "Write tests"');
    expect(result.proposals[0].recommended).toBe(true);
    expect(result.proposals[1].recommended).toBe(false);
  });

  it("recommendation with an action becomes a proposal row (Verify flow)", () => {
    const result = resultFromText(
      JSON.stringify({
        summary: "s",
        verdict: { value: "partial", why: "tests missing" },
        recommendation: {
          text: "Mark as In Progress",
          proposal: { kind: "changeStatus", todoId: "t1", status: "progress" },
        },
      }),
    );
    expect(result.verdict?.value).toBe("partial");
    expect(result.recommendation?.proposalId).toBe("p1");
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].action).toEqual({ kind: "changeStatus", todoId: "t1", status: "progress" });
  });

  it("recommendation without a parsable action keeps only the text", () => {
    const result = resultFromText(
      JSON.stringify({ summary: "s", recommendation: { text: "Think about it" } }),
    );
    expect(result.recommendation).toEqual({ text: "Think about it", proposalId: null });
  });

  it("keeps the raw text when the envelope is parseable but empty", () => {
    const result = resultFromText('{"proposals":[]}');
    expect(result.summary).toBe('{"proposals":[]}');
  });
});

describe("proposalLabel", () => {
  it("derives readable labels per kind", () => {
    expect(proposalLabel({ kind: "createTodo", listId: "l", groupId: null, title: "New", description: "" }))
      .toBe('Create todo "New"');
    expect(proposalLabel({ kind: "changeStatus", todoId: "t", status: "done" })).toBe("Change status to Done");
    expect(proposalLabel({ kind: "archiveTodo", todoId: "t" })).toBe("Archive todo");
  });
});
