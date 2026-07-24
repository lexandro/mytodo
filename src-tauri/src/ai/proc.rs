//! Short-lived provider process execution (detection / version / test).
//! Structured argv only — never an assembled command string (aiprompt §14).
//! Windows: CREATE_NO_WINDOW so no console flashes (§13). Streaming runs
//! for real AI actions build on a separate runner in AI4.

use std::io::Read;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

#[derive(Debug)]
pub struct ProcOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub timed_out: bool,
}

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Characters cmd.exe treats as metacharacters. A .cmd/.bat shim path
/// containing any of these is rejected instead of quoted-and-hoped-for —
/// cmd.exe quoting rules are not reliably escapable (decision #15).
const CMD_UNSAFE: &[char] = &['&', '|', '<', '>', '^', '%', '!', '"', '\n', '\r'];

fn is_cmd_script(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    lower.ends_with(".cmd") || lower.ends_with(".bat")
}

/// Builds the Command for a provider executable. Real .exe files run
/// directly; npm-style .cmd/.bat shims must go through cmd.exe /C, which is
/// only allowed for metacharacter-free paths. `args` are fixed provider
/// flags chosen by our code — user text never enters the argv as a flag.
pub fn provider_command(path: &str, args: &[&str]) -> Result<Command, String> {
    let mut cmd = if is_cmd_script(path) {
        if path.contains(CMD_UNSAFE) {
            return Err(
                "This script path contains characters cmd.exe cannot pass safely. \
                 Move the CLI to a plain path or select the .exe directly."
                    .into(),
            );
        }
        let mut c = Command::new("cmd.exe");
        c.arg("/C").arg(path);
        c
    } else {
        Command::new(path)
    };
    cmd.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    Ok(cmd)
}

/// Runs to completion with a hard timeout; the child is killed on expiry.
pub fn run_with_timeout(
    mut cmd: Command,
    cwd: Option<&str>,
    timeout: Duration,
) -> Result<ProcOutput, String> {
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }
    cmd.stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let mut child = cmd
        .spawn()
        .map_err(|e| format!("cannot start process: {e}"))?;

    // drain pipes on threads so a chatty child can never dead-lock the wait;
    // bytes are lossy-decoded because CLIs may emit the OEM codepage
    let mut stdout_pipe = child.stdout.take().ok_or("stdout pipe missing")?;
    let mut stderr_pipe = child.stderr.take().ok_or("stderr pipe missing")?;
    let out_thread = std::thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = stdout_pipe.read_to_end(&mut buf);
        String::from_utf8_lossy(&buf).into_owned()
    });
    let err_thread = std::thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = stderr_pipe.read_to_end(&mut buf);
        String::from_utf8_lossy(&buf).into_owned()
    });

    let deadline = Instant::now() + timeout;
    let mut timed_out = false;
    let exit_code = loop {
        match child.try_wait().map_err(|e| format!("wait failed: {e}"))? {
            Some(status) => break status.code(),
            None if Instant::now() >= deadline => {
                timed_out = true;
                // kill the whole TREE: killing only cmd.exe/a shim would leave
                // the real CLI (grandchild) alive holding our pipes open, and
                // the reader joins below would block until it exits
                kill_process_tree(&mut child);
                break None;
            }
            None => std::thread::sleep(Duration::from_millis(40)),
        }
    };

    Ok(ProcOutput {
        stdout: out_thread.join().unwrap_or_default(),
        stderr: err_thread.join().unwrap_or_default(),
        exit_code,
        timed_out,
    })
}

/// Force-kills the child and all of its descendants. On Windows only
/// taskkill /T reaches grandchildren (the real CLI behind a .cmd shim).
pub fn kill_process_tree(child: &mut std::process::Child) {
    #[cfg(windows)]
    {
        let mut kill = Command::new("taskkill");
        kill.args(["/F", "/T", "/PID", &child.id().to_string()]);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            kill.creation_flags(CREATE_NO_WINDOW);
        }
        let _ = kill
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    let _ = child.kill();
    let _ = child.wait();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn runs_a_process_and_captures_stdout() {
        let cmd = provider_command("cmd.exe", &["/C", "echo hello-mytodo"]).expect("cmd");
        let out = run_with_timeout(cmd, None, Duration::from_secs(10)).expect("run");
        assert_eq!(out.exit_code, Some(0));
        assert!(!out.timed_out);
        assert!(out.stdout.contains("hello-mytodo"));
    }

    #[test]
    fn timeout_kills_the_whole_process_tree() {
        // ping runs as cmd.exe's CHILD — only a tree kill releases our pipes
        let cmd = provider_command("cmd.exe", &["/C", "ping -n 30 127.0.0.1 > nul"]).expect("cmd");
        let start = Instant::now();
        let out = run_with_timeout(cmd, None, Duration::from_millis(600)).expect("run");
        assert!(out.timed_out);
        assert!(
            start.elapsed() < Duration::from_secs(10),
            "tree kill must not wait for the grandchild"
        );
    }

    #[test]
    fn cmd_script_with_metacharacters_is_rejected() {
        let err = provider_command("C:\\evil & echo pwned\\codex.cmd", &["--version"]);
        assert!(err.is_err());
    }

    #[test]
    fn exe_paths_never_go_through_cmd() {
        // an exe path with '&' is fine — CreateProcess gets it verbatim
        let ok = provider_command("C:\\tools & more\\claude.exe", &["--version"]);
        assert!(ok.is_ok());
    }
}
