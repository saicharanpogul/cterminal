import { X } from "lucide-react";
import clsx from "clsx";

interface TabProps {
  tab: {
    id: string;
    sessionId: string;
    title: string;
    isAlive: boolean;
  };
  index: number;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
  showClose: boolean;
}

export function Tab({ tab, index, isActive, onClick, onClose, showClose }: TabProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "group flex items-center gap-2 h-full px-3 cursor-pointer border-r border-border transition-colors min-w-[100px] max-w-[180px]",
        isActive
          ? "bg-surface-0 text-text-primary"
          : "bg-surface-1 text-text-secondary hover:bg-surface-2",
      )}
    >
      <span className="text-[10px] text-text-muted font-medium tabular-nums">
        {index}
      </span>
      <span className="flex-1 truncate text-xs">
        {tab.title}
        {!tab.isAlive && (
          <span className="text-text-muted ml-1">(exited)</span>
        )}
      </span>
      {showClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={clsx(
            "flex items-center justify-center w-4 h-4 rounded transition-colors",
            "opacity-0 group-hover:opacity-100",
            isActive && "opacity-60",
            "hover:bg-surface-3 text-text-muted hover:text-text-primary",
          )}
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}
