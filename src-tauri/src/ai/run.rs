//! Streaming AI run execution (aiprompt §13–§15, §33). One command starts a
//! run; stdout/stderr stream to the frontend as `ai-run:<id>` events; cancel
//! is graceful (taskkill /T) then forced (/F) after a grace period. The
//! backend validates provider, executable, workspace directory, mode and
//! run id — the frontend can never run arbitrary commands (§14). The prompt
//! travels via STDIN, so argv stays a fixed, provider+mode-derived set.

use super::proc::provider_command;
use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;

const GRACEFUL_KILL_GRACE: Duration = Duration::from_secs(3);

/// Live children by run id. Entries are removed when the process exits.
#[derive(Default)]
pub struct AiRunManager {
    children: Arc<Mutex<HashMap<String, Child>>>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum RunEvent {
    #[serde(rename_all = "camelCase")]
    Line { stream: String, line: String },
    #[serde(rename_all = "camelCase")]
    Exit { code: Option<i32> },
}

/// Fixed argv per provider+mode. Analyze/Plan are read-only; Execute maps to
/// the provider's own permission model — NEVER a full bypass (§15: no
/// dangerously-skip-permissions or equivalent).
fn build_args(provider: &str, mode: &str) -> Result<Vec<&'static str>, String> {
    let read_only = match mode {
        "analyze" | "plan" => true,
        "execute" => false,
        other => return Err(format!("unknown mode '{other}'")),
    };
    match provider {
        "claude" => {
            let mut args = vec!["-p", "--output-format", "stream-json", "--verbose"];
            if read_only {
                args.extend(["--permission-mode", "plan"]);
            } else {
                args.extend(["--permission-mode", "acceptEdits"]);
            }
            Ok(args)
        }
        "codex" => {
            let mut args = vec!["exec", "--json", "--skip-git-repo-check"];
            if read_only {
                args.extend(["--sandbox", "read-only"]);
            } else {
                args.extend(["--sandbox", "workspace-write"]);
            }
            args.push("-"); // prompt from stdin
            Ok(args)
        }
        other => Err(format!("unknown provider '{other}'")),
    }
}

fn validate_run_id(run_id: &str) -> Result<(), String> {
    let ok = !run_id.is_empty()
        && run_id.len() <= 64
        && run_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if ok {
        Ok(())
    } else {
        Err("invalid run id".into())
    }
}

fn validate_executable(path: &str) -> Result<(), String> {
    let p = std::path::Path::new(path);
    if !p.is_file() {
        return Err("The configured AI client executable no longer exists.".into());
    }
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if !["exe", "cmd", "bat"].contains(&ext.as_str()) {
        return Err("The configured AI client path is not an executable.".into());
    }
    Ok(())
}

