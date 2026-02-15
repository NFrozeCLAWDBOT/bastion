export type RiskLevel = "critical" | "high" | "medium" | "low" | "none" | "unknown";

export type Ecosystem = "npm" | "pypi" | "go" | "maven" | "cargo";

export interface Vulnerability {
  id: string;
  summary: string;
  severity: string;
  cvss: number;
  fixedIn: string;
  cisaKev: boolean;
}

export interface MaintenanceInfo {
  lastPublished: string;
  firstPublished: string;
  weeklyDownloads: number;
  releaseFrequency: string;
}

export interface LicenceInfo {
  spdx: string;
  risk: string;
}

export interface DependencyNode {
  name: string;
  version: string;
  ecosystem: string;
  depth: number;
  isDirect: boolean;
  riskLevel: RiskLevel;
  riskScore: number;
  vulnerabilities: Vulnerability[];
  maintenance: MaintenanceInfo;
  licence: LicenceInfo;
  dependsOn: string[];
  dependedOnBy: string[];
}

export interface RiskiestPath {
  path: string[];
  maxRiskScore: number;
  reason: string;
}

export interface RiskSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  none: number;
}

export interface AnalysisResult {
  ecosystem: string;
  root: string;
  totalDependencies: number;
  directDependencies: number;
  transitiveDependencies: number;
  riskSummary: RiskSummary;
  nodes: DependencyNode[];
  riskiestPaths: RiskiestPath[];
}
