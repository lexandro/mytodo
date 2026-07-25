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

/// Argv per provider+mode, plus the two caller-supplied values a
/// conversation needs: the model and the session to resume. Analyze/Plan are
/// read-only; Execute maps to the provider's own permission model — NEVER a
/// full bypass (§15: no dangerously-skip-permissions or equivalent).
///
/// `codex exec resume` has no --sandbox flag, so the sandbox travels as a
/// `-c sandbox_mode=…` config override there: a resumed turn can never end
/// up with weaker isolation than the mode the user chose.
fn build_args(
    provider: &str,
    mode: &str,
    model: Option<&str>,
    resume_session: Option<&str>,
) -> Result<Vec<String>, String> {
    let read_only = match mode {
        "analyze" | "plan" => true,
        "execute" => false,
        other => return Err(format!("unknown mode '{other}'")),
    };
    if let Some(name) = model {
        validate_model(name)?;
    }
    if let Some(session) = resume_session {
        validate_session_id(session)?;
    }
    let mut args: Vec<String> = Vec::new();
    match provider {
        "claude" => {
            args.extend(["-p", "--output-format", "stream-json", "--verbose"].map(String::from));
            args.push("--permission-mode".into());
            args.push(if read_only {
                "plan".into()
            } else {
                "acceptEdits".into()
            });
            if let Some(session) = resume_session {
                args.push("--resume".into());
                args.push(session.into());
            }
            if let Some(name) = model {
                args.push("--model".into());
                args.push(name.into());
            }
        }
        "codex" => {
            let sandbox = if read_only {
                "read-only"
            } else {
                "workspace-write"
            };
            args.push("exec".into());
            if resume_session.is_some() {
                args.push("resume".into());
                args.push("-c".into());
                args.push(format!("sandbox_mode=\"{sandbox}\""));
            }
            args.extend(["--json", "--skip-git-repo-check"].map(String::from));
            if resume_session.is_none() {
                args.push("--sandbox".into());
                args.push(sandbox.into());
            }
            if let Some(name) = model {
                args.push("-m".into());
                args.push(name.into());
            }
            if let Some(session) = resume_session {
                args.push(session.into()); // positional SESSION_ID
            }
            args.push("-".into()); // prompt from stdin
        }
        other => return Err(format!("unknown provider '{other}'")),
    }
    Ok(args)
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

/// Model names come from the user (custom field), so they are validated
/// before entering argv: a value starting with '-' would be read as a flag.
/// Mirrors isValidModelName in src/lib/core/ai-models.ts.
fn validate_model(model: &str) -> Result<(), String> {
    let ok = !model.is_empty()
        && model.len() <= 64
        && !model.starts_with('-')
        && model
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '/' | ':' | '-'));
    if ok {
        Ok(())
    } else {
        Err(format!("invalid model name '{model}'"))
    }
}

