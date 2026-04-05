pub mod history;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crate::claude::{self, ClaudeStatus};
use crate::pty::{PtyError, PtySession};

pub struct SessionManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn spawn(
        &self,
        session_id: String,
        cols: u16,
        rows: u16,
        shell_path: Option<String>,
        on_data: impl Fn(Vec<u8>) + Send + 'static,
        on_exit: impl Fn(Option<u32>) + Send + 'static,
    ) -> Result<(), PtyError> {
        let session = PtySession::spawn(cols, rows, shell_path, on_data, on_exit)?;
        let mut sessions = self.sessions.lock().map_err(|_| PtyError::NotFound)?;
        sessions.insert(session_id, session);
        Ok(())
    }

    pub fn write(&self, session_id: &str, data: &[u8]) -> Result<(), PtyError> {
        let sessions = self.sessions.lock().map_err(|_| PtyError::NotFound)?;
        let session = sessions.get(session_id).ok_or(PtyError::NotFound)?;
        session.write(data)
    }

    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), PtyError> {
        let sessions = self.sessions.lock().map_err(|_| PtyError::NotFound)?;
        let session = sessions.get(session_id).ok_or(PtyError::NotFound)?;
        session.resize(cols, rows)
    }

    pub fn kill(&self, session_id: &str) -> Result<(), PtyError> {
        let mut sessions = self.sessions.lock().map_err(|_| PtyError::NotFound)?;
        sessions.remove(session_id);
        Ok(())
    }

    /// Check if Claude Code is running in a specific PTY session
    pub fn get_claude_status(&self, session_id: &str) -> ClaudeStatus {
        let sessions = match self.sessions.lock() {
            Ok(s) => s,
            Err(_) => return ClaudeStatus::default(),
        };
        let session = match sessions.get(session_id) {
            Some(s) => s,
            None => return ClaudeStatus::default(),
        };
        claude::detect_claude_in_pty(session.child_pid())
    }
}
