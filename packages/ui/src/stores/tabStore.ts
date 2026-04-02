import { create } from "zustand";

let nextId = 1;
function generateId(): string {
  return `tab-${nextId++}`;
}

function generateSessionId(): string {
  return crypto.randomUUID();
}

export interface Tab {
  id: string;
  sessionId: string;
  title: string;
  isAlive: boolean;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  createTab: () => Tab;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setTabTitle: (id: string, title: string) => void;
  setTabDead: (sessionId: string) => void;
  getActiveTab: () => Tab | undefined;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  createTab: () => {
    const tab: Tab = {
      id: generateId(),
      sessionId: generateSessionId(),
      title: "Terminal",
      isAlive: true,
    };
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
    return tab;
  },

  closeTab: (id: string) => {
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id);
      const newTabs = state.tabs.filter((t) => t.id !== id);
      let newActive = state.activeTabId;

      if (state.activeTabId === id) {
        if (newTabs.length > 0) {
          const newIdx = Math.min(idx, newTabs.length - 1);
          newActive = newTabs[newIdx].id;
        } else {
          newActive = null;
        }
      }

      return { tabs: newTabs, activeTabId: newActive };
    });
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id });
  },

  setTabTitle: (id: string, title: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
    }));
  },

  setTabDead: (sessionId: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.sessionId === sessionId ? { ...t, isAlive: false } : t,
      ),
    }));
  },

  getActiveTab: () => {
    const state = get();
    return state.tabs.find((t) => t.id === state.activeTabId);
  },
}));
