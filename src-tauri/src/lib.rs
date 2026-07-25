mod ai;
mod commands;
mod db;
mod paths;
mod winint;
mod workspace;

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
        .manage(ai::run::AiRunManager::default())
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
            commands::ai_runs_load,
            commands::ai_run_put,
            commands::workspace_check,
            commands::ai_detect_provider,
            commands::ai_probe_provider,
            commands::ai_test_provider,
            commands::ai_list_models,
            commands::app_paths,
            commands::fs_allow_picked,
            commands::ai_run_start,
            commands::ai_run_cancel,
            commands::backup_now,
            commands::list_backups,
            commands::restore_backup,
            commands::summon_workspace,
            commands::show_quick_add,
            commands::app_shortcut_status,
            commands::create_app_shortcuts,
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

#[cfg(test)]
mod capability_tests {
    //! The capability file decides at RUNTIME whether a feature works at all,
    //! and a missing scope fails only when a user clicks — opening links,
    //! folders and JSON import/export were all silently dead until 2026-07-25
    //! because of it. These assertions make that visible in CI instead.

    const CAPABILITY: &str = include_str!("../capabilities/default.json");

    fn capability() -> serde_json::Value {
        serde_json::from_str(CAPABILITY).expect("capabilities/default.json must be valid JSON")
    }

    fn has_permission(caps: &serde_json::Value, name: &str) -> bool {
        caps["permissions"]
            .as_array()
            .expect("permissions array")
            .iter()
            .any(|p| p.as_str() == Some(name) || p["identifier"].as_str() == Some(name))
    }

    #[test]
    fn opening_links_and_folders_stays_permitted() {
        let caps = capability();
        // web links in descriptions + the About dialog
        assert!(has_permission(&caps, "opener:allow-open-url"));
        // …and the url scope, without which every open_url is refused
        assert!(has_permission(&caps, "opener:allow-default-urls"));
        // file/folder links + the Settings folder buttons need a path scope
        let open_path = caps["permissions"]
            .as_array()
            .unwrap()
            .iter()
            .find(|p| p["identifier"].as_str() == Some("opener:allow-open-path"))
            .expect("opener:allow-open-path must be scoped, not a bare string");
        assert_eq!(open_path["allow"][0]["path"].as_str(), Some("**"));
    }

    #[test]
    fn json_import_export_commands_are_enabled_but_unscoped() {
        let caps = capability();
        assert!(has_permission(&caps, "fs:allow-read-text-file"));
        assert!(has_permission(&caps, "fs:allow-write-text-file"));
        // the scope must stay empty: access is granted per picked file at
        // runtime (commands::fs_allow_picked), never wholesale in the manifest
        for name in ["fs:allow-read-text-file", "fs:allow-write-text-file"] {
            let entry = caps["permissions"]
                .as_array()
                .unwrap()
                .iter()
                .find(|p| p.as_str() == Some(name) || p["identifier"].as_str() == Some(name))
                .unwrap();
            assert!(
                entry.is_string() || entry["allow"].is_null(),
                "{name} must not carry a static path scope"
            );
        }
    }

    #[test]
    fn the_file_dialogs_stay_available() {
        // pickFile / pickSavePath / pickDirectory all rely on this set
        assert!(has_permission(&capability(), "dialog:default"));
    }
}
