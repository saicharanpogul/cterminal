import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { WebglAddon } from "@xterm/addon-webgl";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import "@xterm/xterm/css/xterm.css";
import {
  ptySpawn,
  ptyWrite,
  ptyResize,
  onPtyData,
  onPtyExit,
} from "@/lib/tauri";
import { useConfigStore } from "@/stores/configStore";
import { usePaneStore } from "@/stores/paneStore";
import { useClaudeDetection } from "@/hooks/useClaudeDetection";
import { InlineImageOverlay } from "./InlineImageOverlay";
// Widget overlay disabled — needs a proper protocol from Claude Code
// import { WidgetOverlay } from "../widgets/WidgetOverlay";

const THEME = {
  background: "#0d0d0f",
  foreground: "#e4e4e8",
  cursor: "#d97757",
  cursorAccent: "#0d0d0f",
  selectionBackground: "#d9775740",
  selectionForeground: "#e4e4e8",
  black: "#1a1a20",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#fbbf24",
  blue: "#60a5fa",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#e4e4e8",
  brightBlack: "#4a4a55",
  brightRed: "#fca5a5",
  brightGreen: "#86efac",
  brightYellow: "#fde68a",
  brightBlue: "#93c5fd",
  brightMagenta: "#d8b4fe",
  brightCyan: "#67e8f9",
  brightWhite: "#ffffff",
};

// Track which sessions have already been spawned globally
// to prevent double-spawn from React StrictMode
const spawnedSessions = new Set<string>();

interface XTermWrapperProps {
  sessionId: string;
  isActive: boolean;
}

export function XTermWrapper({ sessionId, isActive }: XTermWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const config = useConfigStore();

  // Focus terminal when it becomes active
  useEffect(() => {
    if (isActive && terminalRef.current) {
      terminalRef.current.focus();
      fitAddonRef.current?.fit();
    }
  }, [isActive]);

  const handleResize = useCallback(() => {
    const fitAddon = fitAddonRef.current;
    const terminal = terminalRef.current;
    if (fitAddon && terminal) {
      try {
        fitAddon.fit();
        ptyResize(sessionId, terminal.cols, terminal.rows).catch(() => {});
      } catch {
        // Terminal may be disposed during resize
      }
    }
  }, [sessionId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const terminal = new Terminal({
      theme: THEME,
      fontFamily: config.fontFamily,
      fontSize: config.fontSize,
      lineHeight: config.lineHeight,
      cursorStyle: config.cursorStyle,
      cursorBlink: config.cursorBlink,
      scrollback: config.scrollback,
      allowTransparency: true,
      macOptionIsMeta: true,
      macOptionClickForcesSelection: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    terminal.loadAddon(new Unicode11Addon());
    terminal.unicode.activeVersion = "11";

    terminal.open(container);

    // Try WebGL after terminal is opened, fallback to canvas
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        console.warn("WebGL context lost, falling back to canvas");
        webglAddon.dispose();
      });
      terminal.loadAddon(webglAddon);
    } catch (e) {
      console.warn("WebGL addon failed to load, using canvas renderer:", e);
    }

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Delay fit() until container has dimensions (avoids renderer crash)
    requestAnimationFrame(() => {
      if (!terminalRef.current) return;
      try {
        fitAddon.fit();
      } catch (e) {
        console.warn("Initial fit failed, retrying:", e);
      }

      // Spawn PTY only once per session ID (survives StrictMode remount)
      if (!spawnedSessions.has(sessionId)) {
        spawnedSessions.add(sessionId);
        const cols = terminal.cols || 80;
        const rows = terminal.rows || 24;
        ptySpawn(sessionId, cols, rows).catch((err) => {
          terminal.writeln(
            `\r\n\x1b[31mFailed to spawn shell: ${err}\x1b[0m`,
          );
          spawnedSessions.delete(sessionId);
        });
      }
    });

    // Wire terminal input -> PTY
    const onDataDisposable = terminal.onData((data) => {
      const encoder = new TextEncoder();
      ptyWrite(sessionId, encoder.encode(data)).catch(() => {});
    });

    // Wire terminal binary input (for mouse, etc)
    const onBinaryDisposable = terminal.onBinary((data) => {
      const bytes = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        bytes[i] = data.charCodeAt(i);
      }
      ptyWrite(sessionId, bytes).catch(() => {});
    });

    // Listen for PTY output -> terminal
    let unlistenData: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    onPtyData((event) => {
      if (event.session_id === sessionId) {
        terminal.write(new Uint8Array(event.data));
      }
    }).then((fn) => {
      unlistenData = fn;
    });

    onPtyExit((event) => {
      if (event.session_id === sessionId) {
        terminal.writeln(
          `\r\n\x1b[90m[Process exited with code ${event.code ?? "unknown"}]\x1b[0m`,
        );
        usePaneStore.getState().setPaneDead(sessionId);
      }
    }).then((fn) => {
      unlistenExit = fn;
    });

    // Resize observer
    const observer = new ResizeObserver(() => {
      handleResize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      onDataDisposable.dispose();
      onBinaryDisposable.dispose();
      unlistenData?.();
      unlistenExit?.();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId]);

  const { isClaudeRunning } = useClaudeDetection(sessionId);

  return (
    <div className="w-full h-full relative">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ padding: "4px 8px" }}
      />
      {/* Inline image overlay */}
      <InlineImageOverlay sessionId={sessionId} />
      {/* Claude Code active indicator */}
      {isClaudeRunning && (
        <div className="absolute bottom-2 right-3 flex items-center gap-1.5 px-2 py-1 bg-surface-2/90 backdrop-blur-sm rounded-md border border-accent/20 z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] text-accent font-medium tracking-wide">
            Claude
          </span>
        </div>
      )}
    </div>
  );
}
