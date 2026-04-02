# cterminal

AI-native terminal optimized for Claude Code. Tauri v2 + Rust + React + xterm.js.

## Architecture

- `crates/cterminal-core` — Pure Rust library: PTY management, session lifecycle, shell detection, config. No Tauri dependency.
- `crates/cterminal-app` — Tauri v2 application: IPC commands, event emission, app state.
- `packages/ui` — React 19 frontend: xterm.js terminal, tab management, titlebar, theming.

## Development

```bash
pnpm install          # Install frontend deps
cargo tauri dev       # Run dev mode (compiles Rust + starts Vite)
cargo build           # Build Rust only
```

## IPC Protocol

Frontend ↔ Backend communication via Tauri commands and events:
- Commands: `pty_spawn`, `pty_write`, `pty_resize`, `pty_kill`
- Events: `pty:data`, `pty:exit`

## Key Decisions

- xterm.js handles all VTE parsing/rendering (not Rust). Rust is a PTY multiplexer.
- 4ms batched output from PTY reader to prevent IPC flooding.
- Zustand for state management (tabs, config).
- Frameless window with custom titlebar for macOS native feel.
