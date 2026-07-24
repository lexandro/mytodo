//! Automatic + manual database backups (daprompt §5) and restore.
//! `VACUUM INTO` produces a consistent single-file copy even in WAL mode;
//! backups run on their own connection so the UI never blocks.

use crate::paths;
use rusqlite::Connection;
use std::path::{Path, PathBuf};

const KEEP_BACKUPS: usize = 10;

fn backup_file_for_today() -> Result<PathBuf, String> {
    let date = chrono::Local::now().format("%Y-%m-%d");
    Ok(paths::backup_dir()?.join(format!("todo-{date}.db")))
}

fn vacuum_into(target: &Path) -> Result<(), String> {
    let source = paths::db_path()?;
    let conn = Connection::open(&source)
        .map_err(|e| format!("backup: cannot open database: {e}"))?;
    if target.exists() {
        std::fs::remove_file(target)
            .map_err(|e| format!("backup: cannot replace {}: {e}", target.display()))?;
    }
    let target_str = target
        .to_str()
        .ok_or_else(|| "backup: non-UTF8 target path".to_string())?
        .replace('\'', "''");
    conn.execute_batch(&format!("VACUUM INTO '{target_str}'"))
        .map_err(|e| format!("backup failed: {e}"))
}

/// Keeps only the newest KEEP_BACKUPS date-named files.
fn prune() -> Result<(), String> {
    let dir = paths::backup_dir()?;
    let mut files: Vec<PathBuf> = std::fs::read_dir(&dir)
        .map_err(|e| format!("backup: cannot list {}: {e}", dir.display()))?
        .filter_map(|entry| entry.ok().map(|e| e.path()))
        .filter(|p| {
            p.extension().is_some_and(|ext| ext == "db")
                && p.file_name()
                    .and_then(|n| n.to_str())
                    .is_some_and(|n| n.starts_with("todo-"))
        })
        .collect();
    // date-stamped names sort chronologically
    files.sort();
    while files.len() > KEEP_BACKUPS {
        let oldest = files.remove(0);
        let _ = std::fs::remove_file(oldest);
    }
    Ok(())
}

/// Manual "Backup Now" + the daily startup backup. Returns the file name.
pub fn backup_now() -> Result<String, String> {
    let target = backup_file_for_today()?;
    vacuum_into(&target)?;
    prune()?;
    Ok(target
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("backup")
        .to_string())
}

/// Startup: back up once per day, in the background.
pub fn daily_backup_if_needed() {
    std::thread::spawn(|| {
        let run = || -> Result<bool, String> {
            let target = backup_file_for_today()?;
            if target.exists() {
                return Ok(false);
            }
            vacuum_into(&target)?;
            prune()?;
            Ok(true)
        };
        match run() {
            Ok(true) => log::info!("daily backup created"),
            Ok(false) => {}
            Err(e) => log::warn!("daily backup failed: {e}"),
        }
    });
}

pub fn list_backups() -> Result<Vec<String>, String> {
    let dir = paths::backup_dir()?;
    let mut names: Vec<String> = std::fs::read_dir(&dir)
        .map_err(|e| format!("cannot list backups: {e}"))?
        .filter_map(|entry| entry.ok())
        .filter_map(|e| e.file_name().to_str().map(String::from))
        .filter(|n| n.starts_with("todo-") && n.ends_with(".db"))
        .collect();
    names.sort();
    names.reverse(); // newest first
    Ok(names)
}

/// Atomic-ish restore (daprompt §6): a safety backup of the CURRENT data is
/// taken first, then the chosen backup replaces the live database file.
/// The caller must have closed the live connection before calling this.
pub fn restore_backup(file_name: &str) -> Result<(), String> {
    // the name must be one of our own backup files — no path traversal
    if !file_name.starts_with("todo-") || !file_name.ends_with(".db") || file_name.contains(['/', '\\'])
    {
        return Err("invalid backup file name".into());
    }
    let source = paths::backup_dir()?.join(file_name);
    if !source.exists() {
        return Err(format!("backup {file_name} not found"));
    }
    let db = paths::db_path()?;
    // safety copy of the current state before overwriting anything
    let safety = paths::backup_dir()?.join("pre-restore.db");
    vacuum_into(&safety)?;
    // remove WAL sidecars so the restored file opens clean
    for suffix in ["-wal", "-shm"] {
        let sidecar = PathBuf::from(format!("{}{}", db.display(), suffix));
        if sidecar.exists() {
            let _ = std::fs::remove_file(sidecar);
        }
    }
    std::fs::copy(&source, &db).map_err(|e| format!("restore copy failed: {e}"))?;
    Ok(())
}
