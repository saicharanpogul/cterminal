import { create } from "zustand";

interface ConfigState {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
  scrollback: number;
  setConfig: (config: Partial<ConfigState>) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  fontFamily: "JetBrains Mono, Fira Code, SF Mono, Menlo, monospace",
  fontSize: 14,
  lineHeight: 1.2,
  cursorStyle: "block",
  cursorBlink: false,
  scrollback: 10000,
  setConfig: (config) => set(config),
}));
