#!/usr/bin/env python3
"""
Spirit Forge — Phase 2: Distill (炼)

Extract structured patterns from raw persona research. Reads the
raw-research directory and produces a persona-profile.json with
expertise domains, decision heuristics, communication style markers,
gotchas, tool preferences, and reference canon.

Usage:
    python distill.py <raw-research-dir> [--output persona-profile.json]
"""

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Optional

# Allow running from skill root or scripts/ directory
_skill_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_skill_root))


# ---------------------------------------------------------------------------
# Schema (also defined in examples/persona-profile.schema.json)
# ---------------------------------------------------------------------------

PROFILE_SCHEMA = {
    "persona_name": "",
    "timestamp": "",
    "sources_processed": [],
    "expertise": [],        # [{"domain": str, "level": "expert"|"proficient"|"familiar", "evidence": [str]}]
    "heuristics": [],       # [{"when": str, "then": str, "because": str, "source": str}]
    "style": {              # Communication style markers
        "formality": 5,     # 1-10
        "phrases": [],      # Signature phrases
        "patterns": [],     # Sentence patterns
        "explanation_style": "",  # analogy-driven | first-principles | example-first
    },
    "tools": [],            # [{"name": str, "usage": str, "source": str}]
    "gotchas": [],          # [{"pattern": str, "fix": str, "source": str}]
    "canon": [],            # [{"title": str, "type": "paper"|"book"|"talk"|"repo", "cited_in": [str]}]
    "contradictions": [],   # [{"stated": str, "observed": str, "source": str}]
    "confidence": {
        "expertise": "medium",
        "heuristics": "medium",
        "style": "medium",
        "gotchas": "medium",
    },
}


# ---------------------------------------------------------------------------
# Main distill function
# ---------------------------------------------------------------------------

def distill(raw_research_dir: str, output_path: Optional[str] = None) -> dict:
    """Extract structured persona profile from raw research.

    Args:
        raw_research_dir: Path to directory containing raw-research/*.md and *.json files
        output_path: Where to write persona-profile.json

    Returns:
        Populated persona profile dict
    """
    research = Path(raw_research_dir)
    if not research.exists():
        raise FileNotFoundError(f"Research directory not found: {raw_research_dir}")

    _print_header("Phase 2: Distill (炼)")

    profile = dict(PROFILE_SCHEMA)  # Deep copy
    profile["timestamp"] = _now()

    # Load meta
    meta = _load_json(research / "meta.json")
    if meta:
        profile["persona_name"] = meta.get("target_raw", "unknown")
        profile["sources_processed"] = meta.get("files_written", [])

    # Read all markdown research files
    research_texts = {}
    for md_file in research.glob("*.md"):
        research_texts[md_file.stem] = md_file.read_text(encoding="utf-8")
    for json_file in research.glob("*.json"):
        if json_file.stem == "meta":
            continue
        try:
            data = _load_json(json_file)
            if isinstance(data, str):
                research_texts[json_file.stem] = data
            elif isinstance(data, dict):
                research_texts[json_file.stem] = json.dumps(data, ensure_ascii=False, indent=2)
            else:
                research_texts[json_file.stem] = str(data)
        except Exception:
            pass

    combined = "\n\n".join(research_texts.values())

    # ---- Extract expertise domains ----
    print("  Extracting expertise domains ...")
    profile["expertise"] = _extract_expertise(research_texts, combined)

    # ---- Extract heuristics ----
    print("  Extracting decision heuristics ...")
    profile["heuristics"] = _extract_heuristics(research_texts, combined)

    # ---- Extract style markers ----
    print("  Extracting communication style ...")
    profile["style"] = _extract_style(research_texts, combined)

    # ---- Extract tool preferences ----
    print("  Extracting tool preferences ...")
    profile["tools"] = _extract_tools(combined)

    # ---- Extract gotchas (highest-signal content) ----
    print("  Extracting gotchas ...")
    profile["gotchas"] = _extract_gotchas(research_texts, combined)

    # ---- Extract canon ----
    print("  Extracting reference canon ...")
    profile["canon"] = _extract_canon(combined)

    # ---- Assess confidence ----
    profile["confidence"] = _assess_confidence(profile)

    # Write output
    if output_path is None:
        parent = research.parent
        output_path = str(parent / "persona-profile.json")
    with open(output_path, "w") as f:
        json.dump(profile, f, ensure_ascii=False, indent=2)

    _print_footer(output_path, profile)
    return profile


