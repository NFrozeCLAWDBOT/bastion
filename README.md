# Bastion

**Live:** [bastion.nfroze.co.uk](https://bastion.nfroze.co.uk)

![Live](video/bastion.gif)

A browser-based supply chain risk analyser that recursively resolves transitive dependency trees, scores every package against CVE databases and CISA's Known Exploited Vulnerabilities catalogue, and visualises the results as an interactive force-directed graph.

## Overview

Most developers have no practical way to audit what their dependencies depend on. Tools like Snyk and Sonatype solve this at enterprise scale, but they cost five figures annually. Meanwhile, a single compromised transitive dependency  -  three or four levels deep  -  can expose an entire production system.

Bastion gives any developer immediate visibility into their full dependency tree. Upload a package manifest (package.json, requirements.txt, go.mod, pom.xml, or Cargo.toml), and the tool recursively resolves every transitive dependency via public registry APIs. Each package is then scored 0–100 on six weighted risk signals: CVE severity, CISA KEV membership, package age, maintenance staleness, download popularity, and licence risk. Results render as a D3.js force-directed graph where node colour maps directly to risk level across six tiers  -  crimson for critical, orange for high, amber for medium, teal for low, green for none, and grey for unknown  -  and clicking any node reveals its full CVE list, maintainer activity, and licence classification.

The tool also generates CycloneDX 1.5 SBOMs with full VEX vulnerability entries and exports PDF risk reports, giving teams formal artifacts for compliance and security review workflows.

## Architecture

The backend runs on two AWS Lambda functions behind an API Gateway HTTP API. The resolver Lambda (60s timeout, 256 MB) handles manifest parsing, recursive resolution capped at depth 5 with a 50-second timeout budget, and vulnerability scanning. Rather than making 140+ individual OSV API calls for a typical npm project, it batches up to 1,000 packages into a single request  -  the difference between timing out and completing in seconds.

A DynamoDB table caches results using a SHA-256 hash of the manifest as the key, with 24-hour TTL expiry. Repeat analyses of the same manifest return instantly. The SBOM Lambda (30s timeout, 128 MB) transforms analysis results into CycloneDX 1.5 JSON with full component inventory, dependency relationships, and VEX entries marking CISA KEV items as exploitable.

The frontend is a React 19 SPA with a D3.js force-directed graph visualisation. PDF export uses html2canvas and jsPDF entirely client-side  -  no headless Chrome or additional Lambda required.

## Tech Stack

**Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS 3, D3.js 7, jsPDF, html2canvas

**Backend**: AWS Lambda (Python 3.12), API Gateway HTTP API, DynamoDB (on-demand, SHA-256 cache with 24h TTL)

**Infrastructure**: Terraform, AWS S3 (static hosting), Cloudflare (DNS, SSL), eu-west-2

**Data Sources**: npm registry, PyPI, Go Proxy, crates.io, Maven Central, OSV (batch API), CISA KEV catalogue

**Ecosystems**: npm, PyPI, Go, Maven, Cargo

## Key Decisions

- **Batched OSV queries over individual lookups**: One API call for up to 1,000 packages instead of 140+ individual requests. This is the difference between fitting within Lambda's timeout and failing on any non-trivial npm project.

- **Six-signal risk scoring**: CVSS alone misses context. Adding CISA KEV (flat 25-point bonus that forces critical), maintenance staleness, download popularity, package age, and licence risk produces scores that better reflect real-world exploitability.

- **Client-side PDF export**: html2canvas + jsPDF eliminates the need for a headless Chrome Lambda, which would add cold-start latency, memory overhead, and deployment complexity for a feature used once per session.

- **Depth cap and timeout budget**: Recursive resolution stops at depth 5 with a 50-second budget (leaving 10 seconds of margin before Lambda's 60-second hard limit). This prevents runaway resolution on deeply nested npm trees while still capturing the vast majority of real-world risk.

## Author

**Noah Frost**

- Website: [noahfrost.co.uk](https://noahfrost.co.uk)
- GitHub: [github.com/nfroze](https://github.com/nfroze)
- LinkedIn: [linkedin.com/in/nfroze](https://linkedin.com/in/nfroze)
