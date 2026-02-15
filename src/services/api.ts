import type { AnalysisResult, Ecosystem } from "../types/dependency";

const API_URL = import.meta.env.VITE_API_URL || "";

export async function analyseManifest(
  manifest: string,
  ecosystem: Ecosystem
): Promise<AnalysisResult> {
  const res = await fetch(`${API_URL}/api/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ manifest, ecosystem }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function generateSBOM(
  analysisResult: AnalysisResult
): Promise<object> {
  const res = await fetch(`${API_URL}/api/sbom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(analysisResult),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}
