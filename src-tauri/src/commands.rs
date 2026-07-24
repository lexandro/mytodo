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

// ── AI run history (AI Workspace Integration V1) ────────────────────────────

#[tauri::command]
pub fn ai_runs_load(state: State<'_, DbState>) -> Result<Vec<db::ai_runs::AiRun>, String> {
    with_conn(&state, |conn| db::ai_runs::load_all(conn))
}

#[tauri::command]
pub fn ai_run_put(state: State<'_, DbState>, run: db::ai_runs::AiRun) -> Result<(), String> {
    with_conn(&state, |conn| db::ai_runs::put(conn, &run))
}

// ── backup / restore ────────────────────────────────────────────────────────

#[tauri::command]
pub fn backup_now() -> Result<String, String> {
    db::backup::backup_now()
}

#[tauri::command]
pub fn list_backups() -> Result<Vec<String>, String> {
    db::backup::list_backups()
}

/// Restore: close the live connection, swap the file, reopen. The frontend
/// reloads its full state afterwards.
#[tauri::command]
pub fn restore_backup(state: State<'_, DbState>, file_name: String) -> Result<(), String> {
    let mut guard = state
        .conn
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    // drop the open connection so the file can be replaced
    *guard = None;
    let result = db::backup::restore_backup(&file_name);
    // reopen regardless of the restore outcome — never leave the app dead
    let reopened = crate::paths::db_path().and_then(|p| db::open(&p));
    match reopened {
        Ok(conn) => *guard = Some(conn),
        Err(e) => return Err(format!("database reopen failed after restore: {e}")),
    }
    result
}

// ── app shortcuts (Desktop / Start Menu .lnk, v1.1) ─────────────────────────

#[cfg(windows)]
#[tauri::command]
pub fn app_shortcut_status() -> Result<crate::winint::app_shortcut::ShortcutStatus, String> {
    crate::winint::app_shortcut::shortcut_status()
}

#[cfg(not(windows))]
#[tauri::command]
pub fn app_shortcut_status() -> Result<(), String> {
    Err("shortcut detection is Windows-only".into())
}

#[cfg(windows)]
#[tauri::command]
pub fn create_app_shortcuts(desktop: bool, start_menu: bool) -> Result<(), String> {
    crate::winint::app_shortcut::create_app_shortcuts(desktop, start_menu)
}

#[cfg(not(windows))]
#[tauri::command]
pub fn create_app_shortcuts(_desktop: bool, _start_menu: bool) -> Result<(), String> {
    Err("shortcut creation is Windows-only".into())
}

// ── Windows integration (Summon Workspace, Quick Add window) ────────────────

#[cfg(windows)]
#[tauri::command]
pub fn summon_workspace(
    app: tauri::AppHandle,
    toggle: bool,
) -> Result<crate::winint::summon::SummonResult, String> {
    crate::winint::summon::summon_workspace(&app, toggle)
}

#[cfg(not(windows))]
#[tauri::command]
pub fn summon_workspace(_toggle: bool) -> Result<(), String> {
    Err("Summon Workspace is Windows-only".into())
}

#[cfg(windows)]
#[tauri::command]
pub fn show_quick_add(app: tauri::AppHandle) -> Result<(), String> {
    crate::winint::summon::show_quick_add(&app)
}

#[cfg(not(windows))]
#[tauri::command]
pub fn show_quick_add() -> Result<(), String> {
    Err("Quick Add window is Windows-only".into())
}
