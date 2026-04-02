use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ClaudeStatus {
    pub is_running: bool,
    pub pid: Option<u32>,
    pub version: Option<String>,
}

impl Default for ClaudeStatus {
    fn default() -> Self {
        Self {
            is_running: false,
            pid: None,
            version: None,
        }
    }
}

/// Check if a process named "claude" is a child of the given PID.
/// On macOS/Linux, uses `ps` to find child processes.
pub fn detect_claude_in_pty(pty_leader_pid: Option<u32>) -> ClaudeStatus {
    let Some(leader_pid) = pty_leader_pid else {
        return ClaudeStatus::default();
    };

    // Get all processes whose parent is the shell in this PTY
    // We walk the process tree since claude may be a grandchild
    // (shell -> node -> claude, or shell -> claude)
    match find_claude_process(leader_pid) {
        Some((pid, name)) => ClaudeStatus {
            is_running: true,
            pid: Some(pid),
            version: extract_version_hint(&name),
        },
        None => ClaudeStatus::default(),
    }
}

fn find_claude_process(parent_pid: u32) -> Option<(u32, String)> {
    // Use pgrep to find all descendant processes
    let output = Command::new("pgrep")
        .args(["-P", &parent_pid.to_string()])
        .output()
        .ok()?;

    let pids_str = String::from_utf8_lossy(&output.stdout);

    for line in pids_str.lines() {
        let child_pid: u32 = line.trim().parse().ok()?;

        // Get the command name for this PID
        if let Some(cmd_name) = get_process_command(child_pid) {
            if is_claude_process(&cmd_name) {
                return Some((child_pid, cmd_name));
            }
        }

        // Recurse into children
        if let Some(found) = find_claude_process(child_pid) {
            return Some(found);
        }
    }

    None
}

fn get_process_command(pid: u32) -> Option<String> {
    let output = Command::new("ps")
        .args(["-p", &pid.to_string(), "-o", "command="])
        .output()
        .ok()?;

    let cmd = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if cmd.is_empty() {
        None
    } else {
        Some(cmd)
    }
}

fn is_claude_process(command: &str) -> bool {
    // Claude Code runs as a Node.js process with "claude" in the path
    // Common patterns:
    //   /path/to/claude
    //   node /path/to/claude
    //   /path/to/.claude/local/node ... claude
    let lower = command.to_lowercase();
    lower.contains("/claude") || lower.starts_with("claude") || lower.contains("@anthropic/claude-code")
}

fn extract_version_hint(command: &str) -> Option<String> {
    // Try to extract version from the command path
    // e.g., /Users/x/.claude/local/share/claude-code/1.0.0/node_modules/...
    for part in command.split('/') {
        // Version-like pattern: digits.digits.digits
        if part.chars().next().map_or(false, |c| c.is_ascii_digit())
            && part.contains('.')
            && part.chars().all(|c| c.is_ascii_digit() || c == '.')
        {
            return Some(part.to_string());
        }
    }
    None
}
