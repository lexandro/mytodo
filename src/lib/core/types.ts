// Domain types — the single source of truth for the whole app.
// Mirrored by src-tauri/src/db/model.rs (camelCase over IPC).
// Pure types only: no Tauri, no Svelte, no DOM imports.

export type TodoStatus = "open" | "progress" | "done" | "cancelled";

export const TODO_STATUSES: readonly TodoStatus[] = ["open", "progress", "done", "cancelled"];

export function isTodoStatus(value: unknown): value is TodoStatus {
  return TODO_STATUSES.includes(value as TodoStatus);
}

export interface List {
  id: string;
  name: string;
  emoji: string;
  /** Inbox is fixed: cannot be deleted */
  fixed: boolean;
  /** References a ColorLabel of the "list" palette; null = no color. */
  colorLabelId: string | null;
  order: number;
}

export interface Group {
  id: string;
  listId: string;
  parentId: string | null;
  name: string;
  emoji: string;
  order: number;
  collapsed: boolean;
}

export interface Todo {
  id: string;
  listId: string;
  groupId: string | null;
  /**
   * Parent TODO — a sub-item lives UNDER another todo. The whole chain always
   * shares one listId/groupId: nesting happens inside a group, it never moves
   * a todo out of it. null = top level of its group scope.
   */
  parentId: string | null;
  title: string;
  description: string;
  status: TodoStatus;
  emoji: string;
  /** references a built-in preset id or a custom ColorLabel id */
  colorLabelId: string | null;
  pinLocal: boolean;
  pinGlobal: boolean;
  archived: boolean;
  trashed: boolean;
  trashedAt: number | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Subtask {
  id: string;
  todoId: string;
  text: string;
  checked: boolean;
  order: number;
}

export interface ActivityEvent {
  id: string;
  todoId: string;
  type: string;
  summary: string;
  createdAt: number;
}

/** Todos and lists are colored from two independent palettes. */
export type PaletteKind = "todo" | "list";

export const PALETTE_KINDS: readonly PaletteKind[] = ["todo", "list"];

export function isPaletteKind(value: unknown): value is PaletteKind {
  return PALETTE_KINDS.includes(value as PaletteKind);
}

/**
 * One entry of a shared color palette. The built-ins are seeded rows with
 * fixed ids (core/labels.ts) — every list sees the same colors; only the names
 * of the "todo" palette can differ per list (LabelNameOverride).
 */
export interface ColorLabel {
  id: string;
  kind: PaletteKind;
  name: string | null;
  color: string;
  order: number;
}

/**
 * A label's name inside one list: the palette is central, but "Blue" can be
 * "Waiting for review" in one list and "Home" in another.
 */
export interface LabelNameOverride {
  /** `${listId}::${labelId}` — one row per pair, so no id generation is needed. */
  id: string;
  listId: string;
  labelId: string;
  name: string;
}

export interface DomainData {
  lists: List[];
  groups: Group[];
  todos: Todo[];
  subtasks: Subtask[];
  activity: ActivityEvent[];
  colorLabels: ColorLabel[];
  labelNames: LabelNameOverride[];
}

export function emptyDomainData(): DomainData {
  return {
    lists: [], groups: [], todos: [], subtasks: [], activity: [],
    colorLabels: [], labelNames: [],
  };
}

/** Group nesting cap — enforced in UI, import and drag & drop alike. */
export const MAX_GROUP_DEPTH = 3;
/** Sub-item nesting cap, counted from the top level of a group scope. */
export const MAX_TODO_DEPTH = 3;
/** Custom color label cap. */
export const MAX_CUSTOM_LABELS = 12;
