import type { AnalysisResult } from "@/types/dependency";
import { RiskBar } from "./RiskBar";
import { RiskiestPaths } from "./RiskiestPaths";
import { ExportButton } from "@/components/ui/ExportButton";

export function SummaryPanel({
  result,
  onExportSBOM,
  onExportPDF,
  isExporting,
}: {
  result: AnalysisResult;
  onExportSBOM: () => void;
  onExportPDF: () => void;
  isExporting: boolean;
}) {
  return (
    <div className="glass-panel p-6 space-y-6">
      <h2 className="font-mono text-lg text-ash-white">Summary</h2>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="font-mono text-2xl text-ash-white">
            {result.totalDependencies}
          </p>
          <p className="text-xs text-smoke-grey">Total</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-2xl text-ash-white">
            {result.directDependencies}
          </p>
          <p className="text-xs text-smoke-grey">Direct</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-2xl text-ash-white">
            {result.transitiveDependencies}
          </p>
          <p className="text-xs text-smoke-grey">Transitive</p>
        </div>
      </div>

      {/* Risk bar */}
      <RiskBar summary={result.riskSummary} />

      {/* Riskiest paths */}
      <RiskiestPaths paths={result.riskiestPaths} />

      {/* Export buttons */}
      <div className="flex gap-3">
        <ExportButton onClick={onExportSBOM} disabled={isExporting}>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          SBOM
        </ExportButton>
        <ExportButton onClick={onExportPDF} disabled={isExporting}>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          PDF Report
        </ExportButton>
      </div>
    </div>
  );
}
