import type { TaskInfo } from "@/lib/tauri";
import { ListTodo, Circle, CheckCircle2 } from "lucide-react";

interface TaskListProps {
  tasks: TaskInfo[];
}

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted p-6">
        <ListTodo size={24} className="mb-3 opacity-40" />
        <p className="text-xs text-center">
          No tasks found.
          <br />
          <span className="text-text-muted/60 mt-1 block">
            Tasks from CLAUDE.md and plan files appear here.
          </span>
        </p>
      </div>
    );
  }

  const pending = tasks.filter((t) => t.status === "pending");
  const completed = tasks.filter((t) => t.status === "completed");

  return (
    <div className="flex flex-col h-full">
      {/* Summary */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <ListTodo size={12} className="text-accent shrink-0" />
        <span className="text-[11px] text-text-primary font-medium flex-1">
          {pending.length} pending, {completed.length} done
        </span>
        {tasks.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{
                  width: `${(completed.length / tasks.length) * 100}%`,
                }}
              />
            </div>
            <span className="text-[9px] text-text-muted">
              {Math.round((completed.length / tasks.length) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Task items */}
      <div className="flex-1 overflow-y-auto py-1">
        {pending.length > 0 && (
          <div className="px-3 pt-2 pb-1 text-[9px] font-semibold text-text-muted uppercase tracking-wider">
            Pending
          </div>
        )}
        {pending.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
        {completed.length > 0 && (
          <div className="px-3 pt-3 pb-1 text-[9px] font-semibold text-text-muted uppercase tracking-wider">
            Completed
          </div>
        )}
        {completed.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: TaskInfo }) {
  const isDone = task.status === "completed";

  return (
    <div className="flex items-start gap-2 px-3 py-1.5 hover:bg-surface-2 transition-colors">
      {isDone ? (
        <CheckCircle2
          size={13}
          className="text-accent/60 mt-0.5 shrink-0"
        />
      ) : (
        <Circle size={13} className="text-text-muted/40 mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span
          className={`text-[11px] leading-relaxed ${
            isDone
              ? "text-text-muted line-through"
              : "text-text-secondary"
          }`}
        >
          {task.subject}
        </span>
        {task.description && (
          <p className="text-[10px] text-text-muted/60 mt-0.5 truncate">
            {task.description}
          </p>
        )}
      </div>
    </div>
  );
}
