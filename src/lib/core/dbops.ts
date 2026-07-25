// DbOp — one persisted write. Mirrors the serde enum in db/model.rs;
// the diff module produces these and ipc.ts ships them in one transaction.

import type {
  ActivityEvent, ColorLabel, Group, LabelNameOverride, List, Subtask, Todo,
} from "./types";

export type DbOp =
  | { kind: "putList"; row: List }
  | { kind: "delList"; id: string }
  | { kind: "putGroup"; row: Group }
  | { kind: "delGroup"; id: string }
  | { kind: "putTodo"; row: Todo }
  | { kind: "delTodo"; id: string }
  | { kind: "putSubtask"; row: Subtask }
  | { kind: "delSubtask"; id: string }
  | { kind: "putActivity"; row: ActivityEvent }
  | { kind: "delActivity"; id: string }
  | { kind: "putLabel"; row: ColorLabel }
  | { kind: "delLabel"; id: string }
  | { kind: "putLabelName"; row: LabelNameOverride }
  | { kind: "delLabelName"; id: string };
