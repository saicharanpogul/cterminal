import type { DiffInfo, FileDiff } from "@/lib/tauri";
import { GitBranch, Plus, Minus, FileCode } from "lucide-react";
import { useState } from "react";

interface DiffViewerProps {
  diff: DiffInfo | null;
}

export function DiffViewer({ diff }: DiffViewerProps) {
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  if (!diff || diff.files_changed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted p-6">
        <GitBranch size={24} className="mb-3 opacity-40" />
        <p className="text-xs text-center">
          No changes detected.
          <br />
          <span className="text-text-muted/60 mt-1 block">
            File diffs appear here when Claude edits files.
          </span>
        </p>
      </div>
    );
  }

  const totalAdd = diff.files_changed.reduce((s, f) => s + f.additions, 0);
  const totalDel = diff.files_changed.reduce((s, f) => s + f.deletions, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Summary header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <GitBranch size={12} className="text-accent shrink-0" />
        <span className="text-[11px] text-text-primary font-medium flex-1">
          {diff.files_changed.length} file{diff.files_changed.length > 1 ? "s" : ""} changed
        </span>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-green-400 flex items-center gap-0.5">
            <Plus size={9} />
            {totalAdd}
          </span>
          <span className="text-red-400 flex items-center gap-0.5">
            <Minus size={9} />
            {totalDel}
          </span>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {diff.files_changed.map((file) => (
          <FileEntry
            key={file.path}
            file={file}
            isExpanded={expandedFile === file.path}
            onToggle={() =>
              setExpandedFile(expandedFile === file.path ? null : file.path)
            }
          />
        ))}
      </div>
    </div>
  );
}

function FileEntry({
  file,
  isExpanded,
  onToggle,
}: {
  file: FileDiff;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border/30">
      {/* File header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-2 transition-colors"
      >
        <FileCode size={11} className="text-text-muted shrink-0" />
        <span className="text-[11px] text-text-secondary truncate flex-1 font-mono">
          {file.path}
        </span>
        <div className="flex items-center gap-1.5 text-[9px] shrink-0">
          {file.additions > 0 && (
            <span className="text-green-400">+{file.additions}</span>
          )}
          {file.deletions > 0 && (
            <span className="text-red-400">-{file.deletions}</span>
          )}
        </div>
        {/* Change bar */}
        <DiffBar additions={file.additions} deletions={file.deletions} />
      </button>

      {/* Expanded diff */}
      {isExpanded && file.diff && (
        <div className="bg-surface-0 border-t border-border/30 overflow-x-auto">
          <pre className="text-[10px] leading-[1.6] font-mono p-2">
            {file.diff.split("\n").map((line, i) => (
              <DiffLine key={i} line={line} />
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}

function DiffLine({ line }: { line: string }) {
  let className = "text-text-muted/60"; // default

  if (line.startsWith("+") && !line.startsWith("+++")) {
    className = "text-green-400 bg-green-400/5";
  } else if (line.startsWith("-") && !line.startsWith("---")) {
    className = "text-red-400 bg-red-400/5";
  } else if (line.startsWith("@@")) {
    className = "text-blue-400/70";
  } else if (line.startsWith("diff ") || line.startsWith("index ")) {
    className = "text-text-muted/40";
  }

  return (
    <div className={`${className} px-1 -mx-1`}>
      {line || " "}
    </div>
  );
}

function DiffBar({
  additions,
  deletions,
}: {
  additions: number;
  deletions: number;
}) {
  const total = additions + deletions;
  if (total === 0) return null;
  const max = 5;
  const addBlocks = Math.round((additions / total) * max);
  const delBlocks = max - addBlocks;

  return (
    <div className="flex gap-px shrink-0">
      {Array.from({ length: addBlocks }).map((_, i) => (
        <div key={`a${i}`} className="w-1.5 h-1.5 bg-green-400 rounded-sm" />
      ))}
      {Array.from({ length: delBlocks }).map((_, i) => (
        <div key={`d${i}`} className="w-1.5 h-1.5 bg-red-400 rounded-sm" />
      ))}
    </div>
  );
}
