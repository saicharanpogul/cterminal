import { useCallback, useRef, useState } from "react";
import {
  type PaneNode,
  type PaneSplit,
  type PaneLeaf,
  usePaneStore,
} from "@/stores/paneStore";
import { XTermWrapper } from "@/components/terminal/XTermWrapper";

export function PaneLayout() {
  const root = usePaneStore((s) => s.root);
  return (
    <div className="flex-1 relative overflow-hidden">
      <PaneNodeView node={root} />
    </div>
  );
}

function PaneNodeView({ node }: { node: PaneNode }) {
  if (node.type === "leaf") {
    return <PaneLeafView leaf={node} />;
  }
  return <PaneSplitView split={node} />;
}

function PaneLeafView({ leaf }: { leaf: PaneLeaf }) {
  const activePaneId = usePaneStore((s) => s.activePaneId);
  const setActivePane = usePaneStore((s) => s.setActivePane);
  const isActive = leaf.id === activePaneId;

  return (
    <div
      className="w-full h-full relative"
      onMouseDown={() => setActivePane(leaf.id)}
    >
      {/* Active pane indicator */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none z-10 border border-accent/30 rounded-sm" />
      )}
      <XTermWrapper sessionId={leaf.sessionId} isActive={isActive} />
    </div>
  );
}

function PaneSplitView({ split }: { split: PaneSplit }) {
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
        <PaneNodeView node={split.children[0]} />
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

      <div
        style={{
          flex: 1,
          overflow: "hidden",
        }}
      >
        <PaneNodeView node={split.children[1]} />
      </div>
    </div>
  );
}
