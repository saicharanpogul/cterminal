use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Read the current plan file from .claude/plans/
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanFile {
    pub path: String,
    pub name: String,
    pub content: String,
    pub modified: u64,
}

/// Get the most recently modified plan file
pub fn get_current_plan(working_dir: &str) -> Option<PlanFile> {
    let plans_dir = Path::new(working_dir).join(".claude").join("plans");
    if !plans_dir.exists() {
        // Also check home directory
        let home_plans = dirs::home_dir()?.join(".claude").join("plans");
        return find_latest_plan(&home_plans);
    }
    find_latest_plan(&plans_dir)
}

fn find_latest_plan(dir: &Path) -> Option<PlanFile> {
    if !dir.exists() {
        return None;
    }

    let mut plans: Vec<(PathBuf, u64)> = fs::read_dir(dir)
        .ok()?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .map_or(false, |ext| ext == "md" || ext == "markdown")
        })
        .filter_map(|e| {
            let modified = e
                .metadata()
                .ok()?
                .modified()
                .ok()?
                .duration_since(std::time::UNIX_EPOCH)
                .ok()?
                .as_secs();
            Some((e.path(), modified))
        })
        .collect();

    plans.sort_by(|a, b| b.1.cmp(&a.1));

    let (path, modified) = plans.first()?;
    let content = fs::read_to_string(path).ok()?;
    let modified = *modified;
    let name = path
        .file_name()?
        .to_str()?
        .to_string();

    Some(PlanFile {
        path: path.to_string_lossy().to_string(),
        name,
        content,
        modified,
    })
}

/// Get git diff for staged and unstaged changes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffInfo {
    pub files_changed: Vec<FileDiff>,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDiff {
    pub path: String,
    pub status: String,
    pub additions: u32,
    pub deletions: u32,
    pub diff: String,
}

pub fn get_git_diff(working_dir: &str) -> Option<DiffInfo> {
    // Get unstaged + staged diff
    let output = Command::new("git")
        .args(["diff", "HEAD", "--stat", "--no-color"])
        .current_dir(working_dir)
        .output()
        .ok()?;
    let summary = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // Get per-file diffs
    let output = Command::new("git")
        .args(["diff", "HEAD", "--no-color", "--unified=3"])
        .current_dir(working_dir)
        .output()
        .ok()?;
    let _full_diff = String::from_utf8_lossy(&output.stdout).to_string();

    // Get changed files list
    let output = Command::new("git")
        .args(["diff", "HEAD", "--numstat", "--no-color"])
        .current_dir(working_dir)
        .output()
        .ok()?;
    let numstat = String::from_utf8_lossy(&output.stdout);

    let mut files_changed = Vec::new();
    for line in numstat.lines() {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 3 {
            let additions = parts[0].parse().unwrap_or(0);
            let deletions = parts[1].parse().unwrap_or(0);
            let path = parts[2].to_string();

            // Get individual file diff
            let file_diff_output = Command::new("git")
                .args(["diff", "HEAD", "--no-color", "--unified=3", "--", &path])
                .current_dir(working_dir)
                .output()
                .ok();
            let diff = file_diff_output
                .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
                .unwrap_or_default();

            let status = if additions > 0 && deletions > 0 {
                "modified".to_string()
            } else if additions > 0 {
                "added".to_string()
            } else {
                "deleted".to_string()
            };

            files_changed.push(FileDiff {
                path,
                status,
                additions,
                deletions,
                diff,
            });
        }
    }

    Some(DiffInfo {
        files_changed,
        summary,
    })
}

/// Read Claude Code tasks from ~/.claude/tasks/ or .claude/tasks/
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskInfo {
    pub id: String,
    pub subject: String,
    pub status: String,
    pub description: Option<String>,
}

pub fn get_tasks(working_dir: &str) -> Vec<TaskInfo> {
    // Tasks are typically managed in-memory by Claude Code
    // But we can check for task-related files
    let mut tasks = Vec::new();

    // Check for CLAUDE.md or plan files that might have task info
    let claude_md = Path::new(working_dir).join("CLAUDE.md");
    if claude_md.exists() {
        if let Ok(content) = fs::read_to_string(&claude_md) {
            // Extract TODO/task-like items from CLAUDE.md
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("- [ ] ") {
                    tasks.push(TaskInfo {
                        id: format!("task-{}", tasks.len()),
                        subject: trimmed[6..].to_string(),
                        status: "pending".to_string(),
                        description: None,
                    });
                } else if trimmed.starts_with("- [x] ") || trimmed.starts_with("- [X] ") {
                    tasks.push(TaskInfo {
                        id: format!("task-{}", tasks.len()),
                        subject: trimmed[6..].to_string(),
                        status: "completed".to_string(),
                        description: None,
                    });
                }
            }
        }
    }

    tasks
}
