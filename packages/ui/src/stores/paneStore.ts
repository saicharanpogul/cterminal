import { create } from "zustand";

export type SplitDirection = "horizontal" | "vertical";

export interface PaneLeaf {
  type: "leaf";
  id: string;
  sessionId: string;
  title: string;
  isAlive: boolean;
}

export interface PaneSplit {
  type: "split";
  id: string;
  direction: SplitDirection;
  children: PaneNode[];
  ratio: number;
}

export type PaneNode = PaneLeaf | PaneSplit;

export interface TabEntry {
  id: string;
  root: PaneNode;
  activePaneId: string;
  title: string;
}

let paneCounter = 0;
function nextPaneId(): string {
  return `pane-${++paneCounter}`;
}

function nextSplitId(): string {
  return `split-${++paneCounter}`;
}

let tabCounter = 0;
function nextTabId(): string {
  return `tab-${++tabCounter}`;
}

function createLeaf(sessionId?: string): PaneLeaf {
  return {
    type: "leaf",
    id: nextPaneId(),
    sessionId: sessionId ?? crypto.randomUUID(),
    title: "Terminal",
    isAlive: true,
  };
}

function findNode(root: PaneNode, id: string): PaneNode | null {
  if (root.id === id) return root;
  if (root.type === "split") {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function collectLeaves(node: PaneNode): PaneLeaf[] {
  if (node.type === "leaf") return [node];
  return node.children.flatMap(collectLeaves);
}

function removeLeaf(root: PaneNode, leafId: string): PaneNode | null {
  if (root.type === "leaf") {
    return root.id === leafId ? null : root;
  }
  const newChildren: PaneNode[] = [];
  for (const child of root.children) {
    const result = removeLeaf(child, leafId);
    if (result) newChildren.push(result);
  }
  if (newChildren.length === 0) return null;
  if (newChildren.length === 1) return newChildren[0];
  return { ...root, children: newChildren };
}

function replaceNode(root: PaneNode, targetId: string, replacement: PaneNode): PaneNode {
  if (root.id === targetId) return replacement;
  if (root.type === "split") {
    return { ...root, children: root.children.map((c) => replaceNode(c, targetId, replacement)) };
  }
  return root;
}

function updateLeafInTree(root: PaneNode, sessionId: string, updater: (leaf: PaneLeaf) => PaneLeaf): PaneNode {
  if (root.type === "leaf") {
    return root.sessionId === sessionId ? updater(root) : root;
  }
  return { ...root, children: root.children.map((c) => updateLeafInTree(c, sessionId, updater)) };
}

function updateSplitRatio(root: PaneNode, splitId: string, ratio: number): PaneNode {
  if (root.type === "split") {
    return {
      ...root,
      ratio: root.id === splitId ? ratio : root.ratio,
      children: root.children.map((c) => updateSplitRatio(c, splitId, ratio)),
    };
  }
  return root;
}

function createTab(): TabEntry {
  const leaf = createLeaf();
  return {
    id: nextTabId(),
    root: leaf,
    activePaneId: leaf.id,
    title: "Terminal",
  };
}

interface PaneState {
  tabs: TabEntry[];
  activeTabId: string;

  // Tab actions
  addTab: () => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  // Pane actions (operate on the active tab)
  activePaneId: string;
  root: PaneNode;
  splitPane: (paneId: string, direction: SplitDirection) => void;
  closePane: (paneId: string) => void;
  setActivePane: (paneId: string) => void;
  setResizeRatio: (splitId: string, ratio: number) => void;
  setPaneTitle: (sessionId: string, title: string) => void;
  setPaneDead: (sessionId: string) => void;
  navigatePane: (direction: "left" | "right" | "up" | "down") => void;
}

export const usePaneStore = create<PaneState>((set, get) => {
  const initialTab = createTab();

  return {
    tabs: [initialTab],
    activeTabId: initialTab.id,
    activePaneId: initialTab.activePaneId,
    root: initialTab.root,

    addTab: () => {
      const tab = createTab();
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
        activePaneId: tab.activePaneId,
        root: tab.root,
      }));
    },

    closeTab: (tabId: string) => {
      set((state) => {
        if (state.tabs.length <= 1) return state;
        const idx = state.tabs.findIndex((t) => t.id === tabId);
        const newTabs = state.tabs.filter((t) => t.id !== tabId);
        let newActiveTab: TabEntry;
        if (state.activeTabId === tabId) {
          const newIdx = Math.min(idx, newTabs.length - 1);
          newActiveTab = newTabs[newIdx];
        } else {
          newActiveTab = newTabs.find((t) => t.id === state.activeTabId) ?? newTabs[0];
        }
        return {
          tabs: newTabs,
          activeTabId: newActiveTab.id,
          activePaneId: newActiveTab.activePaneId,
          root: newActiveTab.root,
        };
      });
    },

    setActiveTab: (tabId: string) => {
      set((state) => {
        // Save current tab state first
        const updatedTabs = state.tabs.map((t) =>
          t.id === state.activeTabId
            ? { ...t, root: state.root, activePaneId: state.activePaneId }
            : t,
        );
        const target = updatedTabs.find((t) => t.id === tabId);
        if (!target) return state;
        return {
          tabs: updatedTabs,
          activeTabId: tabId,
          activePaneId: target.activePaneId,
          root: target.root,
        };
      });
    },

    splitPane: (paneId: string, direction: SplitDirection) => {
      set((state) => {
        const target = findNode(state.root, paneId);
        if (!target || target.type !== "leaf") return state;
        const newLeaf = createLeaf();
        const split: PaneSplit = {
          type: "split",
          id: nextSplitId(),
          direction,
          children: [target, newLeaf],
          ratio: 0.5,
        };
        const newRoot = replaceNode(state.root, paneId, split);
        // Also update the tab entry
        const updatedTabs = state.tabs.map((t) =>
          t.id === state.activeTabId
            ? { ...t, root: newRoot, activePaneId: newLeaf.id }
            : t,
        );
        return { root: newRoot, activePaneId: newLeaf.id, tabs: updatedTabs };
      });
    },

    closePane: (paneId: string) => {
      set((state) => {
        const leaves = collectLeaves(state.root);
        if (leaves.length <= 1) return state;
        const newRoot = removeLeaf(state.root, paneId);
        if (!newRoot) return state;
        let newActive = state.activePaneId;
        if (state.activePaneId === paneId) {
          const remaining = collectLeaves(newRoot);
          newActive = remaining[0]?.id ?? state.activePaneId;
        }
        const updatedTabs = state.tabs.map((t) =>
          t.id === state.activeTabId
            ? { ...t, root: newRoot, activePaneId: newActive }
            : t,
        );
        return { root: newRoot, activePaneId: newActive, tabs: updatedTabs };
      });
    },

    setActivePane: (paneId: string) => {
      set((state) => {
        const updatedTabs = state.tabs.map((t) =>
          t.id === state.activeTabId ? { ...t, activePaneId: paneId } : t,
        );
        return { activePaneId: paneId, tabs: updatedTabs };
      });
    },

    setResizeRatio: (splitId: string, ratio: number) => {
      set((state) => ({
        root: updateSplitRatio(state.root, splitId, Math.max(0.1, Math.min(0.9, ratio))),
      }));
    },

    setPaneTitle: (sessionId: string, title: string) => {
      set((state) => ({
        root: updateLeafInTree(state.root, sessionId, (leaf) => ({ ...leaf, title })),
      }));
    },

    setPaneDead: (sessionId: string) => {
      set((state) => ({
        root: updateLeafInTree(state.root, sessionId, (leaf) => ({ ...leaf, isAlive: false })),
      }));
    },

    navigatePane: (direction: "left" | "right" | "up" | "down") => {
      const state = get();
      const leaves = collectLeaves(state.root);
      const idx = leaves.findIndex((l) => l.id === state.activePaneId);
      if (idx === -1) return;
      let newIdx: number;
      if (direction === "right" || direction === "down") {
        newIdx = (idx + 1) % leaves.length;
      } else {
        newIdx = (idx - 1 + leaves.length) % leaves.length;
      }
      set({ activePaneId: leaves[newIdx].id });
    },
  };
});
