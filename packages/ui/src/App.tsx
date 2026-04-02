import { Titlebar } from "./components/titlebar/Titlebar";
import { TabBar } from "./components/tabs/TabBar";
import { PaneLayout } from "./components/panes/PaneLayout";
import { ClaudeStatusBar } from "./components/terminal/ClaudeStatusBar";
import { CommandPalette } from "./components/command-palette/CommandPalette";
import { usePaneStore } from "./stores/paneStore";
import { useEffect, useState } from "react";
import { ptyKill, ptyWrite } from "./lib/tauri";

function App() {
  const {
    splitPane,
    closePane,
    activePaneId,
    navigatePane,
    getAllLeaves,
  } = usePaneStore();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

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
          const leaves = getAllLeaves();
          const newLeaf = leaves[leaves.length - 1];
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
          const leaves = getAllLeaves();
          if (leaves.length >= 2) {
            splitPane(leaves[leaves.length - 1].id, "vertical");
          }
        }, 100);
        setTimeout(() => {
          const leaves = getAllLeaves();
          const encoder = new TextEncoder();
          for (const leaf of leaves) {
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

      // Close pane: Cmd+W
      if (isMeta && e.key === "w") {
        e.preventDefault();
        const leaves = getAllLeaves();
        const activeLeaf = leaves.find((l) => l.id === activePaneId);
        if (activeLeaf) {
          ptyKill(activeLeaf.sessionId).catch(() => {});
        }
        if (leaves.length > 1) {
          closePane(activePaneId);
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
  }, [activePaneId, splitPane, closePane, navigatePane, getAllLeaves]);

  return (
    <div className="flex flex-col h-screen bg-surface-0">
      <Titlebar />
      <TabBar />
      <PaneLayout />
      <ClaudeStatusBar />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}

export default App;
