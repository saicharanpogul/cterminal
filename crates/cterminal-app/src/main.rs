#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod events;

use cterminal_core::session::SessionManager;
use std::sync::Arc;
use tauri::Manager;

pub struct AppState {
    pub session_manager: Arc<SessionManager>,
}

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("cterminal=debug".parse().unwrap()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .manage(AppState {
            session_manager: Arc::new(SessionManager::new()),
        })
        .invoke_handler(tauri::generate_handler![
            commands::pty::pty_spawn,
            commands::pty::pty_write,
            commands::pty::pty_resize,
            commands::pty::pty_kill,
        ])
        .setup(|app| {
            // Set the window to show after it's ready (prevents flash)
            let window = app.get_webview_window("main").unwrap();
            window.show().unwrap();
            tracing::info!("cterminal window ready");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running cterminal");
}
