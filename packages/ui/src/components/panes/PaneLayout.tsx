import { useCallback, useRef, useState, useMemo } from "react";
import {
  type PaneNode,
  type PaneSplit,
  type PaneLeaf,
  usePaneStore,
  collectLeaves,
} from "@/stores/paneStore";
import { XTermWrapper } from "@/components/terminal/XTermWrapper";
import { X } from "lucide-react";
import { ptyKill } from "@/lib/tauri";

export function PaneLayout() {
  const root = usePaneStore((s) => s.root);
  const totalLeaves = useMemo(() => collectLeaves(root).length, [root]);

  return (
    <div className="flex-1 relative overflow-hidden">
      <PaneNodeView node={root} showClose={totalLeaves > 1} />
    </div>
  );
}

function PaneNodeView({ node, showClose }: { node: PaneNode; showClose: boolean }) {
  if (node.type === "leaf") {
    return <PaneLeafView leaf={node} showClose={showClose} />;
  }
  return <PaneSplitView split={node} showClose={showClose} />;
}

function PaneLeafView({ leaf, showClose }: { leaf: PaneLeaf; showClose: boolean }) {
  const activePaneId = usePaneStore((s) => s.activePaneId);
  const setActivePane = usePaneStore((s) => s.setActivePane);
  const closePane = usePaneStore((s) => s.closePane);
  const isActive = leaf.id === activePaneId;
  const [hovered, setHovered] = useState(false);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    ptyKill(leaf.sessionId).catch(() => {});
    closePane(leaf.id);
  };

  return (
    <div
      className="w-full h-full relative"
      onMouseDown={() => setActivePane(leaf.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Active pane border */}
      {isActive && showClose && (
        <div className="absolute inset-0 pointer-events-none z-10 border border-accent/30 rounded-sm" />
      )}
      {/* Close pane button */}
      {showClose && (isActive || hovered) && (
        <button
          onClick={handleClose}
          className="absolute top-1 right-1 z-20 w-5 h-5 flex items-center justify-center rounded bg-surface-2/80 hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors backdrop-blur-sm"
          title="Close pane (Cmd+W)"
        >
          <X size={10} />
        </button>
      )}
      <XTermWrapper sessionId={leaf.sessionId} isActive={isActive} />
    </div>
  );
}

function PaneSplitView({ split, showClose }: { split: PaneSplit; showClose: boolean }) {
  const setResizeRatio = usePaneStore((s) => s.setResizeRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isVertical = split.direction === "vertical";
  const firstSize = `${split.ratio * 100}%`;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        let ratio: number;
        if (isVertical) {
          ratio = (moveEvent.clientX - rect.left) / rect.width;
        } else {
          ratio = (moveEvent.clientY - rect.top) / rect.height;
        }
        setResizeRatio(split.id, ratio);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = isVertical ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [split.id, isVertical, setResizeRatio],
  );

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex ${isVertical ? "flex-row" : "flex-col"}`}
    >
      <div
        style={{
          [isVertical ? "width" : "height"]: firstSize,
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <PaneNodeView node={split.children[0]} showClose={showClose} />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          ${isVertical ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"}
          ${isDragging ? "bg-accent" : "bg-border hover:bg-accent/50"}
          flex-shrink-0 transition-colors
        `}
      />

      <div style={{ flex: 1, overflow: "hidden" }}>
        <PaneNodeView node={split.children[1]} showClose={showClose} />
      </div>
    </div>
  );
}
