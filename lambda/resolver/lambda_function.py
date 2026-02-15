import json
import hashlib
import time
import os
import re
from datetime import datetime, timezone
from urllib.parse import quote

import boto3
import requests

TABLE_NAME = os.environ.get("TABLE_NAME", "bastion-dependency-cache")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "https://bastion.nfroze.co.uk",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}

MAX_DEPTH = 5
TIMEOUT_SECONDS = 50
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Bastion/1.0 (dependency-risk-analyser)"})

CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known-exploited-vulnerabilities.json"
OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"

LICENCE_RISK = {
    "MIT": "low", "Apache-2.0": "low", "BSD-2-Clause": "low", "BSD-3-Clause": "low",
    "ISC": "low", "Unlicense": "low", "CC0-1.0": "low", "0BSD": "low",
    "GPL-2.0": "high", "GPL-3.0": "high", "AGPL-3.0": "high", "GPL-2.0-only": "high",
    "GPL-3.0-only": "high", "AGPL-3.0-only": "high", "GPL-2.0-or-later": "high",
    "GPL-3.0-or-later": "high", "AGPL-3.0-or-later": "high",
    "LGPL-2.1": "medium", "LGPL-3.0": "medium", "MPL-2.0": "medium",
    "LGPL-2.1-only": "medium", "LGPL-3.0-only": "medium",
}


def lambda_handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body", "{}"))
        manifest = body.get("manifest", "")
        ecosystem = body.get("ecosystem", "").lower()

        if not manifest or ecosystem not in ("npm", "pypi", "go", "maven", "cargo"):
            return _error(400, "Missing or invalid manifest/ecosystem")

        manifest_hash = hashlib.sha256(manifest.encode()).hexdigest()

        # Check cache
        cached = _check_cache(manifest_hash)
        if cached:
            return _success(cached)

        start_time = time.time()

        # Parse direct dependencies
        direct_deps = _parse_manifest(manifest, ecosystem)
        if not direct_deps:
            return _error(400, "Could not parse any dependencies from manifest")

        # Resolve transitive dependencies
        all_packages = {}
        for name, version in direct_deps.items():
            if time.time() - start_time > TIMEOUT_SECONDS:
                break
            _resolve_recursive(name, version, ecosystem, all_packages, 0, start_time, is_direct=True)

        # Query OSV for vulnerabilities
        vulns_by_pkg = _query_osv_batch(all_packages, ecosystem)

        # Fetch CISA KEV
        kev_cves = _fetch_cisa_kev()

        # Build nodes
        nodes = []
        risk_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "none": 0, "unknown": 0}

        for key, pkg_info in all_packages.items():
            pkg_vulns = vulns_by_pkg.get(key, [])
            node = _build_node(pkg_info, pkg_vulns, kev_cves, ecosystem)
            nodes.append(node)
            risk_counts[node["riskLevel"]] = risk_counts.get(node["riskLevel"], 0) + 1

        # Find riskiest paths
        riskiest_paths = _find_riskiest_paths(nodes, all_packages)

        direct_count = sum(1 for n in nodes if n["isDirect"])
        result = {
            "ecosystem": ecosystem,
            "root": f"project@0.0.0",
            "totalDependencies": len(nodes),
            "directDependencies": direct_count,
            "transitiveDependencies": len(nodes) - direct_count,
            "riskSummary": {k: v for k, v in risk_counts.items() if k != "unknown"},
            "nodes": nodes,
            "riskiestPaths": riskiest_paths[:3],
        }

        _store_cache(manifest_hash, result)
        return _success(result)

    except Exception as e:
        return _error(500, f"Internal error: {str(e)}")


