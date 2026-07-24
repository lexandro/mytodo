//! IVirtualDesktopManager wrapper — the documented COM interface for
//! per-window virtual desktop queries and moves (shortcut.md §3).
//! Never switches the user's active desktop; only moves OUR window.

use windows::core::GUID;
use windows::Win32::Foundation::HWND;
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_APARTMENTTHREADED,
};
use windows::Win32::UI::Shell::{IVirtualDesktopManager, VirtualDesktopManager};

/// Runs `f` with an initialized COM apartment and the desktop manager.
/// Commands execute on arbitrary threads, so COM is initialized per call.
fn with_manager<T>(
    f: impl FnOnce(&IVirtualDesktopManager) -> Result<T, String>,
) -> Result<T, String> {
    // S_FALSE (already initialized) is fine; only balance a successful init
    let hr = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
    let inited = hr.is_ok();
    let result = (|| {
        let manager: IVirtualDesktopManager =
            unsafe { CoCreateInstance(&VirtualDesktopManager, None, CLSCTX_ALL) }
                .map_err(|e| format!("VirtualDesktopManager unavailable: {e}"))?;
        f(&manager)
    })();
    if inited {
        unsafe { CoUninitialize() };
    }
    result
}

pub fn desktop_of(hwnd: HWND) -> Result<GUID, String> {
    with_manager(|m| {
        unsafe { m.GetWindowDesktopId(hwnd) }.map_err(|e| format!("GetWindowDesktopId: {e}"))
    })
}

pub fn is_on_current_desktop(hwnd: HWND) -> Result<bool, String> {
    with_manager(|m| {
        unsafe { m.IsWindowOnCurrentVirtualDesktop(hwnd) }
            .map(|b| b.as_bool())
            .map_err(|e| format!("IsWindowOnCurrentVirtualDesktop: {e}"))
    })
}

pub fn move_window_to_desktop(hwnd: HWND, desktop: &GUID) -> Result<(), String> {
    with_manager(|m| {
        unsafe { m.MoveWindowToDesktop(hwnd, desktop) }
            .map_err(|e| format!("MoveWindowToDesktop: {e}"))
    })
}
