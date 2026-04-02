import { Titlebar } from "./components/titlebar/Titlebar";
import { TabBar } from "./components/tabs/TabBar";
import { PaneLayout } from "./components/panes/PaneLayout";
import { usePaneStore } from "./stores/paneStore";
import { useEffect } from "react";
import { ptyKill } from "./lib/tauri";

function App() {
  const {
    splitPane,
    closePane,
    activePaneId,
    navigatePane,
    getAllLeaves,
  } = usePaneStore();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

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
    </div>
  );
}

export default App;
