//! Portable data paths: all user data lives NEXT TO the exe (`data/`,
//! `backup/`) so copying the folder moves the data with it.
//! In dev mode the exe runs under `target/debug/`, so data lands there too.

use std::path::PathBuf;

/// Sibling directory of the exe with the given name (created if missing).
fn exe_sibling_dir(name: &str) -> Result<PathBuf, String> {
    let exe =
        std::env::current_exe().map_err(|e| format!("cannot resolve executable path: {e}"))?;
    let parent = exe
        .parent()
        .ok_or_else(|| "executable has no parent directory".to_string())?;
    let dir = parent.join(name);
    std::fs::create_dir_all(&dir).map_err(|e| format!("cannot create {}: {e}", dir.display()))?;
    Ok(dir)
}

pub fn data_dir() -> Result<PathBuf, String> {
    exe_sibling_dir("data")
}

pub fn db_path() -> Result<PathBuf, String> {
    Ok(data_dir()?.join("todo.db"))
}
