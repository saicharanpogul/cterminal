import { useEffect, useRef } from "react";
import { create } from "zustand";
import { getClaudeStatus, type ClaudeStatusResult } from "@/lib/tauri";

interface ClaudeState {
  /** Map of sessionId -> claude status */
  sessions: Record<string, ClaudeStatusResult>;
  setStatus: (sessionId: string, status: ClaudeStatusResult) => void;
  isClaudeRunning: (sessionId: string) => boolean;
}

export const useClaudeStore = create<ClaudeState>((set, get) => ({
  sessions: {},
  setStatus: (sessionId, status) =>
    set((state) => ({
      sessions: { ...state.sessions, [sessionId]: status },
    })),
  isClaudeRunning: (sessionId) =>
    get().sessions[sessionId]?.is_running ?? false,
}));

const POLL_INTERVAL_MS = 2000;

/**
 * Hook that polls the backend to detect if Claude Code is running
 * in a specific PTY session. Updates the global Claude store.
 */
export function useClaudeDetection(sessionId: string) {
  const setStatus = useClaudeStore((s) => s.setStatus);
  const status = useClaudeStore((s) => s.sessions[sessionId]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const result = await getClaudeStatus(sessionId);
        setStatus(sessionId, result);
      } catch {
        // Session may have been killed
      }
    };

    // Initial check
    poll();

    // Poll at interval
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sessionId, setStatus]);

  return {
    isClaudeRunning: status?.is_running ?? false,
    claudePid: status?.pid ?? null,
    claudeVersion: status?.version ?? null,
  };
}
