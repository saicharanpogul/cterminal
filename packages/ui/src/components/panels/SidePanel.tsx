import { useState, useEffect, useCallback } from "react";
import { FileText, GitBranch, ListTodo, X } from "lucide-react";
import { PlanViewer } from "./PlanViewer";
import { DiffViewer } from "./DiffViewer";
import { TaskList } from "./TaskList";
import { getPlan, getDiff, getTasks } from "@/lib/tauri";
import type { PlanFile, DiffInfo, TaskInfo } from "@/lib/tauri";

type PanelTab = "plan" | "diff" | "tasks";

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SidePanel({ isOpen, onClose }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("plan");
  const [plan, setPlan] = useState<PlanFile | null>(null);
  const [diff, setDiff] = useState<DiffInfo | null>(null);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [p, d, t] = await Promise.all([getPlan(), getDiff(), getTasks()]);
      setPlan(p);
      setDiff(d);
      setTasks(t);
    } catch {
      // Backend not ready yet
    }
  }, []);

  // Poll every 3s when panel is open
  useEffect(() => {
    if (!isOpen) return;
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [isOpen, refresh]);

  if (!isOpen) return null;

  const diffCount = diff?.files_changed.length ?? 0;
  const pendingTasks = tasks.filter((t) => t.status === "pending").length;

  return (
    <div className="flex flex-col w-[380px] bg-surface-1 border-l border-border shrink-0 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center h-9 px-2 border-b border-border shrink-0">
        <div className="flex items-center gap-0.5 flex-1">
          <TabButton
            active={activeTab === "plan"}
            onClick={() => setActiveTab("plan")}
            icon={<FileText size={12} />}
            label="Plan"
            badge={plan ? 1 : 0}
          />
          <TabButton
            active={activeTab === "diff"}
            onClick={() => setActiveTab("diff")}
            icon={<GitBranch size={12} />}
            label="Diff"
            badge={diffCount}
          />
          <TabButton
            active={activeTab === "tasks"}
            onClick={() => setActiveTab("tasks")}
            icon={<ListTodo size={12} />}
            label="Tasks"
            badge={pendingTasks}
          />
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "plan" && <PlanViewer plan={plan} />}
        {activeTab === "diff" && <DiffViewer diff={diff} />}
        {activeTab === "tasks" && <TaskList tasks={tasks} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
        active
          ? "bg-surface-3 text-text-primary"
          : "text-text-muted hover:text-text-secondary hover:bg-surface-2"
      }`}
    >
      {icon}
      {label}
      {badge > 0 && (
        <span
          className={`text-[9px] px-1 rounded-full ${
            active
              ? "bg-accent/20 text-accent"
              : "bg-surface-3 text-text-muted"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
