use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use crate::shell;

const BATCH_INTERVAL_MS: u64 = 4;
const BATCH_MAX_BYTES: usize = 16 * 1024;

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
        let mut cmd = CommandBuilder::new(&shell);
        cmd.args(["-l"]); // login shell

        // Inherit environment
        if let Ok(home) = std::env::var("HOME") {
            cmd.env("HOME", home);
        }
        if let Ok(user) = std::env::var("USER") {
            cmd.env("USER", user);
        }
        if let Ok(path) = std::env::var("PATH") {
            cmd.env("PATH", path);
        }
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("LANG", "en_US.UTF-8");

        let mut child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| PtyError::SpawnFailed(e.to_string()))?;

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

        // Reader thread with batched output
        thread::spawn(move || {
            let mut buf = [0u8; 4096];
            let mut batch = Vec::with_capacity(BATCH_MAX_BYTES);
            let mut last_flush = Instant::now();

            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        // EOF - flush remaining
                        if !batch.is_empty() {
                            on_data(batch.clone());
                            batch.clear();
                        }
                        break;
                    }
                    Ok(n) => {
                        batch.extend_from_slice(&buf[..n]);

                        let elapsed = last_flush.elapsed();
                        if batch.len() >= BATCH_MAX_BYTES
                            || elapsed >= Duration::from_millis(BATCH_INTERVAL_MS)
                        {
                            on_data(batch.clone());
                            batch.clear();
                            last_flush = Instant::now();
                        }
                    }
                    Err(_) => {
                        if !batch.is_empty() {
                            on_data(batch.clone());
                        }
                        break;
                    }
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

        Ok(Self { master, writer })
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
