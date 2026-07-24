//! Schema versioning: `PRAGMA user_version` holds the current version; entry
//! i of MIGRATIONS upgrades to version i+1. A schema change is a NEW array
//! entry — existing entries are never modified.

use rusqlite::Connection;

const MIGRATIONS: &[&str] = &[
    // v1 — full base schema
    "
    CREATE TABLE lists (
        id    TEXT PRIMARY KEY,
        name  TEXT NOT NULL,
        emoji TEXT NOT NULL DEFAULT '',
        fixed INTEGER NOT NULL DEFAULT 0,
        ord   REAL NOT NULL
    );
    CREATE TABLE groups (
        id        TEXT PRIMARY KEY,
        list_id   TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        parent_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
        name      TEXT NOT NULL,
        emoji     TEXT NOT NULL DEFAULT '',
        ord       REAL NOT NULL,
        collapsed INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX idx_groups_list ON groups(list_id);
    CREATE TABLE todos (
        id             TEXT PRIMARY KEY,
        list_id        TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        group_id       TEXT REFERENCES groups(id) ON DELETE SET NULL,
        title          TEXT NOT NULL,
        description    TEXT NOT NULL DEFAULT '',
        status         TEXT NOT NULL DEFAULT 'open',
        emoji          TEXT NOT NULL DEFAULT '',
        color_label_id TEXT,
        pin_local      INTEGER NOT NULL DEFAULT 0,
        pin_global     INTEGER NOT NULL DEFAULT 0,
        archived       INTEGER NOT NULL DEFAULT 0,
        trashed        INTEGER NOT NULL DEFAULT 0,
        trashed_at     INTEGER,
        ord            REAL NOT NULL,
        created_at     INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL
    );
    CREATE INDEX idx_todos_list ON todos(list_id);
    CREATE INDEX idx_todos_group ON todos(group_id);
    CREATE TABLE subtasks (
        id      TEXT PRIMARY KEY,
        todo_id TEXT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
        text    TEXT NOT NULL,
        checked INTEGER NOT NULL DEFAULT 0,
        ord     REAL NOT NULL
    );
    CREATE INDEX idx_subtasks_todo ON subtasks(todo_id);
    CREATE TABLE activity (
        id         TEXT PRIMARY KEY,
        todo_id    TEXT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
        type       TEXT NOT NULL,
        summary    TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );
    CREATE INDEX idx_activity_todo ON activity(todo_id);
    CREATE TABLE color_labels (
        id    TEXT PRIMARY KEY,
        name  TEXT,
        color TEXT NOT NULL,
        ord   REAL NOT NULL
    );
    CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    ",
    // v2 — AI run history (AI Workspace Integration V1). log/result hold
    // opaque JSON; parsing and validation live in src/lib/core/ai-runs.ts.
    "
    CREATE TABLE ai_runs (
        id          TEXT PRIMARY KEY,
        list_id     TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        todo_id     TEXT REFERENCES todos(id) ON DELETE SET NULL,
        provider    TEXT NOT NULL,
        action      TEXT NOT NULL,
        mode        TEXT NOT NULL,
        status      TEXT NOT NULL,
        started_at  INTEGER NOT NULL,
        finished_at INTEGER,
        session_id  TEXT,
        log         TEXT NOT NULL DEFAULT '[]',
        result      TEXT,
        error       TEXT
    );
    CREATE INDEX idx_ai_runs_list ON ai_runs(list_id);
    ",
];

pub fn migrate(conn: &mut Connection) -> Result<(), String> {
    let current: i64 = conn
        .query_row("PRAGMA user_version", [], |r| r.get(0))
        .map_err(|e| format!("cannot read schema version: {e}"))?;
    for (i, sql) in MIGRATIONS.iter().enumerate().skip(current as usize) {
        let target = (i + 1) as i64;
        let tx = conn
            .transaction()
            .map_err(|e| format!("migration {target}: cannot open transaction: {e}"))?;
        tx.execute_batch(sql)
            .map_err(|e| format!("migration {target} failed: {e}"))?;
        tx.pragma_update(None, "user_version", target)
            .map_err(|e| format!("migration {target}: cannot bump version: {e}"))?;
        tx.commit()
            .map_err(|e| format!("migration {target}: commit failed: {e}"))?;
    }
    Ok(())
}
