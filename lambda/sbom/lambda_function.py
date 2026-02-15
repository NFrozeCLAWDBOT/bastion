import json
import uuid
from datetime import datetime, timezone

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "https://bastion.nfroze.co.uk",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}

ECOSYSTEM_PURL_MAP = {
    "npm": "npm",
    "pypi": "pypi",
    "go": "golang",
    "maven": "maven",
    "cargo": "cargo",
}


def lambda_handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body", "{}"))
        nodes = body.get("nodes", [])
        ecosystem = body.get("ecosystem", "npm")

        if not nodes:
            return _error(400, "No dependency data provided")

        sbom = _generate_cyclonedx(nodes, ecosystem, body)
        return _success(sbom)

    except Exception as e:
        return _error(500, f"SBOM generation failed: {str(e)}")


def _generate_cyclonedx(nodes, ecosystem, analysis):
    """Generate CycloneDX 1.5 JSON SBOM."""
    purl_type = ECOSYSTEM_PURL_MAP.get(ecosystem, "generic")
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    serial = f"urn:uuid:{uuid.uuid4()}"

    components = []
    dependencies = []
    vulnerabilities = []

    for node in nodes:
        name = node.get("name", "")
        version = node.get("version", "")

        # Build purl
        if ecosystem == "maven" and ":" in name:
            group, artifact = name.split(":", 1)
            purl = f"pkg:{purl_type}/{group}/{artifact}@{version}"
        elif ecosystem == "go":
            purl = f"pkg:{purl_type}/{name}@{version}"
        else:
            purl = f"pkg:{purl_type}/{name}@{version}"

        component = {
            "type": "library",
            "name": name,
            "version": version,
            "purl": purl,
            "bom-ref": f"{name}@{version}",
        }

        # Add licence
        licence_spdx = node.get("licence", {}).get("spdx", "")
        if licence_spdx:
            component["licenses"] = [{"license": {"id": licence_spdx}}]

        components.append(component)

        # Dependencies
        dep_entry = {
            "ref": f"{name}@{version}",
            "dependsOn": node.get("dependsOn", []),
        }
        dependencies.append(dep_entry)

        # Vulnerabilities (VEX)
        for vuln in node.get("vulnerabilities", []):
            vuln_entry = {
                "id": vuln.get("id", ""),
                "source": {"name": "OSV", "url": "https://osv.dev"},
                "ratings": [],
                "description": vuln.get("summary", ""),
                "affects": [
                    {
                        "ref": f"{name}@{version}",
                        "versions": [{"version": version}] if version else [],
                    }
                ],
                "analysis": {
                    "state": "exploitable" if vuln.get("cisaKev") else "in_triage",
                },
            }

            if vuln.get("cvss", 0) > 0:
                vuln_entry["ratings"].append({
                    "score": vuln["cvss"],
                    "severity": vuln.get("severity", "unknown").lower(),
                    "method": "CVSSv3",
                })

            if vuln.get("fixedIn"):
                vuln_entry["recommendation"] = f"Upgrade to {vuln['fixedIn']}"

            vulnerabilities.append(vuln_entry)

    sbom = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": serial,
        "version": 1,
        "metadata": {
            "timestamp": now,
            "tools": {
                "components": [
                    {
                        "type": "application",
                        "name": "Bastion",
                        "version": "1.0.0",
                        "description": "Dependency risk analyser",
                    }
                ]
            },
            "component": {
                "type": "application",
                "name": analysis.get("root", "project@0.0.0").split("@")[0],
                "version": analysis.get("root", "project@0.0.0").split("@")[-1],
                "bom-ref": analysis.get("root", "project@0.0.0"),
            },
        },
        "components": components,
        "dependencies": dependencies,
        "vulnerabilities": vulnerabilities,
    }

    return sbom


def _success(data):
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps(data)}


def _error(code, message):
    return {"statusCode": code, "headers": CORS_HEADERS, "body": json.dumps({"error": message})}
