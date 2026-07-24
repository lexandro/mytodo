//! Linked-workspace directory checks (aiprompt §3–4): existence, readability
//! and Git detection. Pure filesystem probing — no process execution, no
//! drive scanning. Unicode and space-containing paths work because only
//! std::path operations are used.

use serde::Serialize;
use std::path::Path;

#[derive(Serialize, Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStatus {
    pub exists: bool,
    pub readable: bool,
    pub git: bool,
}

pub fn check(path: &str) -> WorkspaceStatus {
    let p = Path::new(path);
    let exists = p.is_dir();
    let readable = exists && std::fs::read_dir(p).is_ok();
    // .git is a directory in a normal clone and a FILE in worktrees/submodules
    let git = readable && p.join(".git").exists();
    WorkspaceStatus {
        exists,
        readable,
        git,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    /// Unique temp dir per test; removed on drop.
    struct TempDir(PathBuf);
    impl TempDir {
        fn new(name: &str) -> Self {
            let dir =
                std::env::temp_dir().join(format!("mytodo-ws-test-{name}-{}", std::process::id()));
            let _ = fs::remove_dir_all(&dir);
            fs::create_dir_all(&dir).expect("create temp dir");
            TempDir(dir)
        }
        fn path(&self) -> &Path {
            &self.0
        }
    }
    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn plain_directory_is_generic() {
        let dir = TempDir::new("generic");
        let status = check(dir.path().to_str().unwrap());
        assert_eq!(
            status,
            WorkspaceStatus {
                exists: true,
                readable: true,
                git: false
            }
        );
    }

    #[test]
    fn git_dir_and_git_file_both_detected() {
        let repo = TempDir::new("git-dir");
        fs::create_dir(repo.path().join(".git")).expect("mk .git");
        assert!(check(repo.path().to_str().unwrap()).git);

        let worktree = TempDir::new("git-file");
        fs::write(worktree.path().join(".git"), "gitdir: ../elsewhere").expect("write .git file");
        assert!(check(worktree.path().to_str().unwrap()).git);
    }

    #[test]
    fn missing_path_reports_not_existing() {
        let status = check("C:\\definitely\\missing\\mytodo-ws-test-nowhere");
        assert_eq!(
            status,
            WorkspaceStatus {
                exists: false,
                readable: false,
                git: false
            }
        );
    }

    #[test]
    fn a_file_is_not_a_workspace() {
        let dir = TempDir::new("file-not-dir");
        let file = dir.path().join("plain.txt");
        fs::write(&file, "x").expect("write");
        let status = check(file.to_str().unwrap());
        assert!(
            !status.exists,
            "a regular file must not count as a directory"
        );
    }

    #[test]
    fn unicode_path_with_spaces_works() {
        let dir = TempDir::new("árvíztűrő tükörfúrógép");
        let status = check(dir.path().to_str().unwrap());
        assert!(status.exists && status.readable);
    }
}
