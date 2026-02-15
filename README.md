# Bastion

Dependency risk analyser that turns opaque dependency trees into visual, explorable risk maps.

Upload a package manifest (`package.json`, `requirements.txt`, `go.mod`, `pom.xml`, or `Cargo.toml`) and Bastion resolves the full dependency tree — including transitive dependencies — then cross-references every package against multiple risk signals: known CVEs (OSV), CISA KEV, maintenance status, download popularity, and licence risk.

## Live

[bastion.nfroze.co.uk](https://bastion.nfroze.co.uk)

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, D3.js, shadcn/ui
- **Backend:** AWS Lambda (Python 3.12), API Gateway, DynamoDB
- **Infrastructure:** Terraform, S3, Cloudflare
- **Exports:** CycloneDX SBOM, PDF risk report

## Features

- Interactive force-directed dependency graph colour-coded by risk level
- CVE detection via OSV database with CISA KEV cross-referencing
- Package maintenance and licence risk analysis
- CycloneDX 1.5 SBOM export
- PDF risk report generation
- 24-hour result caching via DynamoDB