def _parse_manifest(manifest, ecosystem):
    """Parse a manifest file and return dict of {name: version}."""
    deps = {}
    if ecosystem == "npm":
        try:
            pkg = json.loads(manifest)
            raw = {}
            raw.update(pkg.get("dependencies", {}))
            raw.update(pkg.get("devDependencies", {}))
            for name, ver in raw.items():
                deps[name] = _clean_version(ver)
        except json.JSONDecodeError:
            pass

    elif ecosystem == "pypi":
        for line in manifest.strip().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("-"):
                continue
            match = re.match(r'^([a-zA-Z0-9._-]+)\s*(?:[><=!~]+\s*(.+?))?$', line)
            if match:
                name = match.group(1).lower().replace("_", "-")
                version = match.group(2).strip().rstrip(",") if match.group(2) else ""
                # Take first version from complex specifiers
                version = re.split(r'[,;]', version)[0].strip().lstrip("=").lstrip(">").lstrip("<").lstrip("~").lstrip("!")
                deps[name] = version

    elif ecosystem == "go":
        in_require = False
        for line in manifest.strip().splitlines():
            line = line.strip()
            if line.startswith("require ("):
                in_require = True
                continue
            if in_require and line == ")":
                in_require = False
                continue
            if in_require or line.startswith("require "):
                parts = line.replace("require ", "").strip().split()
                if len(parts) >= 2:
                    deps[parts[0]] = parts[1].lstrip("v")

    elif ecosystem == "maven":
        # Simple XML parsing for pom.xml dependencies
        dep_blocks = re.findall(r'<dependency>(.*?)</dependency>', manifest, re.DOTALL)
        for block in dep_blocks:
            gid = re.search(r'<groupId>(.*?)</groupId>', block)
            aid = re.search(r'<artifactId>(.*?)</artifactId>', block)
            ver = re.search(r'<version>(.*?)</version>', block)
            if gid and aid:
                name = f"{gid.group(1)}:{aid.group(1)}"
                deps[name] = ver.group(1) if ver else ""

    elif ecosystem == "cargo":
        in_deps = False
        for line in manifest.strip().splitlines():
            line = line.strip()
            if line == "[dependencies]" or line == "[dev-dependencies]":
                in_deps = True
                continue
            if line.startswith("[") and in_deps:
                in_deps = False
                continue
            if in_deps and "=" in line:
                parts = line.split("=", 1)
                name = parts[0].strip()
                ver_str = parts[1].strip().strip('"').strip("'")
                # Handle {version = "x.y"} form
                ver_match = re.search(r'version\s*=\s*["\']([^"\']+)', ver_str)
                if ver_match:
                    ver_str = ver_match.group(1)
                deps[name] = _clean_version(ver_str)

    return deps


def _clean_version(ver):
    """Strip semver range prefixes."""
    return re.sub(r'^[\^~>=<]*', '', ver).strip()


def _resolve_recursive(name, version, ecosystem, all_packages, depth, start_time, is_direct=False):
    """Recursively resolve dependencies up to MAX_DEPTH."""
    if time.time() - start_time > TIMEOUT_SECONDS:
        return
    if depth > MAX_DEPTH:
        return

    key = f"{name}@{version}" if version else name
    if key in all_packages:
        return

    pkg_info = {
        "name": name,
        "version": version or "latest",
        "depth": depth,
        "isDirect": is_direct,
        "dependsOn": [],
        "dependedOnBy": [],
        "metadata": {},
    }
    all_packages[key] = pkg_info

    try:
        sub_deps, metadata = _fetch_registry(name, version, ecosystem)
        pkg_info["metadata"] = metadata
        for sub_name, sub_ver in sub_deps.items():
            sub_key = f"{sub_name}@{sub_ver}" if sub_ver else sub_name
            pkg_info["dependsOn"].append(sub_key)
            _resolve_recursive(sub_name, sub_ver, ecosystem, all_packages, depth + 1, start_time)
            if sub_key in all_packages:
                all_packages[sub_key]["dependedOnBy"].append(key)
    except Exception:
        pkg_info["error"] = "Failed to resolve dependencies"