/// Session ids are echoed back from the provider's own stream (UUIDs and
/// similar), never typed by a human — validated all the same.
fn validate_session_id(session: &str) -> Result<(), String> {
    let ok = !session.is_empty()
        && session.len() <= 64
        && !session.starts_with('-')
        && session
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'));
    if ok {
        Ok(())
    } else {
        Err("invalid session id".into())
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

/// One run's start parameters as they arrive from the frontend
/// (src/lib/ipc.ts AiRunStartRequest).
#[derive(serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StartRequest {
    pub run_id: String,
    pub provider: String,
    pub exe_path: String,
    pub workspace_dir: String,
    pub mode: String,
    pub prompt: String,
    /// None = let the client use its own default model.
    #[serde(default)]
    pub model: Option<String>,
    /// Some = continue that provider session instead of starting a new one.
    #[serde(default)]
    pub resume_session_id: Option<String>,
}

/// Spawns the provider process and streams its output as events. Returns
/// once the process is RUNNING; completion arrives as an Exit event.
pub fn start(
    app: tauri::AppHandle,
    manager: &AiRunManager,
    req: StartRequest,
) -> Result<(), String> {
    let StartRequest {
        run_id,
        provider,
        exe_path,
        workspace_dir,
        mode,
        prompt,
        model,
        resume_session_id,
    } = req;
    validate_run_id(&run_id)?;
    validate_executable(&exe_path)?;
    if !std::path::Path::new(&workspace_dir).is_dir() {
        return Err("Workspace not found.".into());
    }
    let args = build_args(
        &provider,
        &mode,
        model.as_deref(),
        resume_session_id.as_deref(),
    )?;
    {
        let children = self_lock(&manager.children)?;
        if children.contains_key(&run_id) {
            return Err("This run is already active.".into());
        }
    }

    let arg_refs: Vec<&str> = args.iter().map(String::as_str).collect();
    let mut cmd = provider_command(&exe_path, &arg_refs)?;
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

    fn args(provider: &str, mode: &str) -> Vec<String> {
        build_args(provider, mode, None, None).expect("args")
    }

    fn has_pair(args: &[String], a: &str, b: &str) -> bool {
        args.windows(2).any(|w| w[0] == a && w[1] == b)
    }

    #[test]
    fn args_never_contain_permission_bypass() {
        for provider in ["claude", "codex"] {
            for mode in ["analyze", "plan", "execute"] {
                for resume in [None, Some("sess-1")] {
                    let args = build_args(provider, mode, Some("sonnet"), resume).expect("args");
                    assert!(
                        !args
                            .iter()
                            .any(|a| a.contains("dangerously") || a.contains("bypass")),
                        "{provider}/{mode} must not bypass permissions: {args:?}"
                    );
                }
            }
        }
    }

    #[test]
    fn read_only_modes_map_to_read_only_flags() {
        assert!(has_pair(
            &args("claude", "analyze"),
            "--permission-mode",
            "plan"
        ));
        assert!(has_pair(&args("codex", "plan"), "--sandbox", "read-only"));
    }

    #[test]
    fn execute_maps_to_workspace_scoped_write() {
        assert!(has_pair(
            &args("claude", "execute"),
            "--permission-mode",
            "acceptEdits"
        ));
        assert!(has_pair(
            &args("codex", "execute"),
            "--sandbox",
            "workspace-write"
        ));
    }

    #[test]
    fn unknown_provider_or_mode_rejected() {
        assert!(build_args("gemini", "analyze", None, None).is_err());
        assert!(build_args("claude", "yolo", None, None).is_err());
    }

    #[test]
    fn model_is_passed_with_each_provider_own_flag() {
        assert!(has_pair(
            &build_args("claude", "analyze", Some("sonnet"), None).unwrap(),
            "--model",
            "sonnet"
        ));
        assert!(has_pair(
            &build_args("codex", "analyze", Some("openai/terra"), None).unwrap(),
            "-m",
            "openai/terra"
        ));
        // no model chosen → no flag at all, the client keeps its own default
        assert!(!args("claude", "analyze").iter().any(|a| a == "--model"));
        assert!(!args("codex", "analyze").iter().any(|a| a == "-m"));
    }

    #[test]
    fn claude_resume_keeps_the_permission_mode() {
        let args = build_args("claude", "analyze", None, Some("sess-1")).unwrap();
        assert!(has_pair(&args, "--resume", "sess-1"));
        assert!(has_pair(&args, "--permission-mode", "plan"));
    }

    #[test]
    fn codex_resume_carries_the_sandbox_as_a_config_override() {
        // `codex exec resume` has no --sandbox flag, so a resumed turn would
        // otherwise fall back to the user's config default
        let args = build_args("codex", "analyze", None, Some("sess-1")).unwrap();
        assert_eq!(args[0], "exec");
        assert_eq!(args[1], "resume");
        assert!(has_pair(&args, "-c", "sandbox_mode=\"read-only\""));
        assert!(!args.iter().any(|a| a == "--sandbox"));
        assert_eq!(args.last().map(String::as_str), Some("-"));
        // the session id stays positional, right before the stdin marker
        assert_eq!(args[args.len() - 2], "sess-1");

        let execute = build_args("codex", "execute", None, Some("s2")).unwrap();
        assert!(has_pair(&execute, "-c", "sandbox_mode=\"workspace-write\""));
    }

    #[test]
    fn run_ids_are_strictly_validated() {
        assert!(validate_run_id("run_a-1").is_ok());
        assert!(validate_run_id("").is_err());
        assert!(validate_run_id("evil id").is_err());
        assert!(validate_run_id("a:b").is_err());
        assert!(validate_run_id(&"x".repeat(65)).is_err());
    }

    #[test]
    fn model_and_session_values_can_never_smuggle_a_flag() {
        assert!(validate_model("sonnet").is_ok());
        assert!(validate_model("openai/luna").is_ok());
        assert!(validate_model("claude-opus-5").is_ok());
        assert!(validate_model("--dangerously-skip-permissions").is_err());
        assert!(validate_model("sonnet --sandbox danger-full-access").is_err());
        assert!(validate_model("").is_err());
        assert!(validate_model(&"x".repeat(65)).is_err());

        assert!(validate_session_id("0199f0a1-2b3c-4d5e-8f90-abcdef012345").is_ok());
        assert!(validate_session_id("--last").is_err());
        assert!(validate_session_id("a b").is_err());

        // and the builder refuses them too, before anything is spawned
        assert!(build_args("claude", "analyze", Some("--evil"), None).is_err());
        assert!(build_args("codex", "analyze", None, Some("--last")).is_err());
    }
}
