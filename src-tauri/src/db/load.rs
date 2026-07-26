//! Loads the full domain state — runs once at startup; everything else is
//! served from the in-memory state.

use super::model::*;
use rusqlite::{Connection, Row};

fn collect<T>(
    conn: &Connection,
    sql: &str,
    map: fn(&Row) -> rusqlite::Result<T>,
) -> Result<Vec<T>, String> {
    let mut stmt = conn.prepare(sql).map_err(|e| format!("{sql}: {e}"))?;
    let rows = stmt
        .query_map([], map)
        .map_err(|e| format!("{sql}: {e}"))?
        .collect::<rusqlite::Result<Vec<T>>>()
        .map_err(|e| format!("{sql}: {e}"))?;
    Ok(rows)
}

pub fn load_all(conn: &Connection) -> Result<DomainData, String> {
    Ok(DomainData {
        lists: collect(
            conn,
            "SELECT id, name, emoji, fixed, color_label_id, ord FROM lists",
            |r| {
                Ok(List {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    emoji: r.get(2)?,
                    fixed: r.get(3)?,
                    color_label_id: r.get(4)?,
                    order: r.get(5)?,
                })
            },
        )?,
        groups: collect(
            conn,
            "SELECT id, list_id, parent_id, name, emoji, ord, collapsed FROM groups",
            |r| {
                Ok(Group {
                    id: r.get(0)?,
                    list_id: r.get(1)?,
                    parent_id: r.get(2)?,
                    name: r.get(3)?,
                    emoji: r.get(4)?,
                    order: r.get(5)?,
                    collapsed: r.get(6)?,
                })
            },
        )?,
        todos: collect(
            conn,
            "SELECT id, list_id, group_id, parent_id, title, description, status, emoji,
                    color_label_id, pin_local, pin_global, archived, trashed,
                    trashed_at, ord, created_at, updated_at
             FROM todos",
            |r| {
                Ok(Todo {
                    id: r.get(0)?,
                    list_id: r.get(1)?,
                    group_id: r.get(2)?,
                    parent_id: r.get(3)?,
                    title: r.get(4)?,
                    description: r.get(5)?,
                    status: r.get(6)?,
                    emoji: r.get(7)?,
                    color_label_id: r.get(8)?,
                    pin_local: r.get(9)?,
                    pin_global: r.get(10)?,
                    archived: r.get(11)?,
                    trashed: r.get(12)?,
                    trashed_at: r.get(13)?,
                    order: r.get(14)?,
                    created_at: r.get(15)?,
                    updated_at: r.get(16)?,
                })
            },
        )?,
        subtasks: collect(
            conn,
            "SELECT id, todo_id, text, checked, ord FROM subtasks",
            |r| {
                Ok(Subtask {
                    id: r.get(0)?,
                    todo_id: r.get(1)?,
                    text: r.get(2)?,
                    checked: r.get(3)?,
                    order: r.get(4)?,
                })
            },
        )?,
        activity: collect(
            conn,
            "SELECT id, todo_id, type, summary, created_at FROM activity",
            |r| {
                Ok(ActivityEvent {
                    id: r.get(0)?,
                    todo_id: r.get(1)?,
                    kind: r.get(2)?,
                    summary: r.get(3)?,
                    created_at: r.get(4)?,
                })
            },
        )?,
        color_labels: collect(
            conn,
            "SELECT id, kind, name, color, ord FROM color_labels",
            |r| {
                Ok(ColorLabel {
                    id: r.get(0)?,
                    kind: r.get(1)?,
                    name: r.get(2)?,
                    color: r.get(3)?,
                    order: r.get(4)?,
                })
            },
        )?,
        label_names: collect(
            conn,
            "SELECT id, list_id, label_id, name FROM label_names",
            |r| {
                Ok(LabelNameOverride {
                    id: r.get(0)?,
                    list_id: r.get(1)?,
                    label_id: r.get(2)?,
                    name: r.get(3)?,
                })
            },
        )?,
    })
}
