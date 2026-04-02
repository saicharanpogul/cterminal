import { useClaudeStore } from "@/hooks/useClaudeDetection";
import { usePaneStore } from "@/stores/paneStore";

export function ClaudeStatusBar() {
  const activePaneId = usePaneStore((s) => s.activePaneId);
  const leaves = usePaneStore((s) => s.getAllLeaves());
  const sessions = useClaudeStore((s) => s.sessions);

  const activeLeaf = leaves.find((l) => l.id === activePaneId);
  const activeClaudeStatus = activeLeaf
    ? sessions[activeLeaf.sessionId]
    : null;

  // Count how many panes have Claude running
  const claudePaneCount = leaves.filter(
    (l) => sessions[l.sessionId]?.is_running,
  ).length;

  const isClaudeActive = activeClaudeStatus?.is_running ?? false;

  if (!isClaudeActive && claudePaneCount === 0) {
    // Regular terminal mode — minimal status bar
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
        {/* Claude indicator */}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] font-semibold text-accent tracking-wide">
            CLAUDE
          </span>
        </div>

        <span className="text-text-muted/30">|</span>

        {/* Active session info */}
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

        {/* Agent team count */}
        {claudePaneCount > 1 && (
          <>
            <span className="text-text-muted/30">|</span>
            <span className="text-[10px] text-accent/80">
              {claudePaneCount} agents
            </span>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 text-[10px] text-text-muted">
        <span>{leaves.length} {leaves.length === 1 ? "pane" : "panes"}</span>
        <span className="text-text-muted/30">|</span>
        <KbdHint keys={["Cmd", "D"]} label="split" />
        <KbdHint keys={["Cmd", "Alt", "arrow"]} label="navigate" />
      </div>
    </div>
  );
}

function KbdHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="text-[9px] text-text-muted/60">
      {keys.map((k, i) => (
        <span key={i}>
          {i > 0 && "+"}
          <span className="text-text-muted/80">{k}</span>
        </span>
      ))}{" "}
      {label}
    </span>
  );
}
