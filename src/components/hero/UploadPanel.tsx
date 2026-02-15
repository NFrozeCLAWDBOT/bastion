import { useState, useCallback, type DragEvent } from "react";
import type { Ecosystem } from "@/types/dependency";
import { EcosystemSelector } from "./EcosystemSelector";
import { cn } from "@/lib/utils";

const ECOSYSTEM_MAP: Record<string, Ecosystem> = {
  "package.json": "npm",
  "requirements.txt": "pypi",
  "go.mod": "go",
  "pom.xml": "maven",
  "Cargo.toml": "cargo",
};

export function UploadPanel({
  onAnalyse,
  isAnalysing,
}: {
  onAnalyse: (manifest: string, ecosystem: Ecosystem) => void;
  isAnalysing: boolean;
}) {
  const [ecosystem, setEcosystem] = useState<Ecosystem>("npm");
  const [manifest, setManifest] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const detectedEco = ECOSYSTEM_MAP[file.name];
      if (detectedEco) setEcosystem(detectedEco);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setManifest(text);
      };
      reader.readAsText(file);
    },
    []
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSubmit = () => {
    if (manifest.trim()) {
      onAnalyse(manifest, ecosystem);
    }
  };

  return (
    <div className="glass-panel p-8 w-full max-w-2xl mx-auto space-y-6">
      <div className="flex justify-center">
        <EcosystemSelector value={ecosystem} onChange={setEcosystem} />
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer",
          isDragging
            ? "border-crimson bg-crimson/10"
            : "border-glass-border hover:border-white/10"
        )}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".json,.txt,.mod,.xml,.toml";
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleFile(file);
          };
          input.click();
        }}
      >
        <p className="font-mono text-sm text-smoke-grey">
          {isDragging ? (
            <span className="text-crimson">Drop your manifest file</span>
          ) : (
            <>
              Drop your manifest file here or{" "}
              <span className="text-crimson">browse</span>
            </>
          )}
        </p>
        <p className="text-xs text-deep-grey mt-2">
          package.json, requirements.txt, go.mod, pom.xml, Cargo.toml
        </p>
      </div>

      {/* Or paste */}
      <div className="space-y-2">
        <p className="text-xs text-deep-grey font-mono text-center">
          Or paste your manifest contents
        </p>
        <textarea
          value={manifest}
          onChange={(e) => setManifest(e.target.value)}
          placeholder='{\n  "dependencies": {\n    "express": "^4.18.2"\n  }\n}'
          className="w-full h-32 bg-abyss/50 border border-glass-border rounded-xl p-4 font-mono text-sm text-ash-white placeholder-deep-grey resize-none focus:outline-none focus:border-crimson/30 transition-colors"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!manifest.trim() || isAnalysing}
        className={cn(
          "w-full py-3 rounded-xl font-mono text-sm font-medium transition-all duration-300 cursor-pointer",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          isAnalysing
            ? "bg-crimson/20 text-crimson animate-pulse"
            : "bg-crimson text-white hover:bg-crimson-hover"
        )}
      >
        {isAnalysing ? "Analysing..." : "Analyse Dependencies"}
      </button>
    </div>
  );
}
