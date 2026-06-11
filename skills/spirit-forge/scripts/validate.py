#!/usr/bin/env python3
"""
Spirit Forge — Phase 4: Validate (验)

Validate a generated persona skill for structural correctness and
quality. Checks frontmatter, gotcha count, file structure, and
optionally compares against the source persona profile.

Usage:
    python validate.py <generated-skill-dir> [--persona-profile <json>]
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

# Allow running from skill root or scripts/ directory
_skill_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_skill_root))


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate(skill_dir: str, persona_profile: Optional[str] = None) -> dict:
    """Validate a generated skill directory.

    Args:
        skill_dir: Path to the generated skill directory
        persona_profile: Optional path to source persona-profile.json for fidelity check

    Returns:
        Validation report dict with checks, score, and recommendations
    """
    skill = Path(skill_dir)
    report = {
        "skill_dir": str(skill),
        "timestamp": _now(),
        "checks": [],
        "score": 0,
        "max_score": 0,
        "passed": 0,
        "failed": 0,
        "warnings": [],
        "recommendations": [],
    }

    _print_header("Phase 4: Validate (验)")

    # ---- Check 1: SKILL.md exists ----
    _check(report, skill, "SKILL.md exists",
           skill.joinpath("SKILL.md").exists(),
           "Create a SKILL.md file at the skill root")

    skill_md_path = skill / "SKILL.md"
    if not skill_md_path.exists():
        _print_report(report)
        return report

    content = skill_md_path.read_text(encoding="utf-8")

    # ---- Check 2: Valid frontmatter ----
    has_frontmatter = content.startswith("---")
    _check(report, skill, "YAML frontmatter present",
           has_frontmatter, "Add --- delimited YAML frontmatter")

    if has_frontmatter:
        parts = content.split("---", 2)
        fm_text = parts[1] if len(parts) >= 2 else ""

        has_name = "name:" in fm_text
        _check(report, skill, "Frontmatter has 'name' field",
               has_name, "Add 'name: <skill-name>' to frontmatter")

        has_desc = "description:" in fm_text
        _check(report, skill, "Frontmatter has 'description' field",
               has_desc, "Add 'description: >- ...' to frontmatter")

        # Description should be non-trivial (not just a one-liner)
        # Handle YAML fold scalars (">"," >-") correctly
        desc_start = fm_text.find("description:")
        if desc_start >= 0:
            desc_text = fm_text[desc_start:]
            # Check if this is a fold scalar (>-)
            desc_line = desc_text.split("\n", 1)[0] if "\n" in desc_text else desc_text
            if ">-" in desc_line or "> " in desc_line:
                # Fold scalar: read subsequent indented lines
                remaining = desc_text.split("\n", 1)[1] if "\n" in desc_text else ""
                desc_full = " ".join(line.strip() for line in remaining.split("\n") if line.strip() and not line.startswith("---"))
                desc_long_enough = len(desc_full) > 30
            else:
                desc_long_enough = len(desc_line) > 30
            _check(report, skill, "Description is substantive (>30 chars)",
                   desc_long_enough, "Write a longer description with trigger keywords")

    # ---- Check 3: Gotchas section is substantial ----
    has_gotchas = "## Gotchas" in content or "## Gotchas & Anti-Patterns" in content
    _check(report, skill, "Gotchas section exists",
           has_gotchas, "Add a '## Gotchas & Anti-Patterns' section")

    if has_gotchas:
        # Count gotcha items (### N. headings)
        gotcha_count = content.count("\n### ")
        gotcha_sufficient = gotcha_count >= 5
        _check(report, skill, f"≥5 gotchas (found {gotcha_count})",
               gotcha_sufficient, "Add more gotchas — this is the highest-signal content")

    # ---- Check 4: SKILL.md line count ----
    line_count = content.count("\n") + 1
    lines_ok = line_count < 500
    _check(report, skill, f"SKILL.md under 500 lines (current: {line_count})",
           lines_ok, "Trim SKILL.md; move detailed content to references/")

    # ---- Check 5: References directory ----
    refs_dir = skill / "references"
    if refs_dir.exists():
        ref_count = len(list(refs_dir.glob("*.md")))
        refs_ok = ref_count >= 2
        _check(report, skill, f"≥2 reference files (found {ref_count})",
               refs_ok, "Add more reference files for progressive disclosure")
    else:
        _check(report, skill, "references/ directory exists",
               False, "Create references/ with domain-knowledge.md and communication-guide.md")

    # ---- Check 6: Directory structure compliance ----
    plugin_json = skill / ".claude-plugin" / "plugin.json"
    _check(report, skill, ".claude-plugin/plugin.json exists",
           plugin_json.exists(), "Add .claude-plugin/plugin.json wrapper")

    # ---- Check 7: Fidelity vs profile (optional) ----
    if persona_profile:
        try:
            profile = json.loads(Path(persona_profile).read_text(encoding="utf-8"))
            profile_gotchas = len(profile.get("gotchas", []))
            skill_gotchas = content.count("\n### ")
            fidelity_ok = skill_gotchas >= profile_gotchas * 0.5
            _check(report, skill,
                   f"Gotcha fidelity: profile has {profile_gotchas}, skill has {skill_gotchas}",
                   fidelity_ok, "Generated skill doesn't capture enough gotchas from the profile")
        except Exception:
            report["warnings"].append("Could not load persona profile for fidelity check")

    # ---- Summary ----
    report["score"] = report["passed"] / max(report["max_score"], 1)
    _print_report(report)
    return report


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check(report: dict, skill: Path, label: str, passed: bool, recommendation: str):
    report["max_score"] += 1
    status = "PASS" if passed else "FAIL"
    icon = "✓" if passed else "✗"
    report["checks"].append({"label": label, "passed": passed, "status": status})
    if passed:
        report["passed"] += 1
        print(f"  {icon} {label}")
    else:
        report["failed"] += 1
        report["recommendations"].append(recommendation)
        print(f"  {icon} {label} → {recommendation}")


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _print_header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def _print_report(report: dict):
    print(f"\n{'='*60}")
    print(f"  Validation Report")
    print(f"{'='*60}")
    print(f"  Passed: {report['passed']}/{report['max_score']}")
    print(f"  Score: {report['score']:.0%}")
    if report["recommendations"]:
        print(f"\n  Recommendations:")
        for r in report["recommendations"]:
            print(f"  - {r}")
    if report["warnings"]:
        print(f"\n  Warnings:")
        for w in report["warnings"]:
            print(f"  - {w}")
    print(f"{'='*60}\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Spirit Forge — Validate (验): Quality check generated skills"
    )
    parser.add_argument("skill_dir", help="Path to generated skill directory")
    parser.add_argument("--persona-profile", default=None,
                        help="Path to source persona-profile.json for fidelity check")
    args = parser.parse_args()

    report = validate(args.skill_dir, args.persona_profile)
    sys.exit(0 if report["failed"] == 0 else 1)
