import type { Terminal } from "@xterm/xterm";

/**
 * Widget types that cterminal can detect and render natively.
 */
export type WidgetType =
  | "selector"
  | "shell-output"
  | "permission-prompt"
  | "bordered-section";

export interface DetectedWidget {
  type: WidgetType;
  startRow: number;
  endRow: number;
  data: Record<string, unknown>;
}

export interface SelectorWidget extends DetectedWidget {
  type: "selector";
  data: {
    title: string;
    options: { label: string; description: string }[];
    selectedIndex: number;
  };
}

export interface ShellOutputWidget extends DetectedWidget {
  type: "shell-output";
  data: {
    title: string;
    status: string;
    runtime: string;
    command: string;
    output: string[];
    lineCount: string;
  };
}

export interface PermissionWidget extends DetectedWidget {
  type: "permission-prompt";
  data: {
    tool: string;
    action: string;
    detail: string;
  };
}

export interface BorderedWidget extends DetectedWidget {
  type: "bordered-section";
  data: {
    title: string;
    content: string[];
  };
}

/**
 * Scans the visible terminal buffer for known Claude Code widget patterns.
 * Returns an array of detected widgets with their positions and parsed data.
 */
export function detectWidgets(terminal: Terminal): DetectedWidget[] {
  const widgets: DetectedWidget[] = [];
  const buffer = terminal.buffer.active;
  const visibleRows = terminal.rows;
  // Read all visible lines
  const lines: string[] = [];
  for (let i = 0; i < visibleRows; i++) {
    const row = buffer.baseY + i;
    const line = buffer.getLine(row);
    lines.push(line ? lineToString(line) : "");
  }

  // Detect selector widgets (numbered options with descriptions)
  const selectorWidget = detectSelector(lines);
  if (selectorWidget) widgets.push(selectorWidget);

  // Detect shell output widgets
  const shellWidget = detectShellOutput(lines);
  if (shellWidget) widgets.push(shellWidget);

  // Detect permission prompts
  const permWidget = detectPermissionPrompt(lines);
  if (permWidget) widgets.push(permWidget);

  // Detect bordered sections (box-drawing)
  const borderedWidgets = detectBorderedSections(lines);
  widgets.push(...borderedWidgets);

  return widgets;
}

function lineToString(line: { length: number; getCell: (x: number) => { getChars: () => string } | undefined }): string {
  let str = "";
  for (let i = 0; i < line.length; i++) {
    const cell = line.getCell(i);
    str += cell ? cell.getChars() || " " : " ";
  }
  return str.trimEnd();
}

/**
 * Detect selector/options widget pattern:
 *   Title line
 *   1. Option
 *      Description
 *   2. Option
 *      Description
 */
function detectSelector(lines: string[]): SelectorWidget | null {
  for (let i = 0; i < lines.length - 3; i++) {
    // Look for a line followed by numbered options
    let optionStart = -1;
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      if (/^\s*1\.\s+\S/.test(lines[j])) {
        optionStart = j;
        break;
      }
    }
    if (optionStart === -1) continue;

    // Parse numbered options
    const options: { label: string; description: string }[] = [];
    let j = optionStart;
    let selectedIndex = -1;

    while (j < lines.length) {
      const optMatch = lines[j].match(/^\s*(\d+)\.\s+(.+)$/);
      if (!optMatch) break;

      const label = optMatch[2].trim();
      let description = "";

      // Check for description on next line (indented)
      if (j + 1 < lines.length && /^\s{4,}/.test(lines[j + 1]) && !/^\s*\d+\./.test(lines[j + 1])) {
        description = lines[j + 1].trim();
        j += 2;
      } else {
        j++;
      }

      // Detect selection indicator (❯ or > or highlighted)
      if (lines[j - (description ? 2 : 1)].includes("❯") || lines[j - (description ? 2 : 1)].includes(">")) {
        selectedIndex = options.length;
      }

      options.push({ label, description });
    }

    if (options.length >= 2) {
      // Find the title — it's the non-empty line before the first option
      let title = "";
      for (let k = optionStart - 1; k >= Math.max(0, optionStart - 3); k--) {
        if (lines[k].trim()) {
          title = lines[k].trim();
          break;
        }
      }

      return {
        type: "selector",
        startRow: Math.max(0, optionStart - 2),
        endRow: j,
        data: {
          title,
          options,
          selectedIndex: Math.max(0, selectedIndex),
        },
      };
    }
  }
  return null;
}

/**
 * Detect shell output widget pattern:
 *   Shell details
 *   Status: running
 *   Runtime: 4s
 *   Command: ...
 *   Output:
 *     ...
 */
