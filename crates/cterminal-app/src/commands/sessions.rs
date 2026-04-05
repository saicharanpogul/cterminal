use cterminal_core::session::history::{self, SessionRecord};

#[tauri::command]
pub fn list_sessions() -> Vec<SessionRecord> {
    history::list_sessions()
}

#[tauri::command]
pub fn save_session(
    id: String,
    title: String,
    working_dir: String,
    shell: String,
    is_claude: bool,
) {
    tracing::debug!("Saving session: {} (claude: {})", id, is_claude);
    let record = SessionRecord {
        id,
        title,
        working_dir,
        shell,
        created_at: history::now_secs(),
        last_active: history::now_secs(),
        is_claude,
    };
    history::save_session(&record);
}

#[tauri::command]
pub fn delete_session(id: String) {
    history::delete_session(&id);
}

#[tauri::command]
pub fn clear_session_history() {
    history::clear_sessions();
}
