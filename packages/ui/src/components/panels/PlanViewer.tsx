import type { PlanFile } from "@/lib/tauri";
import { FileText, Clock } from "lucide-react";

interface PlanViewerProps {
  plan: PlanFile | null;
}

export function PlanViewer({ plan }: PlanViewerProps) {
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted p-6">
        <FileText size={24} className="mb-3 opacity-40" />
        <p className="text-xs text-center">
          No plan file found.
          <br />
          <span className="text-text-muted/60 mt-1 block">
            Run Claude in plan mode to see it here.
          </span>
        </p>
      </div>
    );
  }

  const modified = new Date(plan.modified * 1000);
  const timeStr = modified.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col h-full">
      {/* Plan header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <FileText size={12} className="text-accent shrink-0" />
        <span className="text-[11px] font-medium text-text-primary truncate flex-1">
          {plan.name}
        </span>
        <div className="flex items-center gap-1 text-[9px] text-text-muted">
          <Clock size={9} />
          {timeStr}
        </div>
      </div>

      {/* Plan content as rendered markdown */}
      <div className="flex-1 overflow-y-auto p-3">
        <MarkdownContent content={plan.content} />
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <MarkdownLine key={i} line={line} />
      ))}
    </div>
  );
}

function MarkdownLine({ line }: { line: string }) {
  const trimmed = line.trim();

  // Empty line
  if (!trimmed) {
    return <div className="h-2" />;
  }

  // H1
  if (trimmed.startsWith("# ")) {
    return (
      <h1 className="text-sm font-bold text-text-primary mt-3 mb-1 border-b border-border/30 pb-1">
        {trimmed.slice(2)}
      </h1>
    );
  }

  // H2
  if (trimmed.startsWith("## ")) {
    return (
      <h2 className="text-xs font-bold text-text-primary mt-2.5 mb-0.5">
        {trimmed.slice(3)}
      </h2>
    );
  }

  // H3
  if (trimmed.startsWith("### ")) {
    return (
      <h3 className="text-xs font-semibold text-text-secondary mt-2 mb-0.5">
        {trimmed.slice(4)}
      </h3>
    );
  }

  // Checkbox - pending
  if (trimmed.startsWith("- [ ] ")) {
    return (
      <div className="flex items-start gap-2 py-0.5">
        <div className="w-3 h-3 mt-0.5 rounded border border-text-muted/40 shrink-0" />
        <span className="text-[11px] text-text-secondary leading-relaxed">
          <InlineMarkdown text={trimmed.slice(6)} />
        </span>
      </div>
    );
  }

  // Checkbox - completed
  if (trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ")) {
    return (
      <div className="flex items-start gap-2 py-0.5">
        <div className="w-3 h-3 mt-0.5 rounded bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
          <span className="text-[8px] text-accent">✓</span>
        </div>
        <span className="text-[11px] text-text-muted line-through leading-relaxed">
          <InlineMarkdown text={trimmed.slice(6)} />
        </span>
      </div>
    );
  }

  // Bullet list
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    return (
      <div className="flex items-start gap-2 py-0.5 pl-1">
        <span className="text-text-muted/60 mt-1 text-[6px]">●</span>
        <span className="text-[11px] text-text-secondary leading-relaxed">
          <InlineMarkdown text={trimmed.slice(2)} />
        </span>
      </div>
    );
  }

  // Code block marker
  if (trimmed.startsWith("```")) {
    return (
      <div className="border-t border-border/30 my-1" />
    );
  }

  // Bold line (likely a section)
  if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
    return (
      <p className="text-[11px] font-semibold text-text-primary mt-1.5">
        {trimmed.slice(2, -2)}
      </p>
    );
  }

  // Regular text
  return (
    <p className="text-[11px] text-text-secondary leading-relaxed">
      <InlineMarkdown text={trimmed} />
    </p>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  // Simple inline formatting: **bold**, `code`, *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-text-primary">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="px-1 py-0.5 bg-surface-3 rounded text-[10px] text-accent font-mono"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
          return (
            <em key={i} className="italic text-text-secondary">
              {part.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
