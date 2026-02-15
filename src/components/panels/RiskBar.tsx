import type { RiskSummary } from "@/types/dependency";

const SEGMENTS: { key: keyof RiskSummary; color: string; label: string }[] = [
  { key: "critical", color: "#C41A1A", label: "Critical" },
  { key: "high", color: "#E8590C", label: "High" },
  { key: "medium", color: "#F59E0B", label: "Medium" },
  { key: "low", color: "#06B6D4", label: "Low" },
  { key: "none", color: "#22C55E", label: "None" },
];

export function RiskBar({ summary }: { summary: RiskSummary }) {
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-abyss/50">
        {SEGMENTS.map(({ key, color }) => {
          const pct = (summary[key] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={key}
              style={{ width: `${pct}%`, backgroundColor: color }}
              className="transition-all duration-500"
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {SEGMENTS.map(({ key, color, label }) => {
          if (summary[key] === 0) return null;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-mono text-xs text-smoke-grey">
                {label}: {summary[key]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
