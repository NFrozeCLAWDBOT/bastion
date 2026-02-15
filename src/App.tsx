import { useState, useRef, useCallback } from "react";
import type { AnalysisResult, DependencyNode, Ecosystem } from "@/types/dependency";
import { HeroSection } from "@/components/hero/HeroSection";
import { DependencyGraph } from "@/components/graph/DependencyGraph";
import { SummaryPanel } from "@/components/panels/SummaryPanel";
import { NodeDetailPanel } from "@/components/panels/NodeDetailPanel";
import { LoadingSkeleton } from "@/components/layout/LoadingSkeleton";
import { Footer } from "@/components/layout/Footer";
import { analyseManifest, generateSBOM } from "@/services/api";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleAnalyse = useCallback(
    async (manifest: string, ecosystem: Ecosystem) => {
      setIsAnalysing(true);
      setError(null);
      setResult(null);
      setSelectedNode(null);

      try {
        const data = await analyseManifest(manifest, ecosystem);
        setResult(data);

        // Scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setIsAnalysing(false);
      }
    },
    []
  );

  const handleExportSBOM = useCallback(async () => {
    if (!result) return;
    setIsExporting(true);
    try {
      const sbom = await generateSBOM(result);
      const blob = new Blob([JSON.stringify(sbom, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bastion-sbom.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "SBOM export failed");
    } finally {
      setIsExporting(false);
    }
  }, [result]);

  const handleExportPDF = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(resultsRef.current, {
        backgroundColor: "#0A0A0F",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save("bastion-risk-report.pdf");
    } catch {
      setError("PDF export failed");
    } finally {
      setIsExporting(false);
    }
  }, []);

  const selectedNodeId = selectedNode
    ? `${selectedNode.name}@${selectedNode.version}`
    : undefined;

  return (
    <div className="min-h-screen bg-abyss">
      <HeroSection onAnalyse={handleAnalyse} isAnalysing={isAnalysing} />

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="glass-panel p-6 border-crimson/30">
            <p className="font-mono text-sm text-crimson">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isAnalysing && <LoadingSkeleton />}

      {/* Results */}
      {result && (
        <div
          ref={resultsRef}
          className="max-w-7xl mx-auto px-6 py-24 animate-fade-in-up"
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <DependencyGraph
                nodes={result.nodes}
                onNodeClick={setSelectedNode}
                selectedNodeId={selectedNodeId}
              />
            </div>
            <div className="lg:col-span-2">
              <SummaryPanel
                result={result}
                onExportSBOM={handleExportSBOM}
                onExportPDF={handleExportPDF}
                isExporting={isExporting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Node detail */}
      <NodeDetailPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />

      {/* Backdrop for detail panel */}
      {selectedNode && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSelectedNode(null)}
        />
      )}

      <Footer />
    </div>
  );
}

export default App;
