//! Tauri IPC commands — the ONLY surface the frontend can reach. Keep it
//! minimal: load once, apply diff batches, read/write settings.

use crate::db::{self, model::*};
use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

/// Connection is None when opening the database failed at startup; commands
/// then return the stored error so the UI can show a clear failure state.
pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
    pub init_error: Option<String>,
}

impl DbState {
    pub fn init() -> Self {
        match crate::paths::db_path().and_then(|p| db::open(&p)) {
            Ok(conn) => Self {
                conn: Mutex::new(Some(conn)),
                init_error: None,
            },
            Err(e) => Self {
                conn: Mutex::new(None),
                init_error: Some(e),
            },
        }
    }
}

fn with_conn<T>(
    state: &State<'_, DbState>,
    f: impl FnOnce(&mut Connection) -> Result<T, String>,
) -> Result<T, String> {
    let mut guard = state
        .conn
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    match guard.as_mut() {
        Some(conn) => f(conn),
        None => Err(state
            .init_error
            .clone()
            .unwrap_or_else(|| "database unavailable".to_string())),
    }
}

#[tauri::command]
pub fn db_load_all(state: State<'_, DbState>) -> Result<DomainData, String> {
    with_conn(&state, |conn| db::load::load_all(conn))
}

#[tauri::command]
pub fn db_apply(state: State<'_, DbState>, ops: Vec<DbOp>) -> Result<(), String> {
    with_conn(&state, |conn| db::write::apply_ops(conn, &ops))
}

#[tauri::command]
pub fn settings_all(
    state: State<'_, DbState>,
) -> Result<HashMap<String, serde_json::Value>, String> {
    with_conn(&state, |conn| db::settings_all(conn))
}

#[tauri::command]
pub fn settings_set(
    state: State<'_, DbState>,
    key: String,
    value: serde_json::Value,
) -> Result<(), String> {
    with_conn(&state, |conn| db::settings_set(conn, &key, &value))
}
