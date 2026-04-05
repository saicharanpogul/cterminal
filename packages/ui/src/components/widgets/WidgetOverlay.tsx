import { useEffect, useState, useRef } from "react";
import type { Terminal } from "@xterm/xterm";
import {
  detectWidgets,
  type DetectedWidget,
  type SelectorWidget,
  type ShellOutputWidget,
  type PermissionWidget,
} from "@/lib/widgetDetector";
import { SelectorOverlay } from "./SelectorOverlay";
import { ShellOutputOverlay } from "./ShellOutputOverlay";
import { PermissionOverlay } from "./PermissionOverlay";

interface WidgetOverlayProps {
  terminal: Terminal | null;
  isClaudeRunning: boolean;
}

export function WidgetOverlay({ terminal, isClaudeRunning }: WidgetOverlayProps) {
  const [widgets, setWidgets] = useState<DetectedWidget[]>([]);
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!terminal || !isClaudeRunning) {
      setWidgets([]);
      return;
    }

    // Scan terminal buffer for widgets every 500ms when Claude is active
    const scan = () => {
      try {
        const detected = detectWidgets(terminal);
        setWidgets(detected);
      } catch {
        // Terminal may be disposed
      }
    };

    scan();
    scanInterval.current = setInterval(scan, 500);

    // Also scan on terminal data
    const disposable = terminal.onWriteParsed(() => {
      // Debounce: scan 100ms after last write
      if (scanInterval.current) {
        clearInterval(scanInterval.current);
      }
      scanInterval.current = setInterval(scan, 500);
      setTimeout(scan, 100);
    });

    return () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
      disposable.dispose();
    };
  }, [terminal, isClaudeRunning]);

  if (widgets.length === 0 || !terminal) return null;

  // Calculate pixel positions from terminal rows
  const cellHeight = terminal.options.lineHeight
    ? (terminal.options.fontSize ?? 14) * (terminal.options.lineHeight ?? 1.2)
    : (terminal.options.fontSize ?? 14) * 1.2;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {widgets.map((widget, i) => {
        const top = widget.startRow * cellHeight;
        const height = (widget.endRow - widget.startRow) * cellHeight;

        return (
          <div
            key={`${widget.type}-${i}`}
            className="absolute left-0 right-0 pointer-events-auto"
            style={{ top: `${top + 4}px`, minHeight: `${height}px` }}
          >
            <WidgetRenderer widget={widget} />
          </div>
        );
      })}
    </div>
  );
}

function WidgetRenderer({ widget }: { widget: DetectedWidget }) {
  switch (widget.type) {
    case "selector":
      return <SelectorOverlay widget={widget as SelectorWidget} />;
    case "shell-output":
      return <ShellOutputOverlay widget={widget as ShellOutputWidget} />;
    case "permission-prompt":
      return <PermissionOverlay widget={widget as PermissionWidget} />;
    default:
      return null;
  }
}
