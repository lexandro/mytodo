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
            .plugin(tauri_plugin_global_shortcut::Builder::new().build())
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(commands::DbState::init())
        .setup(|_app| {
            // once-a-day background backup; failures only log (daprompt §5)
            db::backup::daily_backup_if_needed();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::db_load_all,
            commands::db_apply,
            commands::settings_all,
            commands::settings_set,
            commands::backup_now,
            commands::list_backups,
            commands::restore_backup,
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