# ---------------------------------------------------------------------------
# Extractors
# ---------------------------------------------------------------------------

def _extract_expertise(texts: dict, combined: str) -> list[dict]:
    """Extract expertise domains from research texts."""
    expertise = []
    # Look for technology/domain mentions with frequency
    tech_keywords = [
        "react", "javascript", "typescript", "python", "rust", "go", "golang",
        "clojure", "haskell", "elixir", "scala", "java", "c++", "c#",
        "frontend", "backend", "full-stack", "devops", "infrastructure",
        "distributed systems", "compiler", "database", "machine learning",
        "ai", "design", "ux", "accessibility", "performance", "security",
        "testing", "architecture", "api design", "open source",
        "vue", "angular", "svelte", "node", "deno", "graphql", "rest",
        "docker", "kubernetes", "aws", "cloud", "linux", "git",
    ]

    lower = combined.lower()
    domain_counts = Counter()
    for kw in tech_keywords:
        count = lower.count(kw)
        if count > 0:
            domain_counts[kw] = count

    for domain, count in domain_counts.most_common(10):
        level = "expert" if count >= 8 else "proficient" if count >= 3 else "familiar"
        evidence = []
        # Find specific mentions in research files
        for fname, text in texts.items():
            if domain in text.lower():
                evidence.append(f"{fname}: found {text.lower().count(domain)} mentions")
        expertise.append({
            "domain": domain,
            "level": level,
            "evidence": evidence[:3],  # Keep top 3 evidence items
        })

    return expertise


