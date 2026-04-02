# cterminal

An open-source AI-native terminal optimized for Claude Code.

**Warp Terminal + Claude Desktop + Browser** — built from scratch.

## Features (Phase 1 MVP)

- **Rust PTY core** — Fast terminal emulation via `portable-pty` with 4ms batched output
- **xterm.js WebGL** — GPU-accelerated terminal rendering with truecolor support
- **Tab management** — Cmd+T/W, Cmd+1-9, close/switch tabs
- **Custom titlebar** — Frameless window with macOS traffic light integration
- **Dark theme** — Claude-inspired color palette with orange accent
- **Full Unicode** — UTF-8 and Unicode 11 support
- **24-bit truecolor** — Full RGB color rendering
- **Mouse support** — SGR mouse reporting via xterm.js
- **Web links** — Clickable URLs in terminal output

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Core | Rust (portable-pty, tokio) |
| Shell | Tauri v2 |
| Frontend | React 19, TypeScript |
| Terminal | xterm.js 5 + WebGL addon |
| State | Zustand |
| Styling | Tailwind CSS |
| Build | Vite + Cargo |

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- Tauri CLI: `cargo install tauri-cli --version "^2"`

### Development

```bash
# Install frontend dependencies
pnpm install

# Run in development mode
cargo tauri dev
```

### Build

```bash
cargo tauri build
```

## Project Structure

```
cterminal/
├── crates/
│   ├── cterminal-core/     # Pure Rust PTY library
│   └── cterminal-app/      # Tauri application
└── packages/
    └── ui/                 # React frontend
```

## Roadmap

- [ ] **Phase 1** — MVP terminal (current)
- [ ] **Phase 2** — Block system, AI sidebar, split panes
- [ ] **Phase 3** — Deep Claude Code integration, markdown rendering, diff viewer
- [ ] **Phase 4** — Browser tabs, inline images, SSH support
- [ ] **Phase 5** — Plugin system, themes marketplace, cloud sync

## License

MIT