function detectShellOutput(lines: string[]): ShellOutputWidget | null {
  for (let i = 0; i < lines.length - 4; i++) {
    const trimmed = lines[i].trim();
    if (
      trimmed === "Shell details" ||
      trimmed.includes("Shell details") ||
      trimmed === "Bash" ||
      (trimmed.startsWith("Status:") && lines[i + 1]?.trim().startsWith("Runtime:"))
    ) {
      let startRow = i;
      let status = "";
      let runtime = "";
      let command = "";
      const output: string[] = [];
      let lineCount = "";

      // If we landed on "Shell details", start parsing from next line
      let parseStart = trimmed.includes("Shell details") || trimmed === "Bash" ? i + 1 : i;

      for (let j = parseStart; j < lines.length; j++) {
        const l = lines[j].trim();
        if (l.startsWith("Status:")) status = l.replace("Status:", "").trim();
        else if (l.startsWith("Runtime:")) runtime = l.replace("Runtime:", "").trim();
        else if (l.startsWith("Command:")) command = l.replace("Command:", "").trim();
        else if (l.startsWith("Output:")) {
          // Collect output lines
          for (let k = j + 1; k < lines.length; k++) {
            const ol = lines[k];
            if (ol.trim().startsWith("Showing") || ol.trim().startsWith("←") || !ol.trim()) {
              if (ol.trim().startsWith("Showing")) lineCount = ol.trim();
              break;
            }
            output.push(ol);
          }
          break;
        }
      }

      if (status || command) {
        // Find end
        let endRow = i + 1;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim().startsWith("←") || lines[j].trim() === "") {
            endRow = j + 1;
            break;
          }
          endRow = j + 1;
        }

        return {
          type: "shell-output",
          startRow,
          endRow,
          data: {
            title: trimmed.includes("Shell details") ? "Shell details" : "Bash",
            status,
            runtime,
            command,
            output,
            lineCount,
          },
        };
      }
    }
  }
  return null;
}

/**
 * Detect permission prompt pattern:
 *   Allow / Deny buttons
 *   Tool name and action description
 */
function detectPermissionPrompt(lines: string[]): PermissionWidget | null {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Look for permission-related keywords
    if (
      (trimmed.includes("Allow") && trimmed.includes("Deny")) ||
      trimmed.includes("Yes, allow") ||
      trimmed.includes("allow this action") ||
      trimmed.includes("approve this")
    ) {
      // Search backward for tool/action info
      let tool = "";
      let action = "";
      let detail = "";

      for (let j = Math.max(0, i - 5); j < i; j++) {
        const l = lines[j].trim();
        if (l.includes("wants to") || l.includes("requesting")) {
          action = l;
        }
        if (l.includes("Bash") || l.includes("Edit") || l.includes("Write") || l.includes("Read")) {
          tool = l;
        }
        if (!detail && l && !l.startsWith("─") && !l.startsWith("━")) {
          detail = l;
        }
      }

      return {
        type: "permission-prompt",
        startRow: Math.max(0, i - 5),
        endRow: i + 2,
        data: { tool, action, detail },
      };
    }
  }
  return null;
}

/**
 * Detect bordered sections using box-drawing characters:
 *   ┌─ Title ─┐ or ╭─ Title ─╮ or □ Title
 */
function detectBorderedSections(lines: string[]): BorderedWidget[] {
  const widgets: BorderedWidget[] = [];
  const boxChars = ["┌", "╭", "╔", "□", "■", "▪"];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Check for box-drawing start
    const hasBoxStart = boxChars.some((c) => trimmed.startsWith(c));
    if (!hasBoxStart) continue;

    // Extract title from the bordered line
    const titleMatch = trimmed.match(/[┌╭╔□■▪]\s*(.+?)(?:\s*[─━═]*\s*[┐╮╗])?$/);
    if (!titleMatch) continue;

    const title = titleMatch[1].replace(/[─━═]/g, "").trim();
    if (!title || title.length < 2) continue;

    // Collect content until closing border or empty section
    const content: string[] = [];
    let endRow = i + 1;
    for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
      const cl = lines[j].trim();
      if (cl.startsWith("└") || cl.startsWith("╰") || cl.startsWith("╚")) {
        endRow = j + 1;
        break;
      }
      if (cl) content.push(cl);
      endRow = j + 1;
    }

    if (content.length > 0) {
      widgets.push({
        type: "bordered-section",
        startRow: i,
        endRow,
        data: { title, content },
      });
    }
  }

  return widgets;
}
