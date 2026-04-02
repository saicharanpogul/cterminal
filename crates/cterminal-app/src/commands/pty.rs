use crate::AppState;
use cterminal_core::claude::ClaudeStatus;
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, Serialize)]
struct PtyDataEvent {
    session_id: String,
    data: Vec<u8>,
}

#[derive(Clone, Serialize)]
struct PtyExitEvent {
    session_id: String,
    code: Option<u32>,
}

#[tauri::command]
pub fn pty_spawn(
    app: AppHandle,
    state: State<AppState>,
    session_id: String,
    cols: u16,
    rows: u16,
    shell: Option<String>,
) -> Result<String, String> {
    let data_app = app.clone();
    let data_session_id = session_id.clone();
    let exit_app = app.clone();
    let exit_session_id = session_id.clone();

    state
        .session_manager
        .spawn(
            session_id.clone(),
            cols,
            rows,
            shell,
            move |data| {
                let _ = data_app.emit(
                    "pty:data",
                    PtyDataEvent {
                        session_id: data_session_id.clone(),
                        data,
                    },
                );
            },
            move |code| {
                let _ = exit_app.emit(
                    "pty:exit",
                    PtyExitEvent {
                        session_id: exit_session_id.clone(),
                        code,
                    },
                );
            },
        )
        .map_err(|e| e.to_string())?;

    tracing::info!("Spawned PTY session: {}", session_id);
    Ok(session_id)
}

#[tauri::command]
pub fn pty_write(state: State<AppState>, session_id: String, data: Vec<u8>) -> Result<(), String> {
    state
        .session_manager
        .write(&session_id, &data)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_resize(
    state: State<AppState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state
        .session_manager
        .resize(&session_id, cols, rows)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_kill(state: State<AppState>, session_id: String) -> Result<(), String> {
    state
        .session_manager
        .kill(&session_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn claude_status(state: State<AppState>, session_id: String) -> ClaudeStatus {
    state.session_manager.get_claude_status(&session_id)
}
