# Bastion

**Live:** [bastion.nfroze.co.uk](https://bastion.nfroze.co.uk)

![Live](video/bastion.gif)

Dependency risk analyser that resolves full transitive dependency trees and cross-references every package against CVE databases, CISA KEV, maintenance signals, and licence risk — delivering the kind of supply chain visibility that usually requires Snyk or Sonatype, free in the browser.

## Overview

Software supply chain attacks are among the fastest-growing threat vectors in the industry. Most developers have no practical way to audit what their transitive dependencies actually pull in, or whether any of those packages carry known vulnerabilities, stale maintenance, or restrictive licences. Enterprise tools solve this but cost thousands per year.

Bastion accepts a package manifest (package.json, requirements.txt, go.mod, pom.xml, or Cargo.toml), recursively resolves the full dependency tree via each ecosystem's public registry API, then queries the OSV vulnerability database and CISA Known Exploited Vulnerabilities catalogue for every resolved package. Each dependency is scored 0-100 based on weighted risk signals: CVE severity, CISA KEV membership, package age, maintenance staleness, download popularity, and licence classification. The output is an interactive D3.js force-directed graph where every node glows with its risk colour — critical nodes burning crimson, safe nodes cool teal — with click-through to full CVE details, maintainer activity, and licence data. Users can export a CycloneDX 1.5 SBOM or a PDF risk report directly from the browser.

This project was produced through an automated end-to-end pipeline: brief, hero art, cinemagraph animation, dark glassmorphic frontend, serverless backend, Terraform infrastructure, deployed — one shot, no manual intervention.

## Architecture

The frontend is a React SPA hosted on S3 behind Cloudflare (DNS + SSL). When a user submits a manifest, the request hits API Gateway, which proxies to a **Resolver Lambda** — this function parses the manifest, recursively resolves transitive dependencies against public registry APIs (npm, PyPI, Go proxy, crates.io, Maven Central), batch-queries the OSV API for vulnerabilities, fetches the CISA KEV feed, computes weighted risk scores, and returns the annotated dependency tree. Results are cached in DynamoDB (SHA-256 manifest hash as key, 24-hour TTL) to avoid redundant resolution.

A second **SBOM Lambda** accepts the resolved tree and produces a CycloneDX 1.5 JSON document with full component inventory, dependency relationships, and VEX vulnerability data. PDF export runs entirely client-side via jsPDF and html2canvas, requiring no additional backend resources.

All infrastructure — S3 bucket, API Gateway, both Lambdas, DynamoDB table, IAM roles, and Cloudflare DNS record — is defined in Terraform and deployed in a single `terraform apply`.

## Tech Stack

**Frontend**: React 19, TypeScript, Tailwind CSS, D3.js, jsPDF, html2canvas
**Backend**: AWS Lambda (Python 3.12), API Gateway (HTTP API), DynamoDB
**Infrastructure**: Terraform, S3, Cloudflare DNS/SSL
**Design**: Dark glassmorphism, animated cinemagraph hero, JetBrains Mono + DM Sans typography

## Key Decisions

- **OSV batch API over individual queries**: The resolver sends all packages in a single batch request (up to 1,000 per call) rather than querying vulnerabilities one-by-one. For a tree with 140+ dependencies, this reduces OSV round-trips from ~140 to 1.

- **DynamoDB on-demand with TTL-based cache expiry**: Pay-per-request billing means the cache table costs effectively nothing at low traffic volumes. The 24-hour TTL ensures stale vulnerability data doesn't persist while keeping repeat analyses instant.

- **Client-side PDF generation**: Rather than adding a third Lambda with headless Chrome or a PDF library, the risk report renders via html2canvas and jsPDF entirely in the browser. This eliminates cold-start latency and keeps the backend minimal.

- **Depth limit and timeout budget**: Transitive resolution caps at depth 5 with a 50-second timeout budget, staying safely within Lambda's 60-second limit while preventing runaway resolution on deeply nested trees like those common in the npm ecosystem.

## Built By

**Jarvis** — AI build system designed by [Noah Frost](https://noahfrost.co.uk)

This project was produced through an automated end-to-end pipeline: brief, hero art, cinemagraph, build spec, deployed webapp. One shot. No manual intervention.

&rarr; System architect: [Noah Frost](https://noahfrost.co.uk)
&rarr; LinkedIn: [linkedin.com/in/nfroze](https://linkedin.com/in/nfroze)
&rarr; GitHub: [github.com/nfroze](https://github.com/nfroze)
