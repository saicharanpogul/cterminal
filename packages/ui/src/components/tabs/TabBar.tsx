import { usePaneStore } from "@/stores/paneStore";
import { Tab } from "./Tab";
import { Columns2, Rows2 } from "lucide-react";
import { ptyKill } from "@/lib/tauri";

export function TabBar() {
  const {
    activePaneId,
    setActivePane,
    splitPane,
    closePane,
    getAllLeaves,
  } = usePaneStore();

  const leaves = getAllLeaves();

  const handleClose = (paneId: string) => {
    const leaf = leaves.find((l) => l.id === paneId);
    if (leaf) {
      ptyKill(leaf.sessionId).catch(() => {});
    }
    if (leaves.length > 1) {
      closePane(paneId);
    }
  };

  return (
    <div className="flex items-center h-9 bg-surface-1 border-b border-border overflow-x-auto shrink-0">
      <div className="flex items-center h-full flex-1 min-w-0">
        {leaves.map((leaf, idx) => (
          <Tab
            key={leaf.id}
            tab={{
              id: leaf.id,
              sessionId: leaf.sessionId,
              title: leaf.title,
              isAlive: leaf.isAlive,
            }}
            index={idx + 1}
            isActive={leaf.id === activePaneId}
            onClick={() => setActivePane(leaf.id)}
            onClose={() => handleClose(leaf.id)}
            showClose={leaves.length > 1}
          />
        ))}
      </div>

      <div className="flex items-center gap-0.5 px-2 shrink-0">
        {/* Split vertical */}
        <button
          onClick={() => splitPane(activePaneId, "vertical")}
          className="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text-secondary hover:bg-surface-3 transition-colors"
          title="Split right (Cmd+D)"
        >
          <Columns2 size={13} />
        </button>
        {/* Split horizontal */}
        <button
          onClick={() => splitPane(activePaneId, "horizontal")}
          className="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text-secondary hover:bg-surface-3 transition-colors"
          title="Split down (Cmd+Shift+D)"
        >
          <Rows2 size={13} />
        </button>
      </div>
    </div>
  );
}
