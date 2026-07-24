//! Desktop / Start Menu shortcut detection and creation for the portable
//! build (v1.1). Documented shell APIs only: SHGetKnownFolderPath +
//! IShellLinkW/IPersistFile. Installed (NSIS/MSI) copies already own a
//! "mytodo.lnk", which this detection naturally treats as present
//! (Windows file names are case-insensitive).

use std::path::PathBuf;
use windows::core::{Interface, HSTRING, PCWSTR};
use windows::Win32::Storage::FileSystem::WIN32_FIND_DATAW;
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, IPersistFile,
    CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED, STGM_READ,
};
use windows::Win32::UI::Shell::{
    FOLDERID_Desktop, FOLDERID_Programs, IShellLinkW, SHGetKnownFolderPath, ShellLink,
    KF_FLAG_DEFAULT,
};

const LNK_NAME: &str = "myTODO.lnk";

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LnkState {
    pub exists: bool,
    pub target: Option<String>,
    pub target_exists: bool,
    pub points_here: bool,
}

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutStatus {
    pub desktop: LnkState,
    pub start_menu: LnkState,
    pub exe_path: String,
}

fn with_com<T>(f: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
    // S_FALSE (already initialized) is fine; only balance a successful init
    let hr = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
    let inited = hr.is_ok();
    let result = f();
    if inited {
        unsafe { CoUninitialize() };
    }
    result
}

fn known_folder(id: &windows::core::GUID) -> Result<PathBuf, String> {
    let raw = unsafe { SHGetKnownFolderPath(id, KF_FLAG_DEFAULT, None) }
        .map_err(|e| format!("SHGetKnownFolderPath: {e}"))?;
    let path = unsafe { raw.to_string() }.map_err(|e| format!("folder path: {e}"))?;
    unsafe { CoTaskMemFree(Some(raw.as_ptr() as *const _)) };
    Ok(PathBuf::from(path))
}

/// Resolved target of a .lnk file (None when unreadable).
fn lnk_target(lnk_path: &PathBuf) -> Option<String> {
    let link: IShellLinkW =
        unsafe { CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER) }.ok()?;
    let file: IPersistFile = link.cast().ok()?;
    unsafe { file.Load(&HSTRING::from(lnk_path.as_path()), STGM_READ) }.ok()?;
    let mut buf = [0u16; 1024];
    let mut find = WIN32_FIND_DATAW::default();
    unsafe { link.GetPath(&mut buf, &mut find, 0) }.ok()?;
    let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    Some(String::from_utf16_lossy(&buf[..len]))
}

fn state_for(dir: &PathBuf, exe: &str) -> LnkState {
    let lnk = dir.join(LNK_NAME);
    if !lnk.exists() {
        return LnkState {
            exists: false,
            target: None,
            target_exists: false,
            points_here: false,
        };
    }
    let target = lnk_target(&lnk);
    let target_exists = target.as_ref().is_some_and(|t| PathBuf::from(t).exists());
    let points_here = target.as_ref().is_some_and(|t| t.eq_ignore_ascii_case(exe));
    LnkState {
        exists: true,
        target,
        target_exists,
        points_here,
    }
}

pub fn shortcut_status() -> Result<ShortcutStatus, String> {
    let exe = std::env::current_exe()
        .map_err(|e| format!("current_exe: {e}"))?
        .to_string_lossy()
        .to_string();
    with_com(|| {
        Ok(ShortcutStatus {
            desktop: state_for(&known_folder(&FOLDERID_Desktop)?, &exe),
            start_menu: state_for(&known_folder(&FOLDERID_Programs)?, &exe),
            exe_path: exe.clone(),
        })
    })
}

fn write_lnk(dir: &PathBuf, exe: &str) -> Result<(), String> {
    let link: IShellLinkW = unsafe { CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER) }
        .map_err(|e| format!("ShellLink: {e}"))?;
    let exe_w = HSTRING::from(exe);
    unsafe { link.SetPath(PCWSTR(exe_w.as_ptr())) }.map_err(|e| format!("SetPath: {e}"))?;
    let workdir = PathBuf::from(exe)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let workdir_w = HSTRING::from(workdir.as_str());
    unsafe { link.SetWorkingDirectory(PCWSTR(workdir_w.as_ptr())) }
        .map_err(|e| format!("SetWorkingDirectory: {e}"))?;
    unsafe { link.SetIconLocation(PCWSTR(exe_w.as_ptr()), 0) }
        .map_err(|e| format!("SetIconLocation: {e}"))?;
    let file: IPersistFile = link.cast().map_err(|e| format!("IPersistFile: {e}"))?;
    let lnk_path = HSTRING::from(dir.join(LNK_NAME).as_path());
    unsafe { file.Save(PCWSTR(lnk_path.as_ptr()), true) }.map_err(|e| format!("Save: {e}"))?;
    Ok(())
}

/// Creates (or repairs) the shortcuts pointing at the RUNNING exe.
pub fn create_app_shortcuts(desktop: bool, start_menu: bool) -> Result<(), String> {
    let exe = std::env::current_exe()
        .map_err(|e| format!("current_exe: {e}"))?
        .to_string_lossy()
        .to_string();
    with_com(|| {
        if desktop {
            write_lnk(&known_folder(&FOLDERID_Desktop)?, &exe)?;
        }
        if start_menu {
            write_lnk(&known_folder(&FOLDERID_Programs)?, &exe)?;
        }
        Ok(())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Real COM roundtrip in a temp dir: write a .lnk to the test exe,
    /// resolve it back, verify target detection, then a dead-target case.
    #[test]
    fn lnk_write_and_resolve_roundtrip() {
        let dir = std::env::temp_dir().join("mytodo-lnk-test");
        std::fs::create_dir_all(&dir).expect("temp dir");
        let exe = std::env::current_exe()
            .expect("exe")
            .to_string_lossy()
            .to_string();

        with_com(|| {
            write_lnk(&dir, &exe)?;
            let state = state_for(&dir, &exe);
            assert!(state.exists, "lnk must exist after write");
            assert!(state.target_exists, "target (this test exe) must exist");
            assert!(state.points_here, "lnk must point at this exe");

            // dead target: point the lnk at a path that does not exist
            let ghost = dir.join("ghost-app.exe").to_string_lossy().to_string();
            write_lnk(&dir, &ghost)?;
            let stale = state_for(&dir, &exe);
            assert!(stale.exists);
            assert!(
                !stale.target_exists,
                "ghost target must be reported missing"
            );
            assert!(!stale.points_here);
            Ok(())
        })
        .expect("com roundtrip");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn missing_lnk_reports_not_existing() {
        let dir = std::env::temp_dir().join("mytodo-lnk-none");
        std::fs::create_dir_all(&dir).expect("temp dir");
        let state = with_com(|| Ok(state_for(&dir, "C:\\nowhere.exe"))).expect("com");
        assert!(!state.exists);
        assert!(state.target.is_none());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
