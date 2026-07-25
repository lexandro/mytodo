//! SQLite persistence layer. The connection lives behind a Mutex managed as
//! Tauri state; every command accesses it through that.

pub mod ai_runs;
pub mod backup;
pub mod load;
pub mod model;
pub mod schema;
pub mod write;

use rusqlite::Connection;
use std::collections::HashMap;
use std::path::Path;

/// Open + pragmas + migration. On failure returns a readable error message;
/// the app still starts (the frontend shows an error state).
pub fn open(path: &Path) -> Result<Connection, String> {
    let mut conn = Connection::open(path)
        .map_err(|e| format!("cannot open database {}: {e}", path.display()))?;
    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| format!("cannot enable WAL: {e}"))?;
    conn.pragma_update(None, "foreign_keys", true)
        .map_err(|e| format!("cannot enable foreign keys: {e}"))?;
    schema::migrate(&mut conn)?;
    Ok(conn)
}

pub fn settings_all(conn: &Connection) -> Result<HashMap<String, serde_json::Value>, String> {
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| format!("settings query: {e}"))?;
    let rows = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(|e| format!("settings query: {e}"))?;
    let mut map = HashMap::new();
    for row in rows {
        let (key, raw) = row.map_err(|e| format!("settings row: {e}"))?;
        let value = serde_json::from_str(&raw)
            .map_err(|e| format!("settings '{key}' is not valid JSON: {e}"))?;
        map.insert(key, value);
    }
    Ok(map)
}

