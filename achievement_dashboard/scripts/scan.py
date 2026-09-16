#!/usr/bin/env python3
"""Build public Developer Profiles from trusted KLIS-CS checkpoint evidence.

The script intentionally publishes achievements, not grades. Numeric checkpoint
scores are used only in memory to decide whether a checkpoint has produced the
required verified evidence. The generated public JSON contains XP, badges and
verified checkpoint names only.
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
SYSTEM = ROOT / "achievement_dashboard"
CONFIG = SYSTEM / "config"
DOCS = ROOT / "docs"


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


TOKEN = os.getenv("GH_SCANNER_TOKEN", "").strip() or os.getenv("GITHUB_TOKEN", "").strip()


def api_get(path: str, query: dict[str, Any] | None = None) -> Any:
    if query:
        path = f"{path}?{urllib.parse.urlencode(query)}"
    url = path if path.startswith("https://") else f"https://api.github.com{path}"
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "KLIS-CS-Developer-Achievement-Dashboard",
    }
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        return {"_error": exc.code, "_url": url}
    except urllib.error.URLError as exc:
        return {"_error": str(exc.reason), "_url": url}


def is_error(value: Any) -> bool:
    return isinstance(value, dict) and "_error" in value


def paged(path: str, query: dict[str, Any] | None = None, max_pages: int = 10) -> list[Any]:
    items: list[Any] = []
    base = dict(query or {})
    base.setdefault("per_page", 100)
    for page in range(1, max_pages + 1):
        q = dict(base)
        q["page"] = page
        data = api_get(path, q)
        if is_error(data) or not isinstance(data, list):
            break
        items.extend(data)
        if len(data) < int(base["per_page"]):
            break
        time.sleep(0.05)
    return items


def parse_score(text: str) -> dict[str, int | None]:
    """Parse score language used by the KLIS checkpoint graders."""
    auto_patterns = [
        r"Automatic score:\*\*?\s*(\d{1,3})\s*/\s*60",
        r"Automatic:\*\*?\s*(\d{1,3})\s*/\s*60",
        r"\*\*Automatic score:\*\*\s*(\d{1,3})\s*/\s*60",
        r"\*\*Automatic:\*\*\s*(\d{1,3})\s*/\s*60",
    ]
    final_patterns = [
        r"FINAL SCORE:\s*(\d{1,3})\s*/\s*100",
        r"Final score:\*\*?\s*(\d{1,3})\s*/\s*100",
        r"Current total:\*\*?\s*(\d{1,3})\s*/\s*100",
        r"\*\*Final score:\*\*\s*(\d{1,3})\s*/\s*100",
        r"\*\*Current total:\*\*\s*(\d{1,3})\s*/\s*100",
    ]

    def first(patterns: list[str]) -> int | None:
        for pattern in patterns:
            match = re.search(pattern, text, re.I)
            if match:
                return int(match.group(1))
        return None

    return {"automatic": first(auto_patterns), "final": first(final_patterns)}


def trusted_comment(comment: dict[str, Any], graders: set[str]) -> bool:
    user = comment.get("user") or {}
    login = str(user.get("login") or "").lower()
    user_type = str(user.get("type") or "")
    return user_type == "Bot" or login in graders or login.endswith("[bot]")


def best_score_from_issue(repo_full: str, issue: dict[str, Any], graders: set[str], marker: str | None = None) -> dict[str, int | None]:
    comments = paged(f"/repos/{repo_full}/issues/{issue['number']}/comments")
    candidates: list[tuple[str, dict[str, int | None]]] = []
    for comment in comments:
        if not isinstance(comment, dict) or not trusted_comment(comment, graders):
            continue
        body = str(comment.get("body") or "")
        if marker and marker not in body:
            continue
        parsed = parse_score(body)
        if parsed["automatic"] is not None or parsed["final"] is not None:
            candidates.append((str(comment.get("updated_at") or comment.get("created_at") or ""), parsed))
    if not candidates:
        return {"automatic": None, "final": None}
    candidates.sort(key=lambda item: item[0])
    return candidates[-1][1]


def scan_mother_checkpoint(org: str, checkpoint: dict[str, Any], graders: set[str]) -> dict[str, dict[str, int | None]]:
    repo_full = f"{org}/{checkpoint['mother_repo']}"
    issues = paged(f"/repos/{repo_full}/issues", {"state": "all"})
    results: dict[str, dict[str, int | None]] = {}
    for issue in issues:
        if not isinstance(issue, dict) or issue.get("pull_request"):
            continue
        student = str((issue.get("user") or {}).get("login") or "").lower()
        if not student or student in graders:
            continue
        score = best_score_from_issue(repo_full, issue, graders)
        if score["automatic"] is None and score["final"] is None:
            continue
        previous = results.get(student)
        # Prefer the latest / strongest evidence if a student submitted more than once.
        if previous is None or int(score["automatic"] or 0) >= int(previous["automatic"] or 0):
            results[student] = score
    return results


def scan_student_cp2(student: str, checkpoint: dict[str, Any], graders: set[str]) -> dict[str, int | None] | None:
    repo = checkpoint["repo_pattern"].replace("{github}", student)
    repo_full = f"{student}/{repo}"
    meta = api_get(f"/repos/{repo_full}")
    if is_error(meta):
        return None
    issues = paged(f"/repos/{repo_full}/issues", {"state": "all"})
    best: dict[str, int | None] | None = None
    for issue in issues:
        if not isinstance(issue, dict):
            continue
        score = best_score_from_issue(repo_full, issue, graders, checkpoint.get("marker"))
        if score["automatic"] is None and score["final"] is None:
            continue
        if best is None or int(score["automatic"] or 0) >= int(best["automatic"] or 0):
            best = score
    return best


def build_badges(skills: dict[str, int], definitions: dict[str, Any]) -> list[dict[str, Any]]:
    badges: list[dict[str, Any]] = []
    for key, definition in definitions.items():
        xp = int(skills.get(key, 0))
        for badge in definition.get("badges", []):
            if xp >= int(badge["xp"]):
                badges.append({
                    "skill": key,
                    "skill_label": definition["label"],
                    "name": badge["name"],
                    "threshold": int(badge["xp"]),
                })
    return badges


def main() -> int:
    config = read_json(CONFIG / "checkpoints.json")
    roster = read_json(CONFIG / "students.json")
    org = config["organization"]
    graders = {g.lower() for g in config.get("trusted_graders", [])}
    checkpoints = config["checkpoints"]
    skill_defs = config["skills"]

    roster_by_login: dict[str, dict[str, Any]] = {}
    for row in roster.get("students", []):
        login = str(row.get("github") or "").lower()
        if login:
            roster_by_login[login] = row

    evidence_by_cp: dict[str, dict[str, dict[str, int | None]]] = {}
    discovered: set[str] = set(roster_by_login)

    # Central mother-repository submissions are the trusted discovery channel.
    for cp in checkpoints:
        if cp.get("source") != "mother_issue":
            continue
        found = scan_mother_checkpoint(org, cp, graders)
        evidence_by_cp[cp["id"]] = found
        discovered.update(found)

    # CP2 currently grades inside each student's copied repository. Scan it for
    # students discovered elsewhere or explicitly listed in students.json.
    for cp in checkpoints:
        if cp.get("source") != "student_repo":
            continue
        evidence_by_cp.setdefault(cp["id"], {})
        for student in sorted(discovered):
            score = scan_student_cp2(student, cp, graders)
            if score:
                evidence_by_cp[cp["id"]][student] = score

    profiles: list[dict[str, Any]] = []
    for login in sorted(discovered):
        roster_row = roster_by_login.get(login, {})
        if roster_row.get("enabled") is False:
            continue
        skills = {key: 0 for key in skill_defs}
        verified: list[dict[str, str]] = []
        in_progress: list[dict[str, str]] = []

        for cp in checkpoints:
            score = evidence_by_cp.get(cp["id"], {}).get(login)
            if not score:
                continue
            automatic = int(score.get("automatic") or 0)
            if automatic >= 60:
                for skill, xp in cp.get("xp", {}).items():
                    if skill in skills:
                        skills[skill] += int(xp)
                verified.append({"id": cp["id"], "label": cp["label"]})
            elif automatic > 0:
                in_progress.append({"id": cp["id"], "label": cp["label"]})

        for skill, xp in (roster_row.get("manual_xp") or {}).items():
            if skill in skills:
                skills[skill] += int(xp)

        badges = build_badges(skills, skill_defs)
        profiles.append({
            "name": roster_row.get("name") or login,
            "github": login,
            "skills": skills,
            "total_xp": sum(skills.values()),
            "badges": badges,
            "verified_checkpoints": verified,
            "in_progress_checkpoints": in_progress,
        })

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "privacy_note": "Public profiles contain achievements only; checkpoint grades are not published by this dashboard.",
        "students": profiles,
    }

    DOCS.mkdir(parents=True, exist_ok=True)
    (DOCS / "data.json").write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (DOCS / "rules.json").write_text(json.dumps({"skills": skill_defs}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Generated {len(profiles)} public developer profile(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
