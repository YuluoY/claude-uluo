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

def validate(skill_dir: str, persona_profile: Optional[str] = None, fidelity: bool = False) -> dict:
    """Validate a generated skill directory.

    Args:
        skill_dir: Path to the generated skill directory
        persona_profile: Optional path to source persona-profile.json for fidelity check
        fidelity: Enable comprehensive fidelity scoring (5 dimensions, 100 points)

    Returns:
        Validation report dict with checks, score, and recommendations
    """
    skill = Path(skill_dir)
    report = {
        "skill_dir": str(skill),
        "timestamp": _now(),
        "checks": [],
        "fidelity_score": 0,
        "fidelity_details": {},
        "score": 0,
        "max_score": 0,
        "passed": 0,
        "failed": 0,
        "_fidelity_mode": fidelity,
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

    # ---- Fidelity checks (if --fidelity flag enabled) ----
    if report.get("_fidelity_mode") and persona_profile:
        try:
            profile = json.loads(Path(persona_profile).read_text(encoding="utf-8"))
            _fidelity_basic(report, profile, content, skill)
        except Exception as e:
            report["warnings"].append(f"Fidelity check failed: {e}")

    # ---- Summary ----
    report["score"] = report["passed"] / max(report["max_score"], 1)
    _print_report(report)
    return report


# ---------------------------------------------------------------------------
# Fidelity scoring
# ---------------------------------------------------------------------------

def _fidelity_basic(report: dict, profile: dict, skill_content: str, skill_dir: Path):
    """Two-tier fidelity scoring: Surface (measurable markers) + Deep (adversarial quality).

    Surface Fidelity (50 pts): quantifiable style metrics
    Deep Fidelity (50 pts): qualitative structural authenticity
    Total: 100 pts
    """
    surface = {}
    deep = {}
    total = 0

    # === SURFACE FIDELITY (50 pts) ===

    # 1. Sentence/line length adherence (10 pts)
    dimensions = profile.get("style", {}).get("dimensions", {})
    engine = dimensions.get("engine", "unknown")
    if engine == "textacy":
        n_words = dimensions.get("n_words", 0)
        n_sentences = dimensions.get("n_sentences", 1)
        avg_len = n_words / max(n_sentences, 1)
        surface["sentence_length"] = {"score": 10 if 10 <= avg_len <= 35 else 5, "max": 10,
                                        "detail": f"avg {avg_len:.1f} words/sentence"}
    else:
        surface["sentence_length"] = {"score": 5, "max": 10, "detail": f"engine={engine}, length not measured"}

    # 2. Lexical diversity (TTR) (10 pts)
    diversity = dimensions.get("diversity", {})
    ttr = diversity.get("ttr", 0)
    surface["lexical_diversity"] = {"score": 10 if 0.3 <= ttr <= 0.8 else 5, "max": 10,
                                     "detail": f"TTR={ttr:.3f}"}

    # 3. Gotcha coverage ratio (10 pts)
    profile_gotchas = len(profile.get("gotchas", []))
    skill_gotchas = skill_content.count("\n### ")
    ratio = min(skill_gotchas / max(profile_gotchas, 1), 1.0)
    surface["gotcha_coverage"] = {"score": round(ratio * 10), "max": 10,
                                   "detail": f"{skill_gotchas}/{profile_gotchas}"}

    # 4. Reference quality (10 pts)
    refs_dir = skill_dir / "references"
    ref_size = sum(len(ref.read_text()) for ref in refs_dir.glob("*.md")) if refs_dir.exists() else 0
    surface["reference_quality"] = {"score": 10 if ref_size > 500 else 5 if ref_size > 100 else 2, "max": 10,
                                     "detail": f"{ref_size} chars"}

    # 5. Expertise mapping (10 pts)
    profile_domains = [d["domain"] for d in profile.get("expertise", [])]
    found = sum(1 for d in profile_domains if d.lower() in skill_content.lower())
    dm_ratio = found / max(len(profile_domains), 1)
    surface["expertise_mapping"] = {"score": round(dm_ratio * 10), "max": 10,
                                     "detail": f"{found}/{len(profile_domains)}"}

    # === DEEP FIDELITY (50 pts) ===

    # 6. Named identity vs generic types (10 pts)
    has_named = bool(re.search(r'[A-Z一-鿿]{1,4}\s*[A-Z一-鿿]{1,4}', skill_content[:500]))
    has_generic = bool(re.search(r'(?:people|developers|users|他们|人们|后生们)', skill_content[:500]))
    deep["named_identity"] = {"score": 10 if has_named and not has_generic else 5 if has_named else 2, "max": 10,
                               "detail": f"named={'yes' if has_named else 'no'}, generic={'yes' if has_generic else 'no'}"}

    # 7. Context anchoring (10 pts) — historical/social references
    context_markers = re.findall(r'(?:\d{4}年|[A-Z][a-z]+\s\d{4}|in\s\d{4}|during|copyright)', skill_content[:500])
    deep["context_anchoring"] = {"score": min(len(context_markers) * 3, 10), "max": 10,
                                  "detail": f"{len(context_markers)} markers"}

    # 8. Voice consistency (10 pts) — not randomly switching between styles
    voice_switches = len(re.findall(
        r'(?:however|nevertheless|on the other hand|in contrast|meanwhile|conversely|furthermore|additionally)',
        skill_content[:1000].lower()
    ))
    deep["voice_consistency"] = {"score": 10 if voice_switches < 10 else 5, "max": 10,
                                  "detail": f"{voice_switches} switch markers"}

    # 9. Emotional range match (10 pts) — does it reflect the target's emotional polarity?
    emotional = len(re.findall(r'(?:![!]*|[?!]{2,})', skill_content[:500]))
    deep["emotional_range"] = {"score": 10 if emotional >= 2 else 5 if emotional >= 1 else 2, "max": 10,
                                "detail": f"{emotional} exclamatory marks"}

    # 10. Avoidance of wrong techniques (10 pts) — what this person would NEVER use
    irony_markers = re.findall(r'(?:ironically|sarcastically|tongue.in.cheek|wink|nudge|meta|meta.fiction)', skill_content[:500].lower())
    deep["avoidance"] = {"score": 10 if len(irony_markers) == 0 else 3, "max": 10,
                          "detail": f"{len(irony_markers)} irony markers (fewer=better)"}

    surface_total = sum(d["score"] for d in surface.values())
    deep_total = sum(d["score"] for d in deep.values())
    total = surface_total + deep_total

    report["fidelity_score"] = total
    report["fidelity_surface"] = {"score": surface_total, "max": 50, "details": surface}
    report["fidelity_deep"] = {"score": deep_total, "max": 50, "details": deep}
    report["fidelity_details"] = {"surface": surface, "deep": deep}
    report["checks"].append({"label": f"Fidelity: {total}/100 (S:{surface_total}/50 D:{deep_total}/50)",
                              "passed": total >= 60, "status": "FIDELITY"})
    if total < 60:
        report["recommendations"].append(f"Fidelity {total}/100 below 60. Deeper capture needed.")


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
    parser.add_argument("--fidelity", action="store_true",
                        help="Enable comprehensive 5-dimension fidelity scoring (100 points)")
    args = parser.parse_args()

    report = validate(args.skill_dir, args.persona_profile, fidelity=args.fidelity)
    sys.exit(0 if report["failed"] == 0 else 1)
