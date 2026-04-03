use cterminal_core::watcher;

#[tauri::command]
pub fn get_plan() -> Option<watcher::PlanFile> {
    let cwd = std::env::current_dir()
        .ok()?
        .to_string_lossy()
        .to_string();
    watcher::get_current_plan(&cwd)
}

#[tauri::command]
pub fn get_diff() -> Option<watcher::DiffInfo> {
    let cwd = std::env::current_dir()
        .ok()?
        .to_string_lossy()
        .to_string();
    watcher::get_git_diff(&cwd)
}

#[tauri::command]
pub fn get_tasks() -> Vec<watcher::TaskInfo> {
    let cwd = std::env::current_dir()
        .ok()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    watcher::get_tasks(&cwd)
}
