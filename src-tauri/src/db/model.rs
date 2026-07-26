//! Domain rows — mirror the types in `src/lib/core/types.ts`.
//! Field names travel as camelCase over IPC so the TS side can use them
//! without any mapping.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct List {
    pub id: String,
    pub name: String,
    pub emoji: String,
    pub fixed: bool,
    pub color_label_id: Option<String>,
    pub order: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Group {
    pub id: String,
    pub list_id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub emoji: String,
    pub order: f64,
    pub collapsed: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Todo {
    pub id: String,
    pub list_id: String,
    pub group_id: Option<String>,
    /// Parent TODO for sub-items; None = top level of its group scope
    pub parent_id: Option<String>,
    /// Sub-items hidden under this todo (view state)
    pub collapsed: bool,
    pub title: String,
    pub description: String,
    /// 'open' | 'progress' | 'done' | 'cancelled' — validated on the TS side
    pub status: String,
    pub emoji: String,
    pub color_label_id: Option<String>,
    pub pin_local: bool,
    pub pin_global: bool,
    pub archived: bool,
    pub trashed: bool,
    pub trashed_at: Option<i64>,
    pub order: f64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Subtask {
    pub id: String,
    pub todo_id: String,
    pub text: String,
    pub checked: bool,
    pub order: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEvent {
    pub id: String,
    pub todo_id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub summary: String,
    pub created_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ColorLabel {
    pub id: String,
    /// 'todo' | 'list' — which palette the color belongs to
    pub kind: String,
    pub name: Option<String>,
    pub color: String,
    pub order: f64,
}

/// One list's own name for a palette color. `id` is `listId::labelId`.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LabelNameOverride {
    pub id: String,
    pub list_id: String,
    pub label_id: String,
    pub name: String,
}

/// The complete persisted domain state — loaded in one piece at startup.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DomainData {
    pub lists: Vec<List>,
    pub groups: Vec<Group>,
    pub todos: Vec<Todo>,
    pub subtasks: Vec<Subtask>,
    pub activity: Vec<ActivityEvent>,
    pub color_labels: Vec<ColorLabel>,
    pub label_names: Vec<LabelNameOverride>,
}

/// A single write operation — produced by the frontend diff, runs in one transaction.
#[derive(Deserialize, Clone, Debug)]
#[serde(tag = "kind")]
pub enum DbOp {
    #[serde(rename = "putList")]
    PutList { row: List },
    #[serde(rename = "delList")]
    DelList { id: String },
    #[serde(rename = "putGroup")]
    PutGroup { row: Group },
    #[serde(rename = "delGroup")]
    DelGroup { id: String },
    #[serde(rename = "putTodo")]
    PutTodo { row: Todo },
    #[serde(rename = "delTodo")]
    DelTodo { id: String },
    #[serde(rename = "putSubtask")]
    PutSubtask { row: Subtask },
    #[serde(rename = "delSubtask")]
    DelSubtask { id: String },
    #[serde(rename = "putActivity")]
    PutActivity { row: ActivityEvent },
    #[serde(rename = "delActivity")]
    DelActivity { id: String },
    #[serde(rename = "putLabel")]
    PutLabel { row: ColorLabel },
    #[serde(rename = "delLabel")]
    DelLabel { id: String },
    #[serde(rename = "putLabelName")]
    PutLabelName { row: LabelNameOverride },
    #[serde(rename = "delLabelName")]
    DelLabelName { id: String },
}
