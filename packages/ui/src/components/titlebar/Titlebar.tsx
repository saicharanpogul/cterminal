import { getCurrentWindow } from "@tauri-apps/api/window";

export function Titlebar() {
  const appWindow = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center h-10 bg-surface-1 border-b border-border select-none shrink-0"
    >
      {/* macOS traffic light spacing */}
      <div className="w-[78px] shrink-0" />

      {/* Title */}
      <div
        data-tauri-drag-region
        className="flex-1 flex items-center justify-center"
      >
        <span className="text-xs font-medium text-text-secondary tracking-wider uppercase">
          cterminal
        </span>
      </div>

      {/* Window controls (hidden on macOS, shown on Windows/Linux) */}
      <div className="hidden items-center gap-1 pr-2">
        <button
          onClick={() => appWindow.minimize()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-3 text-text-secondary"
        >
          <MinusIcon />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-3 text-text-secondary"
        >
          <MaximizeIcon />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/20 text-text-secondary hover:text-red-400"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

function MinusIcon() {
  return (
    <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
      <rect width="10" height="1" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <rect x="0.5" y="0.5" width="9" height="9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <line x1="0" y1="0" x2="10" y2="10" />
      <line x1="10" y1="0" x2="0" y2="10" />
    </svg>
  );
}
