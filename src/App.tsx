import { useState } from "react";
import type { AnalysisResult, DependencyNode } from "@/types/dependency";

function App() {
  const [_result, _setResult] = useState<AnalysisResult | null>(null);
  const [_selectedNode, _setSelectedNode] = useState<DependencyNode | null>(null);
  const [_isAnalysing, _setIsAnalysing] = useState(false);

  return (
    <div className="min-h-screen bg-abyss">
      <h1 className="font-mono text-5xl text-ash-white text-center pt-24 tracking-tight">
        BASTION
      </h1>
      <p className="text-smoke-grey text-center mt-4 text-lg">
        See what's hiding in your dependencies
      </p>
    </div>
  );
}

export default App;
