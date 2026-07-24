import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { createList } from "./lists-ops";
import { addSubtask } from "./subtasks-ops";
import { fuzzyMatch, globalSearch, normalizeText, todoMatches } from "./search";
import { createTodo, trashTodo } from "./todos-ops";
import { emptyDomainData, type DomainData } from "./types";

describe("normalizeText — Hungarian accent + case pipeline", () => {
  it("makes árvíztűrő match ARVIZTURO", () => {
    expect(normalizeText("ÁRVÍZTŰRŐ TÜKÖRFÚRÓGÉP")).toBe("arvizturo tukorfurogep");
    expect(normalizeText("árvíztűrő tükörfúrógép")).toBe("arvizturo tukorfurogep");
  });

  it("normalizes whitespace", () => {
    expect(normalizeText("  a\t b\n c  ")).toBe("a b c");
  });
});

describe("fuzzyMatch", () => {
  it("is case and accent insensitive (substring)", () => {
    expect(fuzzyMatch("ARVIZTURO", "Árvíztűrő tükörfúrógép")).toBe(true);
    expect(fuzzyMatch("tükör", "ARVIZTURO TUKORFUROGEP")).toBe(true);
  });

  it("matches subsequences for queries of 4+ chars", () => {
    expect(fuzzyMatch("atrg", "árvíztűrő tükörfúrógép")).toBe(true);
    expect(fuzzyMatch("axqz", "árvíztűrő")).toBe(false);
  });

  it("requires substring for short queries (no noisy fuzz)", () => {
    expect(fuzzyMatch("art", "árvíztűrő")).toBe(false);
    expect(fuzzyMatch("árv", "árvíztűrő")).toBe(true);
  });

  it("empty query matches everything", () => {
    expect(fuzzyMatch("", "anything")).toBe(true);
  });
});

function fixture(): { data: DomainData; workId: string; otherId: string } {
  const data = emptyDomainData();
  ensureInbox(data);
  const work = createList(data, "Work");
  const other = createList(data, "Other");
  return { data, workId: work.id, otherId: other.id };
}

describe("todoMatches", () => {
  it("searches title, description and subtask texts", () => {
    const { data, workId } = fixture();
    const todo = createTodo(data, workId, null, "Fix timeout", 1);
    todo.description = "Árvíztűrő jegyzet a hibáról";
    addSubtask(data, todo.id, "különleges lépés", 2);
    expect(todoMatches(data, "ARVIZTURO", todo)).toBe(true);
    expect(todoMatches(data, "kulonleges", todo)).toBe(true);
    expect(todoMatches(data, "timeout", todo)).toBe(true);
    expect(todoMatches(data, "nincs ilyen", todo)).toBe(false);
  });
});

describe("globalSearch — scoping", () => {
  it("finds matches across lists, includes archived, excludes trashed", () => {
    const { data, workId, otherId } = fixture();
    createTodo(data, workId, null, "alpha timeout", 1);
    const archived = createTodo(data, otherId, null, "beta timeout", 2);
    archived.archived = true;
    const trashed = createTodo(data, otherId, null, "gamma timeout", 3);
    trashTodo(data, trashed.id, 4);
    const hits = globalSearch(data, "timeout");
    expect(hits.map((t) => t.title)).toEqual(["alpha timeout", "beta timeout"]);
  });

  it("orders by list order and caps at 20", () => {
    const { data, workId } = fixture();
    for (let i = 0; i < 30; i += 1) createTodo(data, workId, null, `match ${i}`, i);
    expect(globalSearch(data, "match")).toHaveLength(20);
  });

  it("empty query returns nothing", () => {
    const { data } = fixture();
    expect(globalSearch(data, "  ")).toEqual([]);
  });
});
