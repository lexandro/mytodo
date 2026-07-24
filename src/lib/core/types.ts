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

/** User-defined color label (max 12); built-in presets are constants, not rows. */
export interface ColorLabel {
  id: string;
  name: string | null;
  color: string;
  order: number;
}

export interface DomainData {
  lists: List[];
  groups: Group[];
  todos: Todo[];
  subtasks: Subtask[];
  activity: ActivityEvent[];
  colorLabels: ColorLabel[];
}

export function emptyDomainData(): DomainData {
  return { lists: [], groups: [], todos: [], subtasks: [], activity: [], colorLabels: [] };
}

/** Group nesting cap — enforced in UI, import and drag & drop alike. */
export const MAX_GROUP_DEPTH = 3;
/** Custom color label cap. */
export const MAX_CUSTOM_LABELS = 12;
