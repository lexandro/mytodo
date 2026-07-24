//! Provider detection and validation (aiprompt §8–§12, §37). The backend
//! owns the allowed executable names per provider — the frontend can only
//! ask about "claude" or "codex", never probe arbitrary commands.

use super::proc::{provider_command, run_with_timeout};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::time::Duration;

const VERSION_TIMEOUT: Duration = Duration::from_secs(10);
const READINESS_TIMEOUT: Duration = Duration::from_secs(10);

/// Windows command resolution order per provider — PATH dirs in order,
/// these names in order within each dir. No drive scanning (§9).
fn exe_names(provider: &str) -> Result<&'static [&'static str], String> {
    match provider {
        "claude" => Ok(&["claude.exe", "claude.cmd", "claude.bat"]),
        "codex" => Ok(&["codex.exe", "codex.cmd", "codex.bat"]),
        other => Err(format!("unknown provider '{other}'")),
    }
}

fn find_in_dirs(dirs: &[PathBuf], names: &[&str]) -> Option<PathBuf> {
    for dir in dirs {
        for name in names {
            let candidate = dir.join(name);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

/// PATH-based auto detection; None = not found (a human message is the
/// frontend's job).
pub fn detect(provider: &str) -> Result<Option<String>, String> {
    let names = exe_names(provider)?;
    let path_var = std::env::var_os("PATH").unwrap_or_default();
    let dirs: Vec<PathBuf> = std::env::split_paths(&path_var).collect();
    Ok(find_in_dirs(&dirs, names).map(|p| p.to_string_lossy().into_owned()))
}

/// Outcome of validating an executable (auto-detected or user-selected).
/// kind: ok | missing | invalid | timeout | identityMismatch
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProbeOutcome {
    pub kind: String,
    pub version_output: Option<String>,
    pub message: Option<String>,
}

fn probe_fail(kind: &str, message: String) -> ProbeOutcome {
    ProbeOutcome {
        kind: kind.into(),
        version_output: None,
        message: Some(message),
    }
}

const ALLOWED_EXTENSIONS: &[&str] = &["exe", "cmd", "bat"];

/// §12: path exists → regular file → allowed type → starts → identity →
/// version. A random executable never becomes "detected".
pub fn probe(provider: &str, path: &str) -> Result<ProbeOutcome, String> {
    exe_names(provider)?; // provider id validation
    let p = Path::new(path);
    if !p.exists() {
        return Ok(probe_fail("missing", "The file does not exist.".into()));
    }
    if !p.is_file() {
        return Ok(probe_fail(
            "invalid",
            "The selected path is not a file.".into(),
        ));
    }
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Ok(probe_fail(
            "invalid",
            format!("'.{ext}' is not an executable type (expected .exe, .cmd or .bat)."),
        ));
    }
    let cmd = match provider_command(path, &["--version"]) {
        Ok(cmd) => cmd,
        Err(message) => return Ok(probe_fail("invalid", message)),
    };
    let out = match run_with_timeout(cmd, None, VERSION_TIMEOUT) {
        Ok(out) => out,
        Err(e) => {
            return Ok(probe_fail(
                "invalid",
                format!("The executable could not be started: {e}"),
            ))
        }
    };
    if out.timed_out {
        return Ok(probe_fail(
            "timeout",
            "The executable did not respond to --version in time.".into(),
        ));
    }
    let combined = format!("{}\n{}", out.stdout, out.stderr);
    if out.exit_code != Some(0) {
        return Ok(probe_fail(
            "invalid",
            format!(
                "--version failed (exit {:?}): {}",
                out.exit_code,
                combined.trim()
            ),
        ));
    }
    // identity: the version banner must mention the provider (§12)
    if !combined.to_ascii_lowercase().contains(provider) {
        return Ok(probe_fail(
            "identityMismatch",
            "The file runs, but its version output does not identify it as this provider.".into(),
        ));
    }
    Ok(ProbeOutcome {
        kind: "ok".into(),
        version_output: Some(out.stdout.trim().to_string()),
        message: None,
    })
}

/// Test = probe + best-effort authentication readiness (§11/§37). Readiness
/// is a capability: codex has `login status`; for claude no stable
/// non-interactive auth query exists across versions → ready stays None.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TestOutcome {
    pub probe: ProbeOutcome,
    /// None = readiness cannot be determined for this provider/version.
    pub ready: Option<bool>,
    pub readiness_message: Option<String>,
}

pub fn test(provider: &str, path: &str) -> Result<TestOutcome, String> {
    let probe_result = probe(provider, path)?;
    if probe_result.kind != "ok" {
        return Ok(TestOutcome {
            probe: probe_result,
            ready: None,
            readiness_message: None,
        });
    }
    let (ready, readiness_message) = match provider {
        "codex" => codex_readiness(path),
        _ => (None, None),
    };
    Ok(TestOutcome {
        probe: probe_result,
        ready,
        readiness_message,
    })
}

fn codex_readiness(path: &str) -> (Option<bool>, Option<String>) {
    let cmd = match provider_command(path, &["login", "status"]) {
        Ok(cmd) => cmd,
        Err(_) => return (None, None),
    };
    match run_with_timeout(cmd, None, READINESS_TIMEOUT) {
        Ok(out) if out.timed_out => (None, None),
        Ok(out) => {
            let combined = format!("{}\n{}", out.stdout, out.stderr).to_ascii_lowercase();
            if out.exit_code == Some(0) && !combined.contains("not logged in") {
                (Some(true), None)
            } else {
                (
                    Some(false),
                    Some(
                        format!("{}\n{}", out.stdout.trim(), out.stderr.trim())
                            .trim()
                            .to_string(),
                    ),
                )
            }
        }
        Err(_) => (None, None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn unknown_provider_is_rejected() {
        assert!(detect("gemini").is_err());
        assert!(probe("gemini", "C:\\x.exe").is_err());
    }

    #[test]
    fn find_in_dirs_respects_dir_then_name_order() {
        let base = std::env::temp_dir().join(format!("mytodo-ai-detect-{}", std::process::id()));
        let dir_a = base.join("a");
        let dir_b = base.join("b");
        fs::create_dir_all(&dir_a).unwrap();
        fs::create_dir_all(&dir_b).unwrap();
        fs::write(dir_a.join("claude.cmd"), "@echo off").unwrap();
        fs::write(dir_b.join("claude.exe"), "MZ").unwrap();
        // dir order wins over the exe>cmd name preference
        let hit = find_in_dirs(
            &[dir_a.clone(), dir_b.clone()],
            &["claude.exe", "claude.cmd"],
        );
        assert_eq!(hit, Some(dir_a.join("claude.cmd")));
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn probe_rejects_missing_nonfile_and_wrong_extension() {
        assert_eq!(
            probe("claude", "C:\\definitely\\missing.exe").unwrap().kind,
            "missing"
        );
        assert_eq!(probe("claude", "C:\\Windows").unwrap().kind, "invalid");
        let txt = std::env::temp_dir().join("mytodo-ai-not-exe.txt");
        fs::write(&txt, "hi").unwrap();
        assert_eq!(
            probe("claude", txt.to_str().unwrap()).unwrap().kind,
            "invalid"
        );
        let _ = fs::remove_file(&txt);
    }

    #[test]
    fn probe_flags_identity_mismatch_for_a_foreign_executable() {
        // a real .cmd that runs fine but never says "claude"
        let dir = std::env::temp_dir().join(format!("mytodo-ai-identity-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let fake = dir.join("claude.cmd");
        fs::write(&fake, "@echo off\r\necho totally-other-tool 9.9.9\r\n").unwrap();
        let outcome = probe("claude", fake.to_str().unwrap()).unwrap();
        assert_eq!(outcome.kind, "identityMismatch");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn probe_accepts_a_matching_version_banner() {
        let dir = std::env::temp_dir().join(format!("mytodo-ai-ok-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let fake = dir.join("codex.cmd");
        fs::write(&fake, "@echo off\r\necho codex-cli 0.5.0\r\n").unwrap();
        let outcome = probe("codex", fake.to_str().unwrap()).unwrap();
        assert_eq!(outcome.kind, "ok", "message: {:?}", outcome.message);
        assert!(outcome.version_output.unwrap().contains("0.5.0"));
        let _ = fs::remove_dir_all(&dir);
    }
}
