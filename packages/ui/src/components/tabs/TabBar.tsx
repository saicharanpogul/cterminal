import { usePaneStore, collectLeaves } from "@/stores/paneStore";
import { Tab } from "./Tab";
import { Plus, Columns2, Rows2 } from "lucide-react";
import { ptyKill } from "@/lib/tauri";

export function TabBar() {
  const tabs = usePaneStore((s) => s.tabs);
  const activeTabId = usePaneStore((s) => s.activeTabId);
  const setActiveTab = usePaneStore((s) => s.setActiveTab);
  const addTab = usePaneStore((s) => s.addTab);
  const closeTab = usePaneStore((s) => s.closeTab);
  const activePaneId = usePaneStore((s) => s.activePaneId);
  const splitPane = usePaneStore((s) => s.splitPane);

  const handleCloseTab = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      // Kill all PTY sessions in this tab
      const leaves = collectLeaves(tab.root);
      for (const leaf of leaves) {
        ptyKill(leaf.sessionId).catch(() => {});
      }
    }
    if (tabs.length > 1) {
      closeTab(tabId);
    }
  };

  return (
    <div className="flex items-center h-9 bg-surface-1 border-b border-border overflow-x-auto shrink-0">
      <div className="flex items-center h-full flex-1 min-w-0">
        {tabs.map((tab, idx) => {
          const leaves = collectLeaves(tab.root);
          const paneCount = leaves.length;
          return (
            <Tab
              key={tab.id}
              tab={{
                id: tab.id,
                sessionId: leaves[0]?.sessionId ?? "",
                title: paneCount > 1 ? `${tab.title} (${paneCount})` : tab.title,
                isAlive: leaves.some((l) => l.isAlive),
              }}
              index={idx + 1}
              isActive={tab.id === activeTabId}
              onClick={() => setActiveTab(tab.id)}
              onClose={() => handleCloseTab(tab.id)}
              showClose={tabs.length > 1}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-0.5 px-2 shrink-0">
        {/* New tab (full screen, not split) */}
        <button
          onClick={addTab}
          className="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
          title="New tab (Cmd+T)"
        >
          <Plus size={14} />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        {/* Split within current tab */}
        <button
          onClick={() => splitPane(activePaneId, "vertical")}
          className="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text-secondary hover:bg-surface-3 transition-colors"
          title="Split right (Cmd+D)"
        >
          <Columns2 size={13} />
        </button>
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
