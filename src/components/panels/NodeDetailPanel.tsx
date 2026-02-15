import type { DependencyNode } from "@/types/dependency";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { cn } from "@/lib/utils";

export function NodeDetailPanel({
  node,
  onClose,
}: {
  node: DependencyNode | null;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-full max-w-[480px] z-50",
        "bg-glass backdrop-blur-2xl border-l border-glass-border",
        "transform transition-transform duration-300 ease-in-out",
        "overflow-y-auto",
        node ? "translate-x-0" : "translate-x-full"
      )}
    >
      {node && (
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-mono text-lg text-ash-white">
                {node.name}
              </h2>
              <p className="font-mono text-sm text-smoke-grey">
                v{node.version}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-smoke-grey hover:text-ash-white transition-colors p-1 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Risk */}
          <div className="flex items-center gap-3">
            <RiskBadge level={node.riskLevel} />
            <span className="font-mono text-sm text-smoke-grey">
              Score: {node.riskScore}/100
            </span>
          </div>

          {/* Vulnerabilities */}
          {node.vulnerabilities.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-mono text-sm text-smoke-grey">
                Vulnerabilities ({node.vulnerabilities.length})
              </h3>
              {node.vulnerabilities.map((vuln) => (
                <div
                  key={vuln.id}
                  className="bg-abyss/50 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-crimson">
                      {vuln.id}
                    </span>
                    <span className="font-mono text-xs text-smoke-grey">
                      {vuln.severity}
                      {vuln.cvss > 0 && ` (${vuln.cvss})`}
                    </span>
                  </div>
                  <p className="text-xs text-smoke-grey leading-relaxed">
                    {vuln.summary}
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    {vuln.fixedIn && (
                      <span className="text-forge-teal">
                        Fix: v{vuln.fixedIn}
                      </span>
                    )}
                    {vuln.cisaKev && (
                      <span className="text-crimson font-medium">
                        CISA KEV
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Maintenance */}
          <div className="space-y-3">
            <h3 className="font-mono text-sm text-smoke-grey">Maintenance</h3>
            <div className="bg-abyss/50 rounded-lg p-3 space-y-2">
              <Row label="First Published" value={node.maintenance.firstPublished || "Unknown"} />
              <Row label="Last Published" value={node.maintenance.lastPublished || "Unknown"} />
              <Row
                label="Weekly Downloads"
                value={
                  node.maintenance.weeklyDownloads
                    ? node.maintenance.weeklyDownloads.toLocaleString()
                    : "Unknown"
                }
              />
              <Row label="Release Frequency" value={node.maintenance.releaseFrequency} />
            </div>
          </div>

          {/* Licence */}
          <div className="space-y-3">
            <h3 className="font-mono text-sm text-smoke-grey">Licence</h3>
            <div className="bg-abyss/50 rounded-lg p-3 space-y-2">
              <Row label="SPDX" value={node.licence.spdx || "Unknown"} />
              <Row label="Risk" value={node.licence.risk} />
            </div>
          </div>

          {/* Dependencies */}
          {node.dependsOn.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-mono text-sm text-smoke-grey">
                Depends On ({node.dependsOn.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {node.dependsOn.map((dep) => (
                  <span
                    key={dep}
                    className="font-mono text-xs px-2 py-1 bg-abyss/50 rounded-lg text-smoke-grey"
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs text-deep-grey">{label}</span>
      <span className="font-mono text-xs text-ash-white">{value}</span>
    </div>
  );
}
