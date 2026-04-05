import type { PermissionWidget } from "@/lib/widgetDetector";
import { ShieldCheck } from "lucide-react";

interface Props {
  widget: PermissionWidget;
}

export function PermissionOverlay({ widget }: Props) {
  const { tool, action, detail } = widget.data;

  return (
    <div className="mx-4 rounded-lg bg-surface-1/95 backdrop-blur-md border border-amber-500/30 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/20">
        <ShieldCheck size={14} className="text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-amber-400">
          Permission Required
        </span>
      </div>

      {/* Details */}
      <div className="px-4 py-3 space-y-2">
        {tool && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted uppercase tracking-wider w-12 shrink-0">
              Tool
            </span>
            <span className="text-xs text-text-primary font-mono font-medium">
              {tool}
            </span>
          </div>
        )}
        {action && (
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-text-muted uppercase tracking-wider w-12 shrink-0 mt-0.5">
              Action
            </span>
            <span className="text-xs text-text-secondary leading-relaxed">
              {action}
            </span>
          </div>
        )}
        {detail && !detail.includes("─") && (
          <div className="mt-1 p-2 rounded bg-surface-0 border border-border/30">
            <pre className="text-[10px] text-text-secondary font-mono whitespace-pre-wrap break-all">
              {detail}
            </pre>
          </div>
        )}
      </div>

      {/* Action hint */}
      <div className="px-4 py-2 bg-surface-0/50 border-t border-border/30">
        <p className="text-[10px] text-text-muted/60 text-center">
          Use the terminal to respond — type in the active pane
        </p>
      </div>
    </div>
  );
}
