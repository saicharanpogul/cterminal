import type { SelectorWidget } from "@/lib/widgetDetector";

interface Props {
  widget: SelectorWidget;
}

export function SelectorOverlay({ widget }: Props) {
  const { title, options, selectedIndex } = widget.data;

  return (
    <div className="mx-4 rounded-lg bg-surface-1/95 backdrop-blur-md border border-border shadow-xl overflow-hidden">
      {/* Title */}
      {title && (
        <div className="px-4 pt-3 pb-2">
          <h3 className="text-sm font-bold text-text-primary">{title}</h3>
        </div>
      )}

      {/* Options */}
      <div className="px-2 pb-2">
        {options.map((opt, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
              i === selectedIndex
                ? "bg-accent/10 border border-accent/20"
                : "hover:bg-surface-2"
            }`}
          >
            <span
              className={`text-xs font-mono mt-0.5 w-5 shrink-0 ${
                i === selectedIndex
                  ? "text-accent font-bold"
                  : "text-text-muted"
              }`}
            >
              {i + 1}.
            </span>
            <div className="flex-1 min-w-0">
              <div
                className={`text-xs font-semibold ${
                  i === selectedIndex ? "text-accent" : "text-text-primary"
                }`}
              >
                {opt.label}
              </div>
              {opt.description && (
                <div className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                  {opt.description}
                </div>
              )}
            </div>
            {i === selectedIndex && (
              <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0 animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
