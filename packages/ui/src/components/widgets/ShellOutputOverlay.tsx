import type { ShellOutputWidget } from "@/lib/widgetDetector";
import { Terminal, Clock, Play, Square } from "lucide-react";
import { useState } from "react";

interface Props {
  widget: ShellOutputWidget;
}

export function ShellOutputOverlay({ widget }: Props) {
  const { title, status, runtime, command, output, lineCount } = widget.data;
  const [expanded, setExpanded] = useState(true);

  const isRunning = status.toLowerCase().includes("running");
  const statusColor = isRunning ? "text-green-400" : "text-text-muted";

  return (
    <div className="mx-4 rounded-lg bg-surface-1/95 backdrop-blur-md border border-border shadow-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b border-border/50 cursor-pointer hover:bg-surface-2 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Terminal size={13} className="text-cyan-400 shrink-0" />
        <span className="text-xs font-semibold text-cyan-400 flex-1">
          {title}
        </span>

        {/* Status badge */}
        <div className="flex items-center gap-1.5">
          {isRunning ? (
            <Play size={9} className="text-green-400 fill-green-400" />
          ) : (
            <Square size={9} className="text-text-muted" />
          )}
          <span className={`text-[10px] font-medium ${statusColor}`}>
            {status}
          </span>
        </div>

        {runtime && (
          <div className="flex items-center gap-1 text-[10px] text-text-muted">
            <Clock size={9} />
            {runtime}
          </div>
        )}
      </div>

      {expanded && (
        <>
          {/* Command */}
          {command && (
            <div className="px-4 py-2 border-b border-border/30">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Command
              </span>
              <pre className="text-[11px] text-text-primary font-mono mt-1 whitespace-pre-wrap break-all">
                {command}
              </pre>
            </div>
          )}

          {/* Output */}
          {output.length > 0 && (
            <div className="px-4 py-2">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Output
              </span>
              <div className="mt-1 rounded bg-surface-0 border border-border/30 overflow-hidden">
                <pre className="text-[11px] text-text-secondary font-mono p-2 max-h-[200px] overflow-y-auto leading-relaxed">
                  {output.map((line, i) => (
                    <div key={i} className="hover:bg-surface-2/50">
                      {line || " "}
                    </div>
                  ))}
                </pre>
              </div>
              {lineCount && (
                <p className="text-[10px] text-text-muted/60 mt-1 italic">
                  {lineCount}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
