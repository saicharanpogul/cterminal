import { Titlebar } from "./components/titlebar/Titlebar";
import { TabBar } from "./components/tabs/TabBar";
import { XTermWrapper } from "./components/terminal/XTermWrapper";
import { useTabStore } from "./stores/tabStore";
import { useEffect, useRef } from "react";

function App() {
  const { tabs, activeTabId, createTab } = useTabStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && tabs.length === 0) {
      initializedRef.current = true;
      createTab();
    }
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex flex-col h-screen bg-surface-0">
      <Titlebar />
      <TabBar />
      <div className="flex-1 relative overflow-hidden">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 ${tab.id === activeTabId ? "block" : "hidden"}`}
          >
            <XTermWrapper sessionId={tab.sessionId} isActive={tab.id === activeTabId} />
          </div>
        ))}
        {!activeTab && (
          <div className="flex items-center justify-center h-full text-text-muted font-mono text-sm">
            No terminal open. Press{" "}
            <kbd className="mx-1 px-1.5 py-0.5 bg-surface-3 rounded text-text-secondary text-xs">
              Cmd+T
            </kbd>{" "}
            to create one.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