def _extract_heuristics(texts: dict, combined: str) -> list[dict]:
    """Extract decision heuristics from research texts.

    Looks for patterns like:
    - "When X, I prefer Y because Z"
    - "The rule of thumb is X"
    - "If X, then Y"
    - "Always/never X"
    """
    heuristics = []

    # Pattern-based extraction
    patterns = [
        (r"(?:when|if)\s+(.+?),\s*(?:I\s+)?(?:prefer|use|choose|go with|reach for)\s+(.+?)(?:because|since|as)\s+(.+)", "conditional"),
        (r"(?:always|never)\s+(.+?)(?:because|since)\s+(.+)", "absolute"),
        (r"(?:the\s+)?rule\s+(?:of\s+)?thumb\s+(?:is|:)\s*(.+)", "rule_of_thumb"),
        (r"(?:I've\s+found|I find|in my experience)\s+(?:that\s+)?(.+?)(?:because|since)\s+(.+)", "experiential"),
    ]

    for pattern, htype in patterns:
        matches = re.findall(pattern, combined, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                parts = [m for m in match if m]
                if len(parts) >= 2:
                    heuristics.append({
                        "when": parts[0].strip()[:200],
                        "then": parts[1].strip()[:200],
                        "because": parts[2].strip()[:200] if len(parts) > 2 else "",
                        "source": f"regex:{htype}",
                    })
            elif isinstance(match, str):
                heuristics.append({
                    "when": "",
                    "then": match.strip()[:200],
                    "because": "",
                    "source": f"regex:{htype}",
                })

    return heuristics[:15]  # Cap at 15 most relevant heuristics


def _extract_style(texts: dict, combined: str) -> dict:
    """Extract communication style markers."""
    style = {
        "formality": 5,
        "phrases": [],
        "patterns": [],
        "explanation_style": "",
    }

    # Formality heuristics
    lowercase = combined.lower()
    # Count exclamation marks, contractions, emojis as informality indicators
    informal_signals = len(re.findall(r'!{1,3}', combined)) + \
                       len(re.findall(r"\b(don't|can't|won't|i'm|you're|it's|that's|we're|they're)\b", lowercase)) + \
                       len(re.findall(r'[\U0001F300-\U0001F9FF]', combined))
    # Count formal signals
    formal_signals = len(re.findall(r"\b(therefore|however|consequently|furthermore|nevertheless|accordingly)\b", lowercase))

    if informal_signals > formal_signals * 3:
        style["formality"] = 3
    elif formal_signals > informal_signals * 3:
        style["formality"] = 7
    else:
        style["formality"] = 5

    # Common phrases (2-4 word ngrams that appear ≥3 times)
    words = re.findall(r'\b\w+\b', lowercase)
    trigrams = Counter()
    for i in range(len(words) - 2):
        trigram = " ".join(words[i:i+3])
        if len(trigram) > 15:  # Skip very long ngrams
            trigrams[trigram] += 1
    style["phrases"] = [p for p, c in trigrams.most_common(20) if c >= 3][:10]

    # Explanation style
    if "for example" in lowercase or "e.g." in lowercase:
        style["explanation_style"] = "example-first"
    elif "because" in lowercase or "the reason" in lowercase:
        style["explanation_style"] = "first-principles"
    elif "think of it" in lowercase or "imagine" in lowercase or "like" in lowercase:
        style["explanation_style"] = "analogy-driven"

    # Sentence patterns
    sentences = re.split(r'[.!?]+', combined)
    avg_len = sum(len(s.split()) for s in sentences[:100]) / max(len(sentences[:100]), 1)
    if avg_len < 10:
        style["patterns"].append("short-sentences")
    elif avg_len > 25:
        style["patterns"].append("long-sentences")
    else:
        style["patterns"].append("balanced")

    return style


def _extract_tools(combined: str) -> list[dict]:
    """Extract tool and workflow preferences."""
    tools = []
    tool_mentions = [
        ("VS Code", ["vs code", "vscode"]),
        ("Vim/Neovim", ["vim", "neovim", "nvim"]),
        ("JetBrains", ["intellij", "webstorm", "pycharm", "goland"]),
        ("Emacs", ["emacs"]),
        ("iTerm", ["iterm"]),
        ("Warp", ["warp terminal"]),
        ("tmux", ["tmux"]),
        ("Homebrew", ["homebrew", "brew"]),
        ("Docker", ["docker"]),
        ("GitHub CLI", ["gh ", "github cli"]),
        ("Linear", ["linear.app", "linear"]),
        ("Notion", ["notion"]),
        ("Obsidian", ["obsidian"]),
        ("Figma", ["figma"]),
    ]
    lower = combined.lower()
    for name, aliases in tool_mentions:
        for alias in aliases:
            if alias in lower:
                tools.append({"name": name, "usage": "", "source": f"keyword:{alias}"})
                break
    return tools[:10]


def _extract_gotchas(texts: dict, combined: str) -> list[dict]:
    """Extract gotchas and anti-patterns — the highest-signal content.

    Looks for:
    - Explicit "gotcha" / "watch out" / "be careful" / "trap" / "pitfall" mentions
    - Bug-related patterns: "don't" / "avoid" / "never" + technical context
    - "common mistake" / "common error" / "footgun"
    """
    gotchas = []
    lower = combined.lower()

    # Explicit gotcha markers
    patterns = [
        r"(?:gotcha|watch out|be careful|beware|trap|pitfall|footgun):\s*(.+)",
        r"(?:common\s+(?:mistake|error|bug|pitfall))(?:\s+(?:is|with))?:\s*(.+)",
        r"(?:don't|do not|never|avoid)\s+(.+?)(?:because|since|as|—|\.)",
        r"(?:one thing|something)\s+(?:people|developers?|engineers?)\s+(?:often|always|frequently)\s+(?:get wrong|miss|forget|overlook)\s+(?:is|:)\s*(.+)",
        r"(?:the\s+(?:trick|key|secret|catch))\s+(?:is|:)\s*(.+)",
    ]

    for pattern in patterns:
        matches = re.findall(pattern, combined, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                match = match[0] if match else ""
            text = match.strip()[:300]
            if text and len(text) > 20:  # Filter noise
                gotchas.append({
                    "pattern": text,
                    "fix": "",
                    "source": "text-extraction",
                })

    # If we found fewer than 5 from explicit patterns, add inferred gotchas
    if len(gotchas) < 5:
        # Look for technical "watch out" signals
        tech_gotchas = re.findall(
            r"(?:make sure|ensure|verify|check)\s+(?:that\s+)?(.+?)(?:\.|$)",
            combined, re.IGNORECASE
        )
        for tg in tech_gotchas[:10 - len(gotchas)]:
            gotchas.append({
                "pattern": tg.strip()[:300],
                "fix": "",
                "source": "check-pattern",
            })

    return gotchas[:20]  # Rich gotcha list


def _extract_canon(combined: str) -> list[dict]:
    """Extract reference canon: papers, books, talks, repos cited."""
    canon = []
    # URL citation patterns
    url_patterns = [
        r'(?:https?://github\.com/[\w.-]+/[\w.-]+)',
        r'(?:https?://arxiv\.org/abs/[\d.]+)',
        r'(?:https?://[\w.-]+\.(?:com|org|io|dev)/[\w./-]+)',
    ]
    for pattern in url_patterns:
        matches = re.findall(pattern, combined)
        for url in matches[:10]:
            if url not in [c.get("title", "") for c in canon]:
                canon.append({
                    "title": url,
                    "type": "url",
                    "cited_in": [],
                })

    # Book/paper title patterns (quoted or italicized)
    title_matches = re.findall(r'"([^"]{10,100})"', combined)
    for title in title_matches[:5]:
        canon.append({
            "title": title,
            "type": "unknown",
            "cited_in": [],
        })

    return canon[:15]


def _assess_confidence(profile: dict) -> dict:
    """Assess confidence level for each dimension."""
    c = {"expertise": "low", "heuristics": "low", "style": "low", "gotchas": "low"}

    if len(profile["expertise"]) >= 5:
        c["expertise"] = "high"
    elif len(profile["expertise"]) >= 2:
        c["expertise"] = "medium"

    if len(profile["heuristics"]) >= 5:
        c["heuristics"] = "high"
    elif len(profile["heuristics"]) >= 2:
        c["heuristics"] = "medium"

    if profile["style"].get("phrases") and profile["style"].get("explanation_style"):
        c["style"] = "medium"
    if len(profile["style"].get("phrases", [])) >= 5:
        c["style"] = "high"

    if len(profile["gotchas"]) >= 10:
        c["gotchas"] = "high"
    elif len(profile["gotchas"]) >= 5:
        c["gotchas"] = "medium"

    return c


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_json(path: Path) -> Optional[dict]:
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return None


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _print_header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def _print_footer(output_path: str, profile: dict):
    print(f"\n{'='*60}")
    print(f"  Profile written to: {output_path}")
    print(f"  Expertise: {len(profile['expertise'])} domains")
    print(f"  Heuristics: {len(profile['heuristics'])} rules")
    print(f"  Gotchas: {len(profile['gotchas'])} patterns")
    print(f"  Confidence: {profile['confidence']}")
    print(f"{'='*60}\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Spirit Forge — Distill (炼): Extract patterns from raw research"
    )
    parser.add_argument("raw_research_dir", help="Path to raw-research directory")
    parser.add_argument("--output", default=None, help="Output path for persona-profile.json")
    args = parser.parse_args()

    profile = distill(args.raw_research_dir, args.output)
