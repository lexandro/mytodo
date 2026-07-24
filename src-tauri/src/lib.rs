mod commands;
mod db;
mod paths;
mod winint;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // single instance: a second launch shows + focuses the existing window
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }))
            .plugin(tauri_plugin_global_shortcut::Builder::new().build());
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(commands::DbState::init())
        .invoke_handler(tauri::generate_handler![
            commands::db_load_all,
            commands::db_apply,
            commands::settings_all,
            commands::settings_set,
            commands::summon_workspace,
            commands::show_quick_add,
        ])
        .on_window_event(|window, event| {
            use tauri::Manager;
            // the hidden quickadd window must not keep the app alive after
            // the main window closes
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    window.app_handle().exit(0);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
