use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_SESSIONS: usize = 50;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionRecord {
    pub id: String,
    pub title: String,
    pub working_dir: String,
    pub shell: String,
    pub created_at: u64,
    pub last_active: u64,
    pub is_claude: bool,
}

fn sessions_dir() -> PathBuf {
    let dir = dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".cterminal")
        .join("sessions");
    fs::create_dir_all(&dir).ok();
    dir
}

fn sessions_file() -> PathBuf {
    sessions_dir().join("history.json")
}

pub fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

pub fn save_session(record: &SessionRecord) {
    let mut sessions = list_sessions();

    // Update if exists, otherwise insert
    if let Some(existing) = sessions.iter_mut().find(|s| s.id == record.id) {
        existing.title = record.title.clone();
        existing.last_active = record.last_active;
        existing.is_claude = record.is_claude;
    } else {
        sessions.insert(0, record.clone());
    }

    // Trim to max
    sessions.truncate(MAX_SESSIONS);

    if let Ok(json) = serde_json::to_string_pretty(&sessions) {
        fs::write(sessions_file(), json).ok();
    }
}

pub fn list_sessions() -> Vec<SessionRecord> {
    let file = sessions_file();
    if !file.exists() {
        return Vec::new();
    }
    fs::read_to_string(&file)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn delete_session(id: &str) {
    let mut sessions = list_sessions();
    sessions.retain(|s| s.id != id);
    if let Ok(json) = serde_json::to_string_pretty(&sessions) {
        fs::write(sessions_file(), json).ok();
    }
}

pub fn clear_sessions() {
    fs::write(sessions_file(), "[]").ok();
}
