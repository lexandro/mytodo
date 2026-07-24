//! Summon Workspace orchestration (shortcut.md §1–9).
//! Core rule: NEVER switch the user's virtual desktop — move OUR window to
//! where the user is. Serialized behind a mutex so rapid hotkey presses
//! cannot interleave window transitions (§22).

use super::{virtual_desktop as vd, window_activation as act};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use windows::Win32::Foundation::HWND;

static SUMMON_LOCK: Mutex<()> = Mutex::new(());

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SummonResult {
    pub action: String, // "summoned" | "hidden" | "focused"
    pub moved_desktop: bool,
    pub foreground_granted: bool,
}

fn main_hwnd(app: &AppHandle) -> Result<(tauri::WebviewWindow, HWND), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window unavailable".to_string())?;
    let hwnd = window
        .hwnd()
        .map_err(|e| format!("main HWND unavailable: {e}"))?;
    Ok((window, HWND(hwnd.0)))
}

/// Summon / hide toggle. `toggle=false` = always summon+focus mode.
pub fn summon_workspace(app: &AppHandle, toggle: bool) -> Result<SummonResult, String> {
    let _guard = SUMMON_LOCK
        .lock()
        .map_err(|_| "summon lock poisoned".to_string())?;

    // capture the foreground window BEFORE any activation of our own —
    // it carries both the user's virtual desktop and their monitor (§2)
    let foreground = act::foreground_window();
    let (window, hwnd) = main_hwnd(app)?;

    let window_visible = window.is_visible().unwrap_or(false);
    let is_foreground = foreground.map(|f| f == hwnd).unwrap_or(false);

    // toggle branch: pressing the hotkey while we are focused hides us (§5)
    if toggle && is_foreground && window_visible {
        window.hide().map_err(|e| format!("hide failed: {e}"))?;
        log::debug!("summon: toggled hidden");
        return Ok(SummonResult {
            action: "hidden".into(),
            moved_desktop: false,
            foreground_granted: false,
        });
    }

    // same desktop? then this is just restore/show/activate (§4)
    let mut moved_desktop = false;
    let on_current = vd::is_on_current_desktop(hwnd).unwrap_or(true);
    if !on_current {
        match foreground
            .ok_or_else(|| "no foreground window to locate the user".to_string())
            .and_then(vd::desktop_of)
        {
            Ok(target) => {
                vd::move_window_to_desktop(hwnd, &target)?;
                moved_desktop = true;
            }
            // desktop lookup failure: NEVER fall back to switching desktops
            // (§27) — stay graceful, just show where we are reachable
            Err(e) => log::warn!("summon: desktop lookup failed: {e}"),
        }
    }

    let was_maximized = act::is_maximized(hwnd);
    if act::is_minimized(hwnd) {
        act::restore(hwnd);
    }

    // land on the user's monitor, preserving size/maximized state (§8–9)
    if let Some(fg) = foreground {
        if let Ok(work) = act::monitor_work_area(fg) {
            if was_maximized {
                act::restore(hwnd);
                let _ = act::place_in_work_area(hwnd, &work);
                act::maximize(hwnd);
            } else {
                let _ = act::place_in_work_area(hwnd, &work);
            }
        }
    }

    window.show().map_err(|e| format!("show failed: {e}"))?;
    act::show(hwnd);
    let foreground_granted = act::activate(hwnd);
    log::debug!("summon: moved_desktop={moved_desktop} foreground_granted={foreground_granted}");
    Ok(SummonResult {
        action: if is_foreground {
            "focused".into()
        } else {
            "summoned".into()
        },
        moved_desktop,
        foreground_granted,
    })
}

/// Shows the Quick Add window on the CURRENT desktop + monitor (§17).
/// The main workspace does not move.
pub fn show_quick_add(app: &AppHandle) -> Result<(), String> {
    let _guard = SUMMON_LOCK
        .lock()
        .map_err(|_| "summon lock poisoned".to_string())?;
    let window = app
        .get_webview_window("quickadd")
        .ok_or_else(|| "quickadd window unavailable".to_string())?;
    let hwnd = HWND(window.hwnd().map_err(|e| format!("quickadd HWND: {e}"))?.0);

    let foreground = act::foreground_window();
    if !vd::is_on_current_desktop(hwnd).unwrap_or(true) {
        if let Some(fg) = foreground {
            if let Ok(desktop) = vd::desktop_of(fg) {
                let _ = vd::move_window_to_desktop(hwnd, &desktop);
            }
        }
    }
    if let Some(fg) = foreground {
        if let Ok(work) = act::monitor_work_area(fg) {
            let _ = act::place_in_work_area(hwnd, &work);
        }
    }
    window.show().map_err(|e| format!("show failed: {e}"))?;
    window
        .set_focus()
        .map_err(|e| format!("focus failed: {e}"))?;
    Ok(())
}