/// Spawns the provider process and streams its output as events. Returns
/// once the process is RUNNING; completion arrives as an Exit event.
pub fn start(
    app: tauri::AppHandle,
    manager: &AiRunManager,
    run_id: String,
    provider: String,
    exe_path: String,
    workspace_dir: String,
    mode: String,
    prompt: String,
) -> Result<(), String> {
    validate_run_id(&run_id)?;
    validate_executable(&exe_path)?;
    if !std::path::Path::new(&workspace_dir).is_dir() {
        return Err("Workspace not found.".into());
    }
    let args = build_args(&provider, &mode)?;
    {
        let children = self_lock(&manager.children)?;
        if children.contains_key(&run_id) {
            return Err("This run is already active.".into());
        }
    }

    let mut cmd = provider_command(&exe_path, &args)?;
    cmd.current_dir(&workspace_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let mut child = cmd
        .spawn()
        .map_err(|e| format!("The AI client could not be started: {e}"))?;

    // prompt via stdin: no cmdline length limits, argv stays fixed
    let mut stdin = child.stdin.take().ok_or("stdin pipe missing")?;
    std::thread::spawn(move || {
        let _ = stdin.write_all(prompt.as_bytes());
        // drop closes the pipe — the CLI sees EOF and starts working
    });

    let stdout = child.stdout.take().ok_or("stdout pipe missing")?;
    let stderr = child.stderr.take().ok_or("stderr pipe missing")?;
    spawn_line_reader(app.clone(), run_id.clone(), "stdout", stdout);
    spawn_line_reader(app.clone(), run_id.clone(), "stderr", stderr);

    self_lock(&manager.children)?.insert(run_id.clone(), child);

    // waiter thread: emits Exit and removes the child from the registry
    let children = Arc::clone(&manager.children);
    std::thread::spawn(move || {
        let code = loop {
            std::thread::sleep(Duration::from_millis(120));
            let mut guard = match children.lock() {
                Ok(g) => g,
                Err(_) => return,
            };
            match guard.get_mut(&run_id).map(|c| c.try_wait()) {
                None => return, // cancel already reaped it
                Some(Ok(Some(status))) => {
                    guard.remove(&run_id);
                    break status.code();
                }
                Some(Ok(None)) => continue,
                Some(Err(_)) => {
                    guard.remove(&run_id);
                    break None;
                }
            }
        };
        emit(&app, &run_id, &RunEvent::Exit { code });
    });
    Ok(())
}

/// Graceful stop, then force after the grace period (§33). The Exit event
/// still arrives from the waiter thread when the process dies.
pub fn cancel(manager: &AiRunManager, run_id: &str) -> Result<(), String> {
    validate_run_id(run_id)?;
    let pid = {
        let guard = self_lock(&manager.children)?;
        match guard.get(run_id) {
            Some(child) => child.id(),
            None => return Ok(()), // already finished — cancel is a no-op
        }
    };
    taskkill(pid, false);
    let children = Arc::clone(&manager.children);
    let run_id = run_id.to_string();
    std::thread::spawn(move || {
        std::thread::sleep(GRACEFUL_KILL_GRACE);
        let still_running = children
            .lock()
            .map(|guard| guard.contains_key(&run_id))
            .unwrap_or(false);
        if still_running {
            taskkill(pid, true);
        }
    });
    Ok(())
}

fn spawn_line_reader(
    app: tauri::AppHandle,
    run_id: String,
    stream: &'static str,
    pipe: impl std::io::Read + Send + 'static,
) {
    std::thread::spawn(move || {
        let mut reader = BufReader::new(pipe);
        let mut buf = Vec::new();
        loop {
            buf.clear();
            match reader.read_until(b'\n', &mut buf) {
                Ok(0) | Err(_) => break,
                Ok(_) => {
                    let line = String::from_utf8_lossy(&buf).trim_end().to_string();
                    if !line.is_empty() {
                        emit(
                            &app,
                            &run_id,
                            &RunEvent::Line {
                                stream: stream.into(),
                                line,
                            },
                        );
                    }
                }
            }
        }
    });
}

fn emit(app: &tauri::AppHandle, run_id: &str, event: &RunEvent) {
    use tauri::Emitter;
    let _ = app.emit(&format!("ai-run:{run_id}"), event);
}

/// taskkill /T reaches the real CLI behind cmd.exe shims; without /F it is
/// the polite variant, with /F the forced one.
fn taskkill(pid: u32, force: bool) {
    use std::process::Command;
    let mut cmd = Command::new("taskkill");
    if force {
        cmd.arg("/F");
    }
    cmd.args(["/T", "/PID", &pid.to_string()]);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    let _ = cmd
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
}

fn self_lock<'a, T>(m: &'a Arc<Mutex<T>>) -> Result<std::sync::MutexGuard<'a, T>, String> {
    m.lock()
        .map_err(|_| "AI run registry lock poisoned".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn args_never_contain_permission_bypass() {
        for provider in ["claude", "codex"] {
            for mode in ["analyze", "plan", "execute"] {
                let args = build_args(provider, mode).expect("args");
                assert!(
                    !args
                        .iter()
                        .any(|a| a.contains("dangerously") || a.contains("bypass")),
                    "{provider}/{mode} must not bypass permissions: {args:?}"
                );
            }
        }
    }

    #[test]
    fn read_only_modes_map_to_read_only_flags() {
        let claude = build_args("claude", "analyze").unwrap();
        assert!(claude
            .windows(2)
            .any(|w| w == ["--permission-mode", "plan"]));
        let codex = build_args("codex", "plan").unwrap();
        assert!(codex.windows(2).any(|w| w == ["--sandbox", "read-only"]));
    }

    #[test]
    fn execute_maps_to_workspace_scoped_write() {
        let claude = build_args("claude", "execute").unwrap();
        assert!(claude
            .windows(2)
            .any(|w| w == ["--permission-mode", "acceptEdits"]));
        let codex = build_args("codex", "execute").unwrap();
        assert!(codex
            .windows(2)
            .any(|w| w == ["--sandbox", "workspace-write"]));
    }

    #[test]
    fn unknown_provider_or_mode_rejected() {
        assert!(build_args("gemini", "analyze").is_err());
        assert!(build_args("claude", "yolo").is_err());
    }

    #[test]
    fn run_ids_are_strictly_validated() {
        assert!(validate_run_id("run_a-1").is_ok());
        assert!(validate_run_id("").is_err());
        assert!(validate_run_id("evil id").is_err());
        assert!(validate_run_id("a:b").is_err());
        assert!(validate_run_id(&"x".repeat(65)).is_err());
    }
}
