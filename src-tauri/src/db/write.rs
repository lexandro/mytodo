//! Write operations: the DbOp batch produced by the frontend diff runs in a
//! single transaction. Inside it, FK checks are deferred until commit
//! (defer_foreign_keys) so op order cannot cause transient FK errors — but
//! every reference must be valid by commit time.

use super::model::DbOp;
use rusqlite::{params, Connection};

fn fail(what: &str, e: rusqlite::Error) -> String {
    format!("{what}: {e}")
}

pub fn apply_ops(conn: &mut Connection, ops: &[DbOp]) -> Result<(), String> {
    let tx = conn
        .transaction()
        .map_err(|e| fail("apply: cannot open transaction", e))?;
    tx.pragma_update(None, "defer_foreign_keys", true)
        .map_err(|e| fail("apply: defer_foreign_keys", e))?;

    for op in ops {
        match op {
            DbOp::PutList { row } => tx
                .execute(
                    "INSERT INTO lists (id, name, emoji, fixed, color_label_id, ord)
                     VALUES (?1,?2,?3,?4,?5,?6)
                     ON CONFLICT(id) DO UPDATE SET
                       name=?2, emoji=?3, fixed=?4, color_label_id=?5, ord=?6",
                    params![
                        row.id,
                        row.name,
                        row.emoji,
                        row.fixed,
                        row.color_label_id,
                        row.order
                    ],
                )
                .map(|_| ())
                .map_err(|e| fail("putList", e))?,
            DbOp::DelList { id } => tx
                .execute("DELETE FROM lists WHERE id=?1", params![id])
                .map(|_| ())
                .map_err(|e| fail("delList", e))?,
            DbOp::PutGroup { row } => tx
                .execute(
                    "INSERT INTO groups (id, list_id, parent_id, name, emoji, ord, collapsed)
                     VALUES (?1,?2,?3,?4,?5,?6,?7)
                     ON CONFLICT(id) DO UPDATE SET
                       list_id=?2, parent_id=?3, name=?4, emoji=?5, ord=?6, collapsed=?7",
                    params![
                        row.id,
                        row.list_id,
                        row.parent_id,
                        row.name,
                        row.emoji,
                        row.order,
                        row.collapsed
                    ],
                )
                .map(|_| ())
                .map_err(|e| fail("putGroup", e))?,
            DbOp::DelGroup { id } => tx
                .execute("DELETE FROM groups WHERE id=?1", params![id])
                .map(|_| ())
                .map_err(|e| fail("delGroup", e))?,
            DbOp::PutTodo { row } => tx
                .execute(
                    "INSERT INTO todos (id, list_id, group_id, title, description, status,
                        emoji, color_label_id, pin_local, pin_global, archived, trashed,
                        trashed_at, ord, created_at, updated_at)
                     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)
                     ON CONFLICT(id) DO UPDATE SET
                       list_id=?2, group_id=?3, title=?4, description=?5, status=?6,
                       emoji=?7, color_label_id=?8, pin_local=?9, pin_global=?10,
                       archived=?11, trashed=?12, trashed_at=?13, ord=?14,
                       created_at=?15, updated_at=?16",
                    params![
                        row.id,
                        row.list_id,
                        row.group_id,
                        row.title,
                        row.description,
                        row.status,
                        row.emoji,
                        row.color_label_id,
                        row.pin_local,
                        row.pin_global,
                        row.archived,
                        row.trashed,
                        row.trashed_at,
                        row.order,
                        row.created_at,
                        row.updated_at
                    ],
                )
                .map(|_| ())
                .map_err(|e| fail("putTodo", e))?,
            DbOp::DelTodo { id } => tx
                .execute("DELETE FROM todos WHERE id=?1", params![id])
                .map(|_| ())
                .map_err(|e| fail("delTodo", e))?,
            DbOp::PutSubtask { row } => tx
                .execute(
                    "INSERT INTO subtasks (id, todo_id, text, checked, ord)
                     VALUES (?1,?2,?3,?4,?5)
                     ON CONFLICT(id) DO UPDATE SET todo_id=?2, text=?3, checked=?4, ord=?5",
                    params![row.id, row.todo_id, row.text, row.checked, row.order],
                )
                .map(|_| ())
                .map_err(|e| fail("putSubtask", e))?,
            DbOp::DelSubtask { id } => tx
                .execute("DELETE FROM subtasks WHERE id=?1", params![id])
                .map(|_| ())
                .map_err(|e| fail("delSubtask", e))?,
            DbOp::PutActivity { row } => tx
                .execute(
                    "INSERT INTO activity (id, todo_id, type, summary, created_at)
                     VALUES (?1,?2,?3,?4,?5)
                     ON CONFLICT(id) DO UPDATE SET todo_id=?2, type=?3, summary=?4, created_at=?5",
                    params![row.id, row.todo_id, row.kind, row.summary, row.created_at],
                )
                .map(|_| ())
                .map_err(|e| fail("putActivity", e))?,
            DbOp::DelActivity { id } => tx
                .execute("DELETE FROM activity WHERE id=?1", params![id])
                .map(|_| ())
                .map_err(|e| fail("delActivity", e))?,
            DbOp::PutLabel { row } => tx
                .execute(
                    "INSERT INTO color_labels (id, kind, name, color, ord) VALUES (?1,?2,?3,?4,?5)
                     ON CONFLICT(id) DO UPDATE SET kind=?2, name=?3, color=?4, ord=?5",
                    params![row.id, row.kind, row.name, row.color, row.order],
                )
                .map(|_| ())
                .map_err(|e| fail("putLabel", e))?,
            DbOp::DelLabel { id } => tx
                .execute("DELETE FROM color_labels WHERE id=?1", params![id])
                .map(|_| ())
                .map_err(|e| fail("delLabel", e))?,
            DbOp::PutLabelName { row } => tx
                .execute(
                    "INSERT INTO label_names (id, list_id, label_id, name) VALUES (?1,?2,?3,?4)
                     ON CONFLICT(id) DO UPDATE SET list_id=?2, label_id=?3, name=?4",
                    params![row.id, row.list_id, row.label_id, row.name],
                )
                .map(|_| ())
                .map_err(|e| fail("putLabelName", e))?,
            DbOp::DelLabelName { id } => tx
                .execute("DELETE FROM label_names WHERE id=?1", params![id])
                .map(|_| ())
                .map_err(|e| fail("delLabelName", e))?,
        }
    }

    tx.commit().map_err(|e| fail("apply: commit failed", e))
}
