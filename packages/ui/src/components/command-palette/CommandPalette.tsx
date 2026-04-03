import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { usePaneStore, collectLeaves } from "@/stores/paneStore";
import { ptyWrite } from "@/lib/tauri";
import {
  Terminal,
  Columns2,
  Rows2,
  Sparkles,
  Users,
  ArrowRight,
  ArrowLeft,
  X as CloseIcon,
  Keyboard,
} from "lucide-react";

interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: "claude" | "pane" | "navigate";
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const splitPane = usePaneStore((s) => s.splitPane);
  const closePane = usePaneStore((s) => s.closePane);
  const activePaneId = usePaneStore((s) => s.activePaneId);
  const navigatePane = usePaneStore((s) => s.navigatePane);

  const getLeaves = useCallback(
    () => collectLeaves(usePaneStore.getState().root),
    [],
  );

  const commands: Command[] = useMemo(
    () => [
      // Claude commands
      {
        id: "claude-new",
        label: "New Claude Session",
        description: "Open a new pane and run claude",
        icon: <Sparkles size={14} />,
        shortcut: "Cmd+Shift+C",
        category: "claude",
        action: () => {
          splitPane(activePaneId, "vertical");
          // After split, write "claude" to the new pane's PTY
          setTimeout(() => {
            const leaves = getLeaves();
            const newLeaf = leaves[leaves.length - 1];
            if (newLeaf) {
              const encoder = new TextEncoder();
              ptyWrite(newLeaf.sessionId, encoder.encode("claude\n")).catch(
                () => {},
              );
            }
          }, 500);
          onClose();
        },
      },
      {
        id: "claude-agent-team",
        label: "Launch Agent Team",
        description: "Open 3 panes each running claude",
        icon: <Users size={14} />,
        shortcut: "Cmd+Shift+A",
        category: "claude",
        action: () => {
          // Split into 3 vertical panes and run claude in each
          splitPane(activePaneId, "vertical");
          setTimeout(() => {
            const leaves = getLeaves();
            if (leaves.length >= 2) {
              splitPane(leaves[leaves.length - 1].id, "vertical");
            }
          }, 100);
          // Run claude in all new panes after they spawn
          setTimeout(() => {
            const leaves = getLeaves();
            const encoder = new TextEncoder();
            for (const leaf of leaves) {
              ptyWrite(leaf.sessionId, encoder.encode("claude\n")).catch(
                () => {},
              );
            }
          }, 800);
          onClose();
        },
      },
      {
        id: "claude-inline",
        label: "Run Claude Here",
        description: "Start claude in the active pane",
        icon: <Sparkles size={14} />,
        category: "claude",
        action: () => {
          const leaf = getLeaves().find((l) => l.id === activePaneId);
          if (leaf) {
            const encoder = new TextEncoder();
            ptyWrite(leaf.sessionId, encoder.encode("claude\n")).catch(
              () => {},
            );
          }
          onClose();
        },
      },
      // Pane commands
      {
        id: "split-right",
        label: "Split Right",
        description: "Split active pane vertically",
        icon: <Columns2 size={14} />,
        shortcut: "Cmd+D",
        category: "pane",
        action: () => {
          splitPane(activePaneId, "vertical");
          onClose();
        },
      },
      {
        id: "split-down",
        label: "Split Down",
        description: "Split active pane horizontally",
        icon: <Rows2 size={14} />,
        shortcut: "Cmd+Shift+D",
        category: "pane",
        action: () => {
          splitPane(activePaneId, "horizontal");
          onClose();
        },
      },
      {
        id: "close-pane",
        label: "Close Pane",
        description: "Close the active pane",
        icon: <CloseIcon size={14} />,
        shortcut: "Cmd+W",
        category: "pane",
        action: () => {
          const leaves = getLeaves();
          if (leaves.length > 1) {
            closePane(activePaneId);
          }
          onClose();
        },
      },
      {
        id: "new-terminal",
        label: "New Terminal",
        description: "Open a new terminal pane",
        icon: <Terminal size={14} />,
        shortcut: "Cmd+D",
        category: "pane",
        action: () => {
          splitPane(activePaneId, "vertical");
          onClose();
        },
      },
      // Navigation
      {
        id: "nav-next",
        label: "Next Pane",
        description: "Focus the next pane",
        icon: <ArrowRight size={14} />,
        shortcut: "Cmd+Alt+Right",
        category: "navigate",
        action: () => {
          navigatePane("right");
          onClose();
        },
      },
      {
        id: "nav-prev",
        label: "Previous Pane",
        description: "Focus the previous pane",
        icon: <ArrowLeft size={14} />,
        shortcut: "Cmd+Alt+Left",
        category: "navigate",
        action: () => {
          navigatePane("left");
          onClose();
        },
      },
    ],
    [activePaneId, splitPane, closePane, navigatePane, getLeaves, onClose],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.includes(q),
    );
  }, [query, commands]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[selectedIndex]?.action();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  const categoryLabels = {
    claude: "Claude Code",
    pane: "Panes",
    navigate: "Navigation",
  };

  // Group by category
  let lastCategory = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[520px] bg-surface-1 rounded-lg border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Keyboard size={14} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none font-mono"
          />
        </div>

        {/* Command list */}
        <div className="max-h-[400px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-text-muted">
              No commands found
            </div>
          )}
          {filtered.map((cmd, i) => {
            const showCategory = cmd.category !== lastCategory;
            lastCategory = cmd.category;
            return (
              <div key={cmd.id}>
                {showCategory && (
                  <div className="px-4 pt-2 pb-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    {categoryLabels[cmd.category]}
                  </div>
                )}
                <button
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                    i === selectedIndex
                      ? "bg-accent/10 text-text-primary"
                      : "text-text-secondary hover:bg-surface-2"
                  }`}
                >
                  <span
                    className={
                      i === selectedIndex ? "text-accent" : "text-text-muted"
                    }
                  >
                    {cmd.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {cmd.label}
                    </div>
                    <div className="text-[10px] text-text-muted truncate">
                      {cmd.description}
                    </div>
                  </div>
                  {cmd.shortcut && (
                    <span className="text-[10px] text-text-muted/60 font-mono shrink-0">
                      {cmd.shortcut}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
