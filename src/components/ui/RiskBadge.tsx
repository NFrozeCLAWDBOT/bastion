import type { RiskLevel } from "@/types/dependency";
import { cn } from "@/lib/utils";

const RISK_COLORS: Record<RiskLevel, string> = {
  critical: "bg-crimson/20 text-crimson border-crimson/30",
  high: "bg-ember/20 text-ember border-ember/30",
  medium: "bg-amber/20 text-amber border-amber/30",
  low: "bg-forge-teal/20 text-forge-teal border-forge-teal/30",
  none: "bg-green-500/20 text-green-400 border-green-500/30",
  unknown: "bg-deep-grey/20 text-smoke-grey border-deep-grey/30",
};

export function RiskBadge({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium border",
        RISK_COLORS[level],
        level === "critical" && "animate-pulse-critical",
        className
      )}
    >
      {level.toUpperCase()}
    </span>
  );
}
