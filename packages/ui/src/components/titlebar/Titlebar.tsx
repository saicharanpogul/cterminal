import { useClaudeStore } from "@/hooks/useClaudeDetection";
import { usePaneStore, collectLeaves } from "@/stores/paneStore";
import { useMemo } from "react";

export function Titlebar() {
  const root = usePaneStore((s) => s.root);
  const sessions = useClaudeStore((s) => s.sessions);

  const leaves = useMemo(() => collectLeaves(root), [root]);

  const claudeCount = leaves.filter(
    (l) => sessions[l.sessionId]?.is_running,
  ).length;

  const hasClaudeRunning = claudeCount > 0;

  return (
    <div
      data-tauri-drag-region
      className={`flex items-center h-10 bg-surface-1 border-b select-none shrink-0 transition-colors ${
        hasClaudeRunning ? "border-accent/20" : "border-border"
      }`}
    >
      {/* macOS traffic light spacing */}
      <div className="w-[78px] shrink-0" />

      {/* Title */}
      <div
        data-tauri-drag-region
        className="flex-1 flex items-center justify-center gap-2"
      >
        {hasClaudeRunning && (
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        )}
        <span
          className={`text-xs font-medium tracking-wider uppercase ${
            hasClaudeRunning ? "text-accent" : "text-text-secondary"
          }`}
        >
          cterminal
        </span>
        {claudeCount > 1 && (
          <span className="text-[9px] text-accent/60 font-medium">
            {claudeCount} agents
          </span>
        )}
      </div>

      {/* Spacer to match traffic light width */}
      <div className="w-[78px] shrink-0" />
    </div>
  );
}
