import { useEffect, useState } from "react";
import {
  listSessions,
  deleteSession,
  type SessionRecord,
} from "@/lib/tauri";
import { usePaneStore } from "@/stores/paneStore";
import {
  Clock,
  Folder,
  Sparkles,
  Terminal,
  Trash2,
  X,
} from "lucide-react";

interface SessionListProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionList({ isOpen, onClose }: SessionListProps) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const splitPane = usePaneStore((s) => s.splitPane);
  const activePaneId = usePaneStore((s) => s.activePaneId);

  useEffect(() => {
    if (isOpen) {
      listSessions().then(setSessions).catch(() => {});
    }
  }, [isOpen]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession(id).catch(() => {});
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleRestore = (_session: SessionRecord) => {
    // Open a new pane — the session record tells us what was running
    splitPane(activePaneId, "vertical");
    onClose();
  };

  if (!isOpen) return null;

  const claudeSessions = sessions.filter((s) => s.is_claude);
  const terminalSessions = sessions.filter((s) => !s.is_claude);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[520px] bg-surface-1 rounded-lg border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Sessions</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-3"
          >
            <X size={14} />
          </button>
        </div>

        {/* Session list */}
        <div className="max-h-[500px] overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Terminal size={24} className="mx-auto mb-3 text-text-muted/40" />
              <p className="text-xs text-text-muted">No previous sessions</p>
              <p className="text-[10px] text-text-muted/60 mt-1">
                Sessions are saved automatically as you work
              </p>
            </div>
          ) : (
            <>
              {claudeSessions.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-accent uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={10} />
                    Claude Sessions
                  </div>
                  {claudeSessions.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      onRestore={() => handleRestore(s)}
                      onDelete={(e) => handleDelete(s.id, e)}
                    />
                  ))}
                </>
              )}
              {terminalSessions.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal size={10} />
                    Terminal Sessions
                  </div>
                  {terminalSessions.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      onRestore={() => handleRestore(s)}
                      onDelete={(e) => handleDelete(s.id, e)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionItem({
  session,
  onRestore,
  onDelete,
}: {
  session: SessionRecord;
  onRestore: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const timeAgo = formatTimeAgo(session.last_active);

  return (
    <button
      onClick={onRestore}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 transition-colors group"
    >
      {session.is_claude ? (
        <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
          <Sparkles size={13} className="text-accent" />
        </div>
      ) : (
        <div className="w-7 h-7 rounded-md bg-surface-3 flex items-center justify-center shrink-0">
          <Terminal size={13} className="text-text-muted" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-text-primary truncate">
          {session.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted">
          <span className="flex items-center gap-1 truncate">
            <Folder size={9} />
            {shortenPath(session.working_dir)}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <Clock size={9} />
            {timeAgo}
          </span>
        </div>
      </div>

      <button
        onClick={onDelete}
        className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
        title="Delete session"
      >
        <Trash2 size={11} />
      </button>
    </button>
  );
}

function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

function shortenPath(path: string): string {
  const home = "/Users/";
  if (path.includes(home)) {
    const parts = path.split(home);
    const userPath = parts[1];
    const segments = userPath.split("/");
    if (segments.length > 2) {
      return `~/${segments.slice(1).join("/")}`;
    }
    return `~/${segments.slice(1).join("/")}`;
  }
  return path;
}
