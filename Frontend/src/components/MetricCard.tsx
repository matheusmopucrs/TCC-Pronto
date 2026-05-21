interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
  hint?: string;
  bordered?: boolean;
}

export function MetricCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  hint,
  bordered = false,
}: MetricCardProps) {
  const toneClass =
    deltaTone === "positive"
      ? "text-positive"
      : deltaTone === "negative"
        ? "text-negative"
        : "text-ink-muted";

  return (
    <div className={`flex flex-col gap-2 ${bordered ? "border-l border-hairline pl-8" : ""}`}>
      <div className="text-xs text-ink-muted uppercase tracking-wider mb-2">{label}</div>
      <div className="font-mono text-4xl text-ink tracking-tight tabular-nums">{value}</div>
      {delta && (
        <div className={`text-sm mt-1 flex items-center gap-2 ${toneClass}`}>
          <span className="text-lg leading-none">
            {deltaTone === "positive" ? "↓" : deltaTone === "negative" ? "↑" : "•"}
          </span>
          {delta}
        </div>
      )}
      {hint && <div className="text-sm text-ink-muted mt-1">{hint}</div>}
    </div>
  );
}
