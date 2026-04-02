use std::env;
use std::path::PathBuf;

pub fn detect_shell() -> String {
    if let Ok(shell) = env::var("SHELL") {
        return shell;
    }

    #[cfg(target_os = "macos")]
    {
        return "/bin/zsh".to_string();
    }

    #[cfg(target_os = "linux")]
    {
        return "/bin/bash".to_string();
    }

    #[cfg(target_os = "windows")]
    {
        return "powershell.exe".to_string();
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        return "/bin/sh".to_string();
    }
}

pub fn shell_name(shell_path: &str) -> String {
    PathBuf::from(shell_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("shell")
        .to_string()
}