def _fetch_registry(name, version, ecosystem):
    """Fetch package info from registry. Returns (sub_deps, metadata)."""
    sub_deps = {}
    metadata = {}

    if ecosystem == "npm":
        # If no version, get latest
        if not version:
            url = f"https://registry.npmjs.org/{quote(name, safe='@')}/latest"
        else:
            url = f"https://registry.npmjs.org/{quote(name, safe='@')}/{version}"
        try:
            resp = SESSION.get(url, timeout=10)
            if resp.status_code == 404 and version:
                # Try getting latest instead
                resp = SESSION.get(f"https://registry.npmjs.org/{quote(name, safe='@')}/latest", timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                for dep_name, dep_ver in data.get("dependencies", {}).items():
                    sub_deps[dep_name] = _clean_version(dep_ver)
                metadata["licence"] = data.get("license", "")
                if isinstance(metadata["licence"], dict):
                    metadata["licence"] = metadata["licence"].get("type", "")
        except Exception:
            pass

        # Get package metadata for age/downloads
        try:
            pkg_resp = SESSION.get(f"https://registry.npmjs.org/{quote(name, safe='@')}", timeout=10)
            if pkg_resp.status_code == 200:
                pkg_data = pkg_resp.json()
                time_data = pkg_data.get("time", {})
                metadata["firstPublished"] = time_data.get("created", "")
                metadata["lastPublished"] = time_data.get("modified", "")
                if not metadata.get("licence"):
                    metadata["licence"] = pkg_data.get("license", "")
        except Exception:
            pass

        try:
            dl_resp = SESSION.get(f"https://api.npmjs.org/downloads/point/last-week/{quote(name, safe='@')}", timeout=5)
            if dl_resp.status_code == 200:
                metadata["weeklyDownloads"] = dl_resp.json().get("downloads", 0)
        except Exception:
            pass

    elif ecosystem == "pypi":
        url = f"https://pypi.org/pypi/{quote(name)}/json"
        if version:
            url = f"https://pypi.org/pypi/{quote(name)}/{version}/json"
        try:
            resp = SESSION.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                info = data.get("info", {})
                metadata["licence"] = info.get("license", "") or ""
                requires = info.get("requires_dist") or []
                for req in requires:
                    if "extra ==" in req:
                        continue
                    req_match = re.match(r'^([a-zA-Z0-9._-]+)', req)
                    if req_match:
                        dep_name = req_match.group(1).lower().replace("_", "-")
                        ver_match = re.search(r'[><=!~]+\s*([\d.]+)', req)
                        sub_deps[dep_name] = ver_match.group(1) if ver_match else ""
                # Metadata
                releases = data.get("releases", {})
                if releases:
                    versions = sorted(releases.keys())
                    for v in versions:
                        if releases[v]:
                            metadata["firstPublished"] = releases[v][0].get("upload_time", "")[:10]
                            break
                    for v in reversed(versions):
                        if releases[v]:
                            metadata["lastPublished"] = releases[v][0].get("upload_time", "")[:10]
                            break
        except Exception:
            pass

    elif ecosystem == "go":
        encoded = name.replace("/", "/").replace(".", ".")
        # For go, we just get the mod file
        if version:
            url = f"https://proxy.golang.org/{encoded}/@v/v{version}.mod"
        else:
            url = f"https://proxy.golang.org/{encoded}/@latest"
        try:
            resp = SESSION.get(url, timeout=10)
            if resp.status_code == 200:
                content = resp.text
                in_require = False
                for line in content.splitlines():
                    line = line.strip()
                    if line.startswith("require ("):
                        in_require = True
                        continue
                    if in_require and line == ")":
                        in_require = False
                        continue
                    if in_require or line.startswith("require "):
                        parts = line.replace("require ", "").strip().split()
                        if len(parts) >= 2 and not parts[0].startswith("//"):
                            sub_deps[parts[0]] = parts[1].lstrip("v")
                metadata["licence"] = "BSD-3-Clause"  # Common Go default
        except Exception:
            pass

    elif ecosystem == "cargo":
        url = f"https://crates.io/api/v1/crates/{quote(name)}"
        if version:
            deps_url = f"https://crates.io/api/v1/crates/{quote(name)}/{version}/dependencies"
        else:
            deps_url = None
        try:
            resp = SESSION.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                crate = data.get("crate", {})
                metadata["firstPublished"] = crate.get("created_at", "")[:10]
                metadata["lastPublished"] = crate.get("updated_at", "")[:10]
                metadata["weeklyDownloads"] = crate.get("recent_downloads", 0)
                if not version:
                    version = crate.get("newest_version", "")

            if not deps_url and version:
                deps_url = f"https://crates.io/api/v1/crates/{quote(name)}/{version}/dependencies"
            if deps_url:
                deps_resp = SESSION.get(deps_url, timeout=10)
                if deps_resp.status_code == 200:
                    deps_data = deps_resp.json()
                    for dep in deps_data.get("dependencies", []):
                        if dep.get("kind") == "normal":
                            sub_deps[dep["crate_id"]] = _clean_version(dep.get("req", ""))
        except Exception:
            pass

    elif ecosystem == "maven":
        # Maven Central search
        parts = name.split(":")
        if len(parts) == 2:
            gid, aid = parts
            try:
                search_url = f"https://search.maven.org/solrsearch/select?q=g:{gid}+AND+a:{aid}&rows=1&wt=json"
                resp = SESSION.get(search_url, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    docs = data.get("response", {}).get("docs", [])
                    if docs:
                        doc = docs[0]
                        metadata["lastPublished"] = str(doc.get("timestamp", ""))[:10]
                        if not version:
                            version = doc.get("latestVersion", "")
            except Exception:
                pass

    return sub_deps, metadata


def _query_osv_batch(all_packages, ecosystem):
    """Query OSV API for vulnerabilities across all packages."""
    vulns_by_pkg = {}
    ecosystem_map = {
        "npm": "npm", "pypi": "PyPI", "go": "Go", "maven": "Maven", "cargo": "crates.io"
    }
    osv_ecosystem = ecosystem_map.get(ecosystem, ecosystem)

    queries = []
    keys = list(all_packages.keys())

    for key in keys:
        pkg = all_packages[key]
        q = {"package": {"name": pkg["name"], "ecosystem": osv_ecosystem}}
        if pkg["version"] and pkg["version"] != "latest":
            q["version"] = pkg["version"]
        queries.append(q)

    # OSV batch endpoint (max 1000 per batch)
    for i in range(0, len(queries), 1000):
        batch = queries[i:i+1000]
        batch_keys = keys[i:i+1000]
        try:
            resp = SESSION.post(OSV_BATCH_URL, json={"queries": batch}, timeout=30)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                for j, result in enumerate(results):
                    if j < len(batch_keys):
                        vulns = result.get("vulns", [])
                        if vulns:
                            vulns_by_pkg[batch_keys[j]] = vulns
        except Exception:
            pass

    return vulns_by_pkg


def _fetch_cisa_kev():
    """Fetch CISA KEV and return set of CVE IDs."""
    try:
        resp = SESSION.get(CISA_KEV_URL, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            return {v.get("cveID") for v in data.get("vulnerabilities", [])}
    except Exception:
        pass
    return set()


def _build_node(pkg_info, osv_vulns, kev_cves, ecosystem):
    """Build a response node from package info and vulnerability data."""
    vulns = []
    max_cvss = 0
    has_kev = False

    for v in osv_vulns:
        vuln_id = v.get("id", "")
        summary = v.get("summary", v.get("details", "")[:200])
        severity = "UNKNOWN"
        cvss = 0

        # Extract CVSS from severity
        for s in v.get("severity", []):
            score_str = s.get("score", "")
            if "CVSS" in s.get("type", ""):
                # Try to extract numeric score from vector
                try:
                    parts = score_str.split("/")
                    for part in parts:
                        if part.replace(".", "").replace("-", "").isdigit():
                            cvss = float(part)
                            break
                except (ValueError, IndexError):
                    pass

        # Check database_specific for severity
        db_specific = v.get("database_specific", {})
        if db_specific.get("severity"):
            severity = db_specific["severity"].upper()
        elif cvss >= 9.0:
            severity = "CRITICAL"
        elif cvss >= 7.0:
            severity = "HIGH"
        elif cvss >= 4.0:
            severity = "MEDIUM"
        elif cvss > 0:
            severity = "LOW"

        max_cvss = max(max_cvss, cvss)

        # Check CISA KEV
        aliases = v.get("aliases", [])
        cve_ids = [a for a in aliases if a.startswith("CVE-")]
        is_kev = any(cve_id in kev_cves for cve_id in cve_ids)
        if is_kev:
            has_kev = True

        # Find fixed version
        fixed_in = ""
        for affected in v.get("affected", []):
            for r in affected.get("ranges", []):
                for ev in r.get("events", []):
                    if "fixed" in ev:
                        fixed_in = ev["fixed"]

        vulns.append({
            "id": vuln_id,
            "summary": summary[:300],
            "severity": severity,
            "cvss": cvss,
            "fixedIn": fixed_in,
            "cisaKev": is_kev,
        })

    # Compute risk score (0-100)
    risk_score = 0

    # CVEs/severity: 0-40 pts
    if vulns:
        severity_scores = {"CRITICAL": 40, "HIGH": 30, "MEDIUM": 15, "LOW": 5, "UNKNOWN": 10}
        max_sev_score = max(severity_scores.get(v["severity"], 5) for v in vulns)
        risk_score += min(40, max_sev_score + len(vulns) * 2)

    # CISA KEV: 0-25 pts
    if has_kev:
        risk_score += 25

    # Package age: 0-10 pts (newer = riskier)
    first_pub = pkg_info["metadata"].get("firstPublished", "")
    if first_pub:
        try:
            pub_date = datetime.fromisoformat(first_pub.replace("Z", "+00:00"))
            age_days = (datetime.now(timezone.utc) - pub_date).days
            if age_days < 90:
                risk_score += 10
            elif age_days < 365:
                risk_score += 5
        except (ValueError, TypeError):
            pass

    # Maintenance: 0-10 pts (stale = riskier)
    last_pub = pkg_info["metadata"].get("lastPublished", "")
    if last_pub:
        try:
            last_date = datetime.fromisoformat(last_pub.replace("Z", "+00:00"))
            stale_days = (datetime.now(timezone.utc) - last_date).days
            if stale_days > 730:
                risk_score += 10
            elif stale_days > 365:
                risk_score += 5
        except (ValueError, TypeError):
            pass

    # Download popularity: 0-5 pts (low downloads = riskier)
    downloads = pkg_info["metadata"].get("weeklyDownloads", 0)
    if downloads == 0:
        risk_score += 5
    elif downloads < 1000:
        risk_score += 3

    # Licence risk: 0-10 pts
    licence_spdx = _normalize_licence(pkg_info["metadata"].get("licence", ""))
    licence_risk_level = LICENCE_RISK.get(licence_spdx, "medium" if licence_spdx else "unknown")
    if licence_risk_level == "high":
        risk_score += 10
    elif licence_risk_level == "medium":
        risk_score += 5
    elif licence_risk_level == "unknown":
        risk_score += 3

    # Determine risk level
    if risk_score >= 70 or has_kev:
        risk_level = "critical"
    elif risk_score >= 50:
        risk_level = "high"
    elif risk_score >= 30:
        risk_level = "medium"
    elif risk_score >= 10:
        risk_level = "low"
    elif vulns:
        risk_level = "low"
    else:
        risk_level = "none"

    if pkg_info.get("error"):
        risk_level = "unknown"

    # Maintenance status
    release_freq = "unknown"
    if last_pub and first_pub:
        try:
            f = datetime.fromisoformat(first_pub.replace("Z", "+00:00"))
            l = datetime.fromisoformat(last_pub.replace("Z", "+00:00"))
            span = (l - f).days
            if span < 30:
                release_freq = "new"
            elif span < 365:
                release_freq = "active"
            else:
                stale = (datetime.now(timezone.utc) - l).days
                release_freq = "low" if stale > 365 else "moderate"
        except (ValueError, TypeError):
            pass

    return {
        "name": pkg_info["name"],
        "version": pkg_info["version"],
        "ecosystem": ecosystem,
        "depth": pkg_info["depth"],
        "isDirect": pkg_info["isDirect"],
        "riskLevel": risk_level,
        "riskScore": min(100, risk_score),
        "vulnerabilities": vulns,
        "maintenance": {
            "lastPublished": last_pub[:10] if last_pub else "",
            "firstPublished": first_pub[:10] if first_pub else "",
            "weeklyDownloads": downloads,
            "releaseFrequency": release_freq,
        },
        "licence": {
            "spdx": licence_spdx,
            "risk": licence_risk_level,
        },
        "dependsOn": pkg_info["dependsOn"],
        "dependedOnBy": pkg_info["dependedOnBy"],
    }


def _normalize_licence(licence_str):
    """Normalize a licence string to SPDX identifier."""
    if not licence_str:
        return ""
    licence_str = licence_str.strip()
    # Common mappings
    mappings = {
        "MIT": "MIT", "ISC": "ISC", "BSD": "BSD-3-Clause",
        "Apache 2.0": "Apache-2.0", "Apache-2.0": "Apache-2.0",
        "BSD-2-Clause": "BSD-2-Clause", "BSD-3-Clause": "BSD-3-Clause",
        "GPL-2.0": "GPL-2.0", "GPL-3.0": "GPL-3.0",
        "LGPL-2.1": "LGPL-2.1", "LGPL-3.0": "LGPL-3.0",
        "MPL-2.0": "MPL-2.0", "Unlicense": "Unlicense",
        "AGPL-3.0": "AGPL-3.0",
    }
    for key, val in mappings.items():
        if key.lower() in licence_str.lower():
            return val
    # If it looks like a known SPDX, return as-is
    if re.match(r'^[A-Za-z0-9._-]+$', licence_str) and len(licence_str) < 30:
        return licence_str
    return licence_str[:30]


def _find_riskiest_paths(nodes, all_packages):
    """Find the top 3 riskiest dependency paths."""
    node_by_key = {}
    for n in nodes:
        key = f"{n['name']}@{n['version']}"
        node_by_key[key] = n

    paths = []
    for node in nodes:
        if node["isDirect"] and node["riskScore"] > 0:
            path = [f"{node['name']}@{node['version']}"]
            _dfs_riskiest(node, node_by_key, path, paths, set())

    paths.sort(key=lambda p: p["maxRiskScore"], reverse=True)
    return paths[:3]


def _dfs_riskiest(node, node_by_key, current_path, results, visited):
    """DFS to find riskiest paths."""
    key = f"{node['name']}@{node['version']}"
    if key in visited:
        return
    visited.add(key)

    if not node["dependsOn"] or len(current_path) > MAX_DEPTH:
        if node["riskScore"] > 20:
            reason = ""
            if node["vulnerabilities"]:
                has_kev = any(v["cisaKev"] for v in node["vulnerabilities"])
                if has_kev:
                    reason = "CVE with CISA KEV listing"
                else:
                    reason = f"{len(node['vulnerabilities'])} known vulnerabilities"
            results.append({
                "path": ["project@0.0.0"] + current_path,
                "maxRiskScore": max(
                    node_by_key.get(p, {}).get("riskScore", 0)
                    for p in current_path
                ),
                "reason": reason or "Elevated risk score",
            })
        return

    for dep_key in node["dependsOn"]:
        dep_node = node_by_key.get(dep_key)
        if dep_node:
            _dfs_riskiest(dep_node, node_by_key, current_path + [dep_key], results, visited.copy())


def _check_cache(manifest_hash):
    """Check DynamoDB for cached result."""
    try:
        resp = table.get_item(Key={"manifestHash": manifest_hash})
        item = resp.get("Item")
        if item and item.get("expiresAt", 0) > int(time.time()):
            return json.loads(item["result"])
    except Exception:
        pass
    return None


def _store_cache(manifest_hash, result):
    """Store result in DynamoDB with 24h TTL."""
    try:
        table.put_item(Item={
            "manifestHash": manifest_hash,
            "result": json.dumps(result),
            "expiresAt": int(time.time()) + 86400,
        })
    except Exception:
        pass


def _success(data):
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps(data)}


def _error(code, message):
    return {"statusCode": code, "headers": CORS_HEADERS, "body": json.dumps({"error": message})}
