import { useTabStore } from "@/stores/tabStore";
import { Tab } from "./Tab";
import { Plus } from "lucide-react";
import { useEffect } from "react";
import { ptyKill } from "@/lib/tauri";

export function TabBar() {
  const { tabs, activeTabId, createTab, closeTab, setActiveTab } =
    useTabStore();

  const handleClose = (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab) {
      ptyKill(tab.sessionId).catch(() => {});
    }
    closeTab(id);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && e.key === "t") {
        e.preventDefault();
        createTab();
      }

      if (isMeta && e.key === "w") {
        e.preventDefault();
        if (activeTabId) {
          handleClose(activeTabId);
        }
      }

      // Cmd+1-9 to switch tabs
      if (isMeta && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (idx < tabs.length) {
          setActiveTab(tabs[idx].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tabs, activeTabId, createTab, closeTab, setActiveTab]);

  return (
    <div className="flex items-center h-9 bg-surface-1 border-b border-border overflow-x-auto shrink-0">
      <div className="flex items-center h-full">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onClick={() => setActiveTab(tab.id)}
            onClose={() => handleClose(tab.id)}
          />
        ))}
      </div>
      <button
        onClick={() => createTab()}
        className="flex items-center justify-center w-8 h-8 mx-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-3 transition-colors"
        title="New tab (Cmd+T)"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
