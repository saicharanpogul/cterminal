import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface PtyDataEvent {
  session_id: string;
  data: number[];
}

export interface PtyExitEvent {
  session_id: string;
  code: number | null;
}

export async function ptySpawn(
  sessionId: string,
  cols: number,
  rows: number,
  shell?: string,
): Promise<string> {
  return invoke<string>("pty_spawn", {
    sessionId,
    cols,
    rows,
    shell: shell ?? null,
  });
}

export async function ptyWrite(
  sessionId: string,
  data: Uint8Array | number[],
): Promise<void> {
  return invoke("pty_write", {
    sessionId,
    data: Array.from(data),
  });
}

export async function ptyResize(
  sessionId: string,
  cols: number,
  rows: number,
): Promise<void> {
  return invoke("pty_resize", { sessionId, cols, rows });
}

export async function ptyKill(sessionId: string): Promise<void> {
  return invoke("pty_kill", { sessionId });
}

export function onPtyData(
  callback: (event: PtyDataEvent) => void,
): Promise<UnlistenFn> {
  return listen<PtyDataEvent>("pty:data", (event) => callback(event.payload));
}

export function onPtyExit(
  callback: (event: PtyExitEvent) => void,
): Promise<UnlistenFn> {
  return listen<PtyExitEvent>("pty:exit", (event) => callback(event.payload));
}
