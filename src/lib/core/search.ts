// Search (daprompt §20/§41): deterministic pipeline — Unicode NFD →
// diacritic removal → lowercase → whitespace normalization. Matching:
// substring on title/description/subtasks plus subsequence fuzzy (≥4 chars)
// on titles. No search-engine dependency.

import { byOrder } from "./ordering";
import type { DomainData, Todo } from "./types";

export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Subsequence match on normalized strings — "arvzt" finds "árvíztűrő". */
function subsequenceMatch(query: string, target: string): boolean {
  let i = 0;
  for (const ch of target) {
    if (ch === query[i]) i += 1;
    if (i === query.length) return true;
  }
  return false;
}

const FUZZY_MIN_LENGTH = 4;

/** Title matching: substring always; subsequence only for ≥4-char queries. */
export function fuzzyMatch(query: string, target: string): boolean {
  const q = normalizeText(query);
  if (q === "") return true;
  const t = normalizeText(target);
  if (t.includes(q)) return true;
  if (q.length < FUZZY_MIN_LENGTH) return false;
  return subsequenceMatch(q, t);
}

/** Full todo matching: fuzzy title + substring description/subtasks. */
export function todoMatches(data: DomainData, query: string, todo: Todo): boolean {
  if (fuzzyMatch(query, todo.title)) return true;
  const q = normalizeText(query);
  if (q === "") return true;
  if (normalizeText(todo.description).includes(q)) return true;
  return data.subtasks.some(
    (s) => s.todoId === todo.id && normalizeText(s.text).includes(q),
  );
}

export const GLOBAL_SEARCH_LIMIT = 20;

/**
 * Global scope: every list, archived included, trash excluded. Deterministic
 * order: list order, then group scope, then row order.
 */
export function globalSearch(data: DomainData, query: string): Todo[] {
  if (normalizeText(query) === "") return [];
  const listOrder = new Map([...data.lists].sort(byOrder).map((l, i) => [l.id, i]));
  return data.todos
    .filter((t) => !t.trashed && todoMatches(data, query, t))
    .sort(
      (a, b) =>
        (listOrder.get(a.listId) ?? 99) - (listOrder.get(b.listId) ?? 99) || byOrder(a, b),
    )
    .slice(0, GLOBAL_SEARCH_LIMIT);
}
