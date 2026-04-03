use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;

use crate::shell;

#[derive(Debug, thiserror::Error)]
pub enum PtyError {
    #[error("Failed to open PTY: {0}")]
    OpenFailed(String),
    #[error("Failed to spawn process: {0}")]
    SpawnFailed(String),
    #[error("Write failed: {0}")]
    WriteFailed(String),
    #[error("Resize failed: {0}")]
    ResizeFailed(String),
    #[error("PTY not found")]
    NotFound,
}

pub struct PtySession {
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    /// PID of the shell process running in this PTY
    child_pid: Option<u32>,
}

impl PtySession {
    pub fn spawn(
        cols: u16,
        rows: u16,
        shell_path: Option<String>,
        on_data: impl Fn(Vec<u8>) + Send + 'static,
        on_exit: impl Fn(Option<u32>) + Send + 'static,
    ) -> Result<Self, PtyError> {
        let pty_system = native_pty_system();

        let size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        let pair = pty_system
            .openpty(size)
            .map_err(|e| PtyError::OpenFailed(e.to_string()))?;

        let shell = shell_path.unwrap_or_else(shell::detect_shell);

        // Inherit the full parent environment so the shell has all
        // permissions, paths, and config the user expects.
        let mut cmd = CommandBuilder::new_default_prog();
        cmd.args(["-l"]); // login shell
        cmd.env("SHELL", &shell);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        if std::env::var("LANG").is_err() {
            cmd.env("LANG", "en_US.UTF-8");
        }

        let mut child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| PtyError::SpawnFailed(e.to_string()))?;

        // Get the child PID before we move the child into the exit thread
        let child_pid = child.process_id();

        // Drop slave side - we only need master
        drop(pair.slave);

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| PtyError::WriteFailed(e.to_string()))?;
        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| PtyError::OpenFailed(e.to_string()))?;

        let master = Arc::new(Mutex::new(pair.master));
        let writer = Arc::new(Mutex::new(writer));

        // Reader thread — flush immediately on every read.
        // Blocking read() naturally coalesces fast bursts (cat large file),
        // while ensuring prompts and small outputs appear instantly.
        thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        on_data(buf[..n].to_vec());
                    }
                    Err(_) => break,
                }
            }
        });

        // Wait for child exit in separate thread
        thread::spawn(move || {
            let status = child.wait().ok();
            let code = status.and_then(|s| {
                if s.success() {
                    Some(0)
                } else {
                    Some(1)
                }
            });
            on_exit(code);
        });

        Ok(Self {
            master,
            writer,
            child_pid,
        })
    }

    pub fn child_pid(&self) -> Option<u32> {
        self.child_pid
    }

    pub fn write(&self, data: &[u8]) -> Result<(), PtyError> {
        let mut writer = self
            .writer
            .lock()
            .map_err(|e| PtyError::WriteFailed(e.to_string()))?;
        writer
            .write_all(data)
            .map_err(|e| PtyError::WriteFailed(e.to_string()))?;
        writer
            .flush()
            .map_err(|e| PtyError::WriteFailed(e.to_string()))?;
        Ok(())
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), PtyError> {
        let master = self
            .master
            .lock()
            .map_err(|e| PtyError::ResizeFailed(e.to_string()))?;
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| PtyError::ResizeFailed(e.to_string()))?;
        Ok(())
    }
}
