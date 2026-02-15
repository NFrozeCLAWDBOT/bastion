import { useState, useCallback } from "react";
import type { AnalysisResult, Ecosystem } from "@/types/dependency";
import { analyseManifest } from "@/services/api";

export function useAnalysis() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyse = useCallback(async (manifest: string, ecosystem: Ecosystem) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyseManifest(manifest, ecosystem);
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, analyse, reset };
}
