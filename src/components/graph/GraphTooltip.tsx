import type { DependencyNode } from "@/types/dependency";
import { RiskBadge } from "@/components/ui/RiskBadge";

export function GraphTooltip({
  node,
  x,
  y,
}: {
  node: DependencyNode;
  x: number;
  y: number;
}) {
  return (
    <div
      className="glass-panel px-3 py-2 pointer-events-none fixed z-50"
      style={{ left: x + 12, top: y - 10 }}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-ash-white">
          {node.name}@{node.version}
        </span>
        <RiskBadge level={node.riskLevel} />
      </div>
    </div>
  );
}
