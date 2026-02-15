import type { RiskiestPath } from "@/types/dependency";

export function RiskiestPaths({ paths }: { paths: RiskiestPath[] }) {
  if (paths.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-mono text-sm text-smoke-grey">Riskiest Paths</h3>
      {paths.map((p, i) => (
        <div key={i} className="bg-abyss/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {p.path.map((segment, j) => (
              <span key={j} className="flex items-center gap-1.5">
                {j > 0 && (
                  <span className="text-deep-grey text-xs">&rarr;</span>
                )}
                <span className="font-mono text-xs text-ash-white">
                  {segment.split("@")[0]}
                </span>
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-smoke-grey">{p.reason}</span>
            <span className="font-mono text-xs text-ember">
              Score: {p.maxRiskScore}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
