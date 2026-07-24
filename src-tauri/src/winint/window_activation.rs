//! Win32 window activation and monitor placement helpers (shortcut.md §7–9).
//! Standard documented calls only: no focus-stealing hacks, no input
//! simulation. FlashWindowEx is the fallback when foreground is denied.

use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
use windows::Win32::UI::WindowsAndMessaging::{
    FlashWindowEx, GetForegroundWindow, GetWindowRect, IsIconic, IsZoomed, MoveWindow,
    SetForegroundWindow, ShowWindow, FLASHWINFO, FLASHW_TIMERNOFG, FLASHW_TRAY, SW_MAXIMIZE,
    SW_RESTORE, SW_SHOW,
};

pub fn foreground_window() -> Option<HWND> {
    let hwnd = unsafe { GetForegroundWindow() };
    if hwnd.0.is_null() { None } else { Some(hwnd) }
}

pub fn is_minimized(hwnd: HWND) -> bool {
    unsafe { IsIconic(hwnd) }.as_bool()
}

pub fn is_maximized(hwnd: HWND) -> bool {
    unsafe { IsZoomed(hwnd) }.as_bool()
}

/// Work area (excludes taskbar) of the monitor hosting `reference`.
pub fn monitor_work_area(reference: HWND) -> Result<RECT, String> {
    let monitor = unsafe { MonitorFromWindow(reference, MONITOR_DEFAULTTONEAREST) };
    let mut info = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };
    if !unsafe { GetMonitorInfoW(monitor, &mut info) }.as_bool() {
        return Err("GetMonitorInfoW failed".into());
    }
    Ok(info.rcWork)
}

/// Moves `hwnd` onto the given work area, preserving its size where it fits
/// and clamping so it never lands off-screen (shortcut.md §8).
pub fn place_in_work_area(hwnd: HWND, work: &RECT) -> Result<(), String> {
    let mut rect = RECT::default();
    unsafe { GetWindowRect(hwnd, &mut rect) }.map_err(|e| format!("GetWindowRect: {e}"))?;
    let work_w = work.right - work.left;
    let work_h = work.bottom - work.top;
    let w = (rect.right - rect.left).min(work_w);
    let h = (rect.bottom - rect.top).min(work_h);
    // keep relative position when already inside; otherwise center
    let x = if rect.left >= work.left && rect.left + w <= work.right {
        rect.left
    } else {
        work.left + (work_w - w) / 2
    };
    let y = if rect.top >= work.top && rect.top + h <= work.bottom {
        rect.top
    } else {
        work.top + (work_h - h) / 2
    };
    unsafe { MoveWindow(hwnd, x, y, w, h, true) }.map_err(|e| format!("MoveWindow: {e}"))
}

pub fn restore(hwnd: HWND) {
    unsafe {
        let _ = ShowWindow(hwnd, SW_RESTORE);
    }
}

pub fn show(hwnd: HWND) {
    unsafe {
        let _ = ShowWindow(hwnd, SW_SHOW);
    }
}

pub fn maximize(hwnd: HWND) {
    unsafe {
        let _ = ShowWindow(hwnd, SW_MAXIMIZE);
    }
}

/// Foreground attempt; on denial flashes the taskbar button instead of
/// hacking focus (shortcut.md §7). Returns whether foreground succeeded.
pub fn activate(hwnd: HWND) -> bool {
    let ok = unsafe { SetForegroundWindow(hwnd) }.as_bool();
    if !ok {
        let flash = FLASHWINFO {
            cbSize: std::mem::size_of::<FLASHWINFO>() as u32,
            hwnd,
            dwFlags: FLASHW_TRAY | FLASHW_TIMERNOFG,
            uCount: 3,
            dwTimeout: 0,
        };
        let _ = unsafe { FlashWindowEx(&flash) };
    }
    ok
}
