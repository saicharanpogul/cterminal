import { Titlebar } from "./components/titlebar/Titlebar";
import { TabBar } from "./components/tabs/TabBar";
import { PaneLayout } from "./components/panes/PaneLayout";
import { ClaudeStatusBar } from "./components/terminal/ClaudeStatusBar";
import { CommandPalette } from "./components/command-palette/CommandPalette";
import { SidePanel } from "./components/panels/SidePanel";
import { SessionList } from "./components/sessions/SessionList";
import { usePaneStore, collectLeaves } from "./stores/paneStore";
import { useEffect, useState, useCallback } from "react";
import { ptyKill, ptyWrite, saveSession } from "./lib/tauri";
import { useClaudeStore } from "./hooks/useClaudeDetection";

function App() {
  const activePaneId = usePaneStore((s) => s.activePaneId);
  const activeTabId = usePaneStore((s) => s.activeTabId);
  const splitPane = usePaneStore((s) => s.splitPane);
  const closePane = usePaneStore((s) => s.closePane);
  const addTab = usePaneStore((s) => s.addTab);
  const closeTab = usePaneStore((s) => s.closeTab);
  const navigatePane = usePaneStore((s) => s.navigatePane);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [sessionListOpen, setSessionListOpen] = useState(false);
  const claudeSessions = useClaudeStore((s) => s.sessions);

  const getLeaves = useCallback(() => collectLeaves(usePaneStore.getState().root), []);

  // Auto-save sessions periodically
  useEffect(() => {
    const doSave = () => {
      const leaves = getLeaves();
      for (const leaf of leaves) {
        const isClaude = claudeSessions[leaf.sessionId]?.is_running ?? false;
        saveSession(
          leaf.sessionId,
          isClaude ? "Claude Session" : leaf.title || "Terminal",
          ".",
          "zsh",
          isClaude,
        ).catch((e) => console.warn("Session save failed:", e));
      }
    };
    // Save immediately on mount
    setTimeout(doSave, 2000);
    const interval = setInterval(doSave, 10000);
    return () => clearInterval(interval);
  }, [getLeaves, claudeSessions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      // Session list: Cmd+L
      if (isMeta && e.key === "l" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setSessionListOpen((v) => !v);
        return;
      }

      // Side panel: Cmd+B
      if (isMeta && e.key === "b" && !e.shiftKey) {
        e.preventDefault();
        setSidePanelOpen((v) => !v);
        return;
      }

      // New tab: Cmd+T
      if (isMeta && e.key === "t" && !e.shiftKey) {
        e.preventDefault();
        addTab();
        return;
      }

      // Command palette: Cmd+Shift+P
      if (isMeta && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
        return;
      }

      // Quick Claude launch: Cmd+Shift+C
      if (isMeta && e.shiftKey && e.key === "C") {
        e.preventDefault();
        splitPane(activePaneId, "vertical");
        setTimeout(() => {
          const currentLeaves = getLeaves();
          const newLeaf = currentLeaves[currentLeaves.length - 1];
          if (newLeaf) {
            const encoder = new TextEncoder();
            ptyWrite(newLeaf.sessionId, encoder.encode("claude\n")).catch(
              () => {},
            );
          }
        }, 500);
        return;
      }

      // Agent team: Cmd+Shift+A
      if (isMeta && e.shiftKey && e.key === "A") {
        e.preventDefault();
        splitPane(activePaneId, "vertical");
        setTimeout(() => {
          const currentLeaves = getLeaves();
          if (currentLeaves.length >= 2) {
            splitPane(currentLeaves[currentLeaves.length - 1].id, "vertical");
          }
        }, 100);
        setTimeout(() => {
          const currentLeaves = getLeaves();
          const encoder = new TextEncoder();
          for (const leaf of currentLeaves) {
            ptyWrite(leaf.sessionId, encoder.encode("claude\n")).catch(
              () => {},
            );
          }
        }, 800);
        return;
      }

      // Split vertical: Cmd+D
      if (isMeta && e.key === "d" && !e.shiftKey) {
        e.preventDefault();
        splitPane(activePaneId, "vertical");
      }

      // Split horizontal: Cmd+Shift+D
      if (isMeta && e.shiftKey && e.key === "D") {
        e.preventDefault();
        splitPane(activePaneId, "horizontal");
      }

      // Close pane/tab: Cmd+W
      if (isMeta && e.key === "w") {
        e.preventDefault();
        const currentLeaves = getLeaves();
        if (currentLeaves.length > 1) {
          // Multiple panes — close just the active pane
          const activeLeaf = currentLeaves.find((l) => l.id === activePaneId);
          if (activeLeaf) {
            ptyKill(activeLeaf.sessionId).catch(() => {});
          }
          closePane(activePaneId);
        } else {
          // Single pane — close the whole tab
          const activeLeaf = currentLeaves[0];
          if (activeLeaf) {
            ptyKill(activeLeaf.sessionId).catch(() => {});
          }
          closeTab(activeTabId);
        }
      }

      // Navigate panes: Cmd+Alt+Arrow
      if (isMeta && e.altKey) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          navigatePane("left");
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          navigatePane("right");
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          navigatePane("up");
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          navigatePane("down");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePaneId, activeTabId, splitPane, closePane, closeTab, addTab, navigatePane, getLeaves]);

  return (
    <div className="flex flex-col h-screen bg-surface-0">
      <Titlebar />
      <TabBar />
      <div className="flex flex-1 overflow-hidden">
        <PaneLayout />
        <SidePanel
          isOpen={sidePanelOpen}
          onClose={() => setSidePanelOpen(false)}
        />
      </div>
      <ClaudeStatusBar />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <SessionList
        isOpen={sessionListOpen}
        onClose={() => setSessionListOpen(false)}
      />
    </div>
  );
}

export default App;
