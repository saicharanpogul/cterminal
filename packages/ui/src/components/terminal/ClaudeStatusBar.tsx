import { useClaudeStore } from "@/hooks/useClaudeDetection";
import { usePaneStore, collectLeaves } from "@/stores/paneStore";
import { useMemo } from "react";

export function ClaudeStatusBar() {
  const root = usePaneStore((s) => s.root);
  const activePaneId = usePaneStore((s) => s.activePaneId);
  const sessions = useClaudeStore((s) => s.sessions);

  const leaves = useMemo(() => collectLeaves(root), [root]);

  const activeLeaf = leaves.find((l) => l.id === activePaneId);
  const activeClaudeStatus = activeLeaf
    ? sessions[activeLeaf.sessionId]
    : null;

  const claudePaneCount = leaves.filter(
    (l) => sessions[l.sessionId]?.is_running,
  ).length;

  const isClaudeActive = activeClaudeStatus?.is_running ?? false;

  if (!isClaudeActive && claudePaneCount === 0) {
    return (
      <div className="flex items-center h-6 px-3 bg-surface-1 border-t border-border shrink-0">
        <div className="flex items-center gap-3 text-[10px] text-text-muted">
          <span>{leaves.length} {leaves.length === 1 ? "pane" : "panes"}</span>
          <span className="text-text-muted/50">|</span>
          <span>cterminal v0.1.0</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center h-7 px-3 bg-surface-1 border-t border-accent/20 shrink-0">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] font-semibold text-accent tracking-wide">
            CLAUDE
          </span>
        </div>

        <span className="text-text-muted/30">|</span>

        {isClaudeActive && activeClaudeStatus && (
          <span className="text-[10px] text-text-secondary">
            PID {activeClaudeStatus.pid}
            {activeClaudeStatus.version && (
              <span className="text-text-muted ml-1">
                v{activeClaudeStatus.version}
              </span>
            )}
          </span>
        )}

        {claudePaneCount > 1 && (
          <>
            <span className="text-text-muted/30">|</span>
            <span className="text-[10px] text-accent/80">
              {claudePaneCount} agents
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-text-muted">
        <span>{leaves.length} {leaves.length === 1 ? "pane" : "panes"}</span>
      </div>
    </div>
  );
}
