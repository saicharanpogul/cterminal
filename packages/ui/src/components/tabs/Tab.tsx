import { X } from "lucide-react";
import clsx from "clsx";
import type { Tab as TabType } from "@/stores/tabStore";

interface TabProps {
  tab: TabType;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

export function Tab({ tab, isActive, onClick, onClose }: TabProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "group flex items-center gap-2 h-full px-4 cursor-pointer border-r border-border transition-colors min-w-[120px] max-w-[200px]",
        isActive
          ? "bg-surface-0 text-text-primary"
          : "bg-surface-1 text-text-secondary hover:bg-surface-2",
      )}
    >
      <span className="flex-1 truncate text-xs">
        {tab.title}
        {!tab.isAlive && (
          <span className="text-text-muted ml-1">(exited)</span>
        )}
      </span>
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
    </div>
  );
}
