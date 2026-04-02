import { Titlebar } from "./components/titlebar/Titlebar";
import { TabBar } from "./components/tabs/TabBar";
import { XTermWrapper } from "./components/terminal/XTermWrapper";
import { useTabStore } from "./stores/tabStore";
import { useEffect } from "react";

function App() {
  const { tabs, activeTabId, createTab } = useTabStore();

  useEffect(() => {
    if (tabs.length === 0) {
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
            <XTermWrapper sessionId={tab.sessionId} />
          </div>
        ))}
        {!activeTab && (
          <div className="flex items-center justify-center h-full text-text-muted">
            No terminal open. Press Cmd+T to create one.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