pub fn settings_set(conn: &Connection, key: &str, value: &serde_json::Value) -> Result<(), String> {
    let raw = serde_json::to_string(value).map_err(|e| format!("settings encode: {e}"))?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value=?2",
        rusqlite::params![key, raw],
    )
    .map_err(|e| format!("settings write '{key}': {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::model::*;
    use super::*;

    fn mem_db() -> Connection {
        let mut conn = Connection::open_in_memory().expect("open");
        conn.pragma_update(None, "foreign_keys", true).expect("fk");
        schema::migrate(&mut conn).expect("migrate");
        conn
    }

    fn sample_todo(id: &str, list_id: &str) -> Todo {
        Todo {
            id: id.into(),
            list_id: list_id.into(),
            group_id: None,
            title: "Árvíztűrő tükörfúrógép".into(),
            description: "".into(),
            status: "open".into(),
            emoji: "".into(),
            color_label_id: None,
            pin_local: false,
            pin_global: false,
            archived: false,
            trashed: false,
            trashed_at: None,
            order: 1000.0,
            created_at: 1,
            updated_at: 1,
        }
    }

    #[test]
    fn roundtrip_all_tables() {
        let mut conn = mem_db();
        let list = List {
            id: "l1".into(),
            name: "Inbox".into(),
            emoji: "📥".into(),
            fixed: true,
            color_label_id: None,
            order: 1000.0,
        };
        let group = Group {
            id: "g1".into(),
            list_id: "l1".into(),
            parent_id: None,
            name: "Backend".into(),
            emoji: "".into(),
            order: 1000.0,
            collapsed: false,
        };
        let todo = sample_todo("t1", "l1");
        let sub = Subtask {
            id: "s1".into(),
            todo_id: "t1".into(),
            text: "check".into(),
            checked: true,
            order: 1000.0,
        };
        let act = ActivityEvent {
            id: "a1".into(),
            todo_id: "t1".into(),
            kind: "created".into(),
            summary: "Created".into(),
            created_at: 1,
        };
        let label = ColorLabel {
            id: "c1".into(),
            kind: "todo".into(),
            name: Some("Fontos".into()),
            color: "#e0567a".into(),
            order: 1000.0,
        };
        let label_name = LabelNameOverride {
            id: "l1::c1".into(),
            list_id: "l1".into(),
            label_id: "c1".into(),
            name: "Sürgős".into(),
        };

        write::apply_ops(
            &mut conn,
            &[
                DbOp::PutList { row: list.clone() },
                DbOp::PutGroup { row: group.clone() },
                DbOp::PutTodo { row: todo.clone() },
                DbOp::PutSubtask { row: sub.clone() },
                DbOp::PutActivity { row: act.clone() },
                DbOp::PutLabel { row: label.clone() },
                DbOp::PutLabelName {
                    row: label_name.clone(),
                },
            ],
        )
        .expect("apply");

        let data = load::load_all(&conn).expect("load");
        assert_eq!(data.lists, vec![list]);
        assert_eq!(data.groups, vec![group]);
        assert_eq!(data.todos, vec![todo]);
        assert_eq!(data.subtasks, vec![sub]);
        assert_eq!(data.activity, vec![act]);
        assert_eq!(data.color_labels, vec![label]);
        assert_eq!(data.label_names, vec![label_name]);
    }

    #[test]
    fn deleting_a_list_cascades_its_label_names() {
        let mut conn = mem_db();
        write::apply_ops(
            &mut conn,
            &[
                DbOp::PutList {
                    row: List {
                        id: "l1".into(),
                        name: "Munka".into(),
                        emoji: "".into(),
                        fixed: false,
                        color_label_id: None,
                        order: 1000.0,
                    },
                },
                DbOp::PutLabel {
                    row: ColorLabel {
                        id: "preset-blue".into(),
                        kind: "todo".into(),
                        name: Some("Blue".into()),
                        color: "#6ca3e0".into(),
                        order: 6000.0,
                    },
                },
                DbOp::PutLabelName {
                    row: LabelNameOverride {
                        id: "l1::preset-blue".into(),
                        list_id: "l1".into(),
                        label_id: "preset-blue".into(),
                        name: "Waiting for review".into(),
                    },
                },
            ],
        )
        .expect("seed");

        write::apply_ops(&mut conn, &[DbOp::DelList { id: "l1".into() }]).expect("delete list");

        let data = load::load_all(&conn).expect("load");
        assert!(
            data.label_names.is_empty(),
            "a deleted list must not leave label names behind"
        );
    }

    #[test]
    fn upsert_updates_existing_row() {
        let mut conn = mem_db();
        let list = List {
            id: "l1".into(),
            name: "Inbox".into(),
            emoji: "".into(),
            fixed: true,
            color_label_id: None,
            order: 1.0,
        };
        write::apply_ops(&mut conn, &[DbOp::PutList { row: list.clone() }]).expect("insert");
        let renamed = List {
            name: "Munka".into(),
            ..list
        };
        write::apply_ops(
            &mut conn,
            &[DbOp::PutList {
                row: renamed.clone(),
            }],
        )
        .expect("update");
        let data = load::load_all(&conn).expect("load");
        assert_eq!(data.lists, vec![renamed]);
    }

    #[test]
    fn deferred_fk_allows_out_of_order_ops_in_one_tx() {
        let mut conn = mem_db();
        // todo arrives before its list — consistent by commit time
        write::apply_ops(
            &mut conn,
            &[
                DbOp::PutTodo {
                    row: sample_todo("t1", "l1"),
                },
                DbOp::PutList {
                    row: List {
                        id: "l1".into(),
                        name: "L".into(),
                        emoji: "".into(),
                        fixed: false,
                        color_label_id: None,
                        order: 1.0,
                    },
                },
            ],
        )
        .expect("apply out of order");
    }

    #[test]
    fn fk_violation_rejected_at_commit() {
        let mut conn = mem_db();
        let result = write::apply_ops(
            &mut conn,
            &[DbOp::PutTodo {
                row: sample_todo("t1", "missing"),
            }],
        );
        assert!(result.is_err(), "orphan todo must be rejected");
    }

    #[test]
    fn transaction_rolls_back_on_error() {
        let mut conn = mem_db();
        let list = List {
            id: "l1".into(),
            name: "L".into(),
            emoji: "".into(),
            fixed: false,
            color_label_id: None,
            order: 1.0,
        };
        let result = write::apply_ops(
            &mut conn,
            &[
                DbOp::PutList { row: list },
                DbOp::PutTodo {
                    row: sample_todo("t1", "nonexistent"),
                },
            ],
        );
        assert!(result.is_err());
        let data = load::load_all(&conn).expect("load");
        assert!(
            data.lists.is_empty(),
            "failed batch must not persist partially"
        );
    }

    #[test]
    fn settings_roundtrip() {
        let conn = mem_db();
        let value = serde_json::json!({"theme": "dark", "scale": 100});
        settings_set(&conn, "ui", &value).expect("set");
        settings_set(&conn, "ui", &serde_json::json!({"theme": "light"})).expect("overwrite");
        let all = settings_all(&conn).expect("all");
        assert_eq!(all.get("ui"), Some(&serde_json::json!({"theme": "light"})));
    }
}
