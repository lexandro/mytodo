// JSON import/export (daprompt §6): a portable, human-readable exchange
// format. Import validates BEFORE anything touches the store — a bad file
// can never corrupt the database. The apply itself is one undo-able step.

import { MAX_GROUP_DEPTH, TODO_STATUSES, emptyDomainData, type DomainData, type TodoStatus } from "./types";
import { ensureInbox } from "./bootstrap";

export const EXPORT_FORMAT = 1;

export interface ExportFile {
  app: "mytodo";
  format: number;
  exportedAt: number;
  data: DomainData;
}

export function exportJson(data: DomainData, exportedAt: number): string {
  const file: ExportFile = { app: "mytodo", format: EXPORT_FORMAT, exportedAt, data };
  return JSON.stringify(file, null, 2);
}

export type ImportResult =
  | { ok: true; data: DomainData }
  | { ok: false; error: string };

const STATUSES: readonly TodoStatus[] = TODO_STATUSES;

function str(v: unknown): v is string {
  return typeof v === "string";
}
function num(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function bool(v: unknown): v is boolean {
  return typeof v === "boolean";
}

/* eslint-disable complexity */
export function parseImport(json: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "Not valid JSON." };
  }
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Not a myTODO export." };
  const file = raw as Record<string, unknown>;
  if (file.app !== "mytodo") return { ok: false, error: "Not a myTODO export." };
  if (file.format !== EXPORT_FORMAT) return { ok: false, error: `Unsupported format ${String(file.format)}.` };
  const d = file.data;
  if (typeof d !== "object" || d === null) return { ok: false, error: "Missing data section." };
  const src = d as Record<string, unknown>;
  for (const key of ["lists", "groups", "todos", "subtasks", "activity", "colorLabels"]) {
    if (!Array.isArray(src[key])) return { ok: false, error: `Missing or invalid "${key}".` };
  }

  const out = emptyDomainData();
  const listIds = new Set<string>();
  for (const item of src.lists as unknown[]) {
    const l = item as Record<string, unknown>;
    if (!str(l.id) || !str(l.name) || !num(l.order)) return { ok: false, error: "Invalid list entry." };
    if (listIds.has(l.id)) return { ok: false, error: `Duplicate list id ${l.id}.` };
    listIds.add(l.id);
    out.lists.push({
      id: l.id, name: l.name, emoji: str(l.emoji) ? l.emoji : "",
      fixed: bool(l.fixed) ? l.fixed : false, order: l.order,
    });
  }

  const groupIds = new Set<string>();
  const parentOf = new Map<string, string | null>();
  for (const item of src.groups as unknown[]) {
    const g = item as Record<string, unknown>;
    if (!str(g.id) || !str(g.name) || !str(g.listId) || !num(g.order)) {
      return { ok: false, error: "Invalid group entry." };
    }
    if (!listIds.has(g.listId)) return { ok: false, error: `Group ${g.name}: unknown list.` };
    if (groupIds.has(g.id)) return { ok: false, error: `Duplicate group id ${g.id}.` };
    const parentId = str(g.parentId) ? g.parentId : null;
    groupIds.add(g.id);
    parentOf.set(g.id, parentId);
    out.groups.push({
      id: g.id, listId: g.listId, parentId, name: g.name,
      emoji: str(g.emoji) ? g.emoji : "", order: g.order,
      collapsed: bool(g.collapsed) ? g.collapsed : false,
    });
  }
  // parent refs + depth cap (also guards against parent cycles)
  for (const group of out.groups) {
    if (group.parentId !== null && !groupIds.has(group.parentId)) {
      return { ok: false, error: `Group ${group.name}: unknown parent.` };
    }
    let depth = 1;
    let cursor = group.parentId;
    while (cursor !== null) {
      depth += 1;
      if (depth > MAX_GROUP_DEPTH) {
        return { ok: false, error: `Group ${group.name}: exceeds the ${MAX_GROUP_DEPTH}-level limit.` };
      }
      cursor = parentOf.get(cursor) ?? null;
    }
  }

  const todoIds = new Set<string>();
  for (const item of src.todos as unknown[]) {
    const t = item as Record<string, unknown>;
    if (!str(t.id) || !str(t.title) || !str(t.listId) || !num(t.order)) {
      return { ok: false, error: "Invalid todo entry." };
    }
    if (!listIds.has(t.listId)) return { ok: false, error: `Todo "${t.title}": unknown list.` };
    const groupId = str(t.groupId) ? t.groupId : null;
    if (groupId !== null && !groupIds.has(groupId)) {
      return { ok: false, error: `Todo "${t.title}": unknown group.` };
    }
    if (todoIds.has(t.id)) return { ok: false, error: `Duplicate todo id ${t.id}.` };
    todoIds.add(t.id);
    out.todos.push({
      id: t.id, listId: t.listId, groupId, title: t.title,
      description: str(t.description) ? t.description : "",
      status: STATUSES.includes(t.status as TodoStatus) ? (t.status as TodoStatus) : "open",
      emoji: str(t.emoji) ? t.emoji : "",
      colorLabelId: str(t.colorLabelId) ? t.colorLabelId : null,
      pinLocal: bool(t.pinLocal) ? t.pinLocal : false,
      pinGlobal: bool(t.pinGlobal) ? t.pinGlobal : false,
      archived: bool(t.archived) ? t.archived : false,
      trashed: bool(t.trashed) ? t.trashed : false,
      trashedAt: num(t.trashedAt) ? t.trashedAt : null,
      order: t.order,
      createdAt: num(t.createdAt) ? t.createdAt : 0,
      updatedAt: num(t.updatedAt) ? t.updatedAt : 0,
    });
  }

  for (const item of src.subtasks as unknown[]) {
    const s = item as Record<string, unknown>;
    if (!str(s.id) || !str(s.todoId) || !str(s.text) || !num(s.order)) {
      return { ok: false, error: "Invalid subtask entry." };
    }
    if (!todoIds.has(s.todoId)) return { ok: false, error: "Subtask references an unknown todo." };
    out.subtasks.push({
      id: s.id, todoId: s.todoId, text: s.text,
      checked: bool(s.checked) ? s.checked : false, order: s.order,
    });
  }

  for (const item of src.activity as unknown[]) {
    const a = item as Record<string, unknown>;
    if (!str(a.id) || !str(a.todoId) || !str(a.summary)) continue; // activity is best-effort
    if (!todoIds.has(a.todoId)) continue;
    out.activity.push({
      id: a.id, todoId: a.todoId, type: str(a.type) ? a.type : "note",
      summary: a.summary, createdAt: num(a.createdAt) ? a.createdAt : 0,
    });
  }

  for (const item of src.colorLabels as unknown[]) {
    const c = item as Record<string, unknown>;
    if (!str(c.id) || !str(c.color) || !num(c.order)) continue;
    out.colorLabels.push({
      id: c.id, name: str(c.name) ? c.name : null, color: c.color, order: c.order,
    });
  }

  // exactly the newest 12 custom labels survive the cap
  out.colorLabels = out.colorLabels.slice(0, 12);
  // the workspace always has a fixed Inbox
  ensureInbox(out);
  return { ok: true, data: out };
}
