//! Windows integration (shortcut.md): virtual desktop moves, window
//! activation, summon orchestration. Windows-only; the commands degrade
//! into clear errors elsewhere.

#[cfg(windows)]
pub mod summon;
#[cfg(windows)]
pub mod virtual_desktop;
#[cfg(windows)]
pub mod window_activation;
