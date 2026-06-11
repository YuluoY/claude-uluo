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

    # ---- LLM extraction fallback (if regex extraction fails) ----
    # Stored for use by individual extractors when they produce insufficient results
    llm_cache: dict[str, list] = {}

    # ---- Extract expertise domains ----
    print("  Extracting expertise domains ...")
    profile["expertise"] = _extract_expertise(research_texts, combined)

    # ---- Extract heuristics ----
    print("  Extracting decision heuristics ...")
    profile["heuristics"] = _extract_heuristics(research_texts, combined)
    if len(profile["heuristics"]) < 3:
        print("  Regex extraction found <3 heuristics, trying LLM fallback ...")
        llm_heuristics = _llm_extract_heuristics(combined)
        if llm_heuristics:
            # Merge: LLM results supplement regex results
            seen = {h["then"].lower()[:60] for h in profile["heuristics"]}
            for h in llm_heuristics:
                if h["then"].lower()[:60] not in seen:
                    seen.add(h["then"].lower()[:60])
                    profile["heuristics"].append(h)
            print(f"  LLM added {len(llm_heuristics)} heuristics (total: {len(profile['heuristics'])})")

    # ---- Extract style markers ----
    print("  Extracting communication style ...")
    profile["style"] = _extract_style(research_texts, combined)

    # ---- Extract tool preferences ----
    print("  Extracting tool preferences ...")
    profile["tools"] = _extract_tools(combined)

    # ---- Extract gotchas (highest-signal content) ----
    print("  Extracting gotchas ...")
    profile["gotchas"] = _extract_gotchas(research_texts, combined)
    if len(profile["gotchas"]) < 3:
        print("  Regex extraction found <3 gotchas, trying LLM fallback ...")
        llm_gotchas = _llm_extract_gotchas(combined)
        if llm_gotchas:
            seen = {g["pattern"].lower()[:60] for g in profile["gotchas"]}
            for g in llm_gotchas:
                if g["pattern"].lower()[:60] not in seen:
                    seen.add(g["pattern"].lower()[:60])
                    profile["gotchas"].append(g)
            print(f"  LLM added {len(llm_gotchas)} gotchas (total: {len(profile['gotchas'])})")

    # ---- Extract canon ----
    print("  Extracting reference canon ...")
    profile["canon"] = _extract_canon(combined)

    # ---- Assess confidence ----
    profile["confidence"] = _assess_confidence(profile)

    # ---- Quality gate ----
    if len(profile["expertise"]) < 1 or len(profile["gotchas"]) < 3:
        print("  ⚠ DISTILL QUALITY GATE: insufficient signal extracted")
        print(f"     expertise: {len(profile['expertise'])} domains")
        print(f"     gotchas: {len(profile['gotchas'])} patterns")
        print(f"     heuristics: {len(profile['heuristics'])} rules")
        profile["_quality_gate"] = {
            "status": "insufficient",
            "reason": f"Low extraction yield: {len(profile['expertise'])} domains, {len(profile['gotchas'])} gotchas",
            "recommendation": "Re-run capture at L2 or L3 depth, or manually enrich raw-research/ with additional source content."
        }

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
    """Extract expertise domains from research texts using word-boundary matching.

    Uses \b boundaries to prevent false positives (e.g., 'go' matching in 'gotcha').
    Applies a blacklist for common short words that slip through.
    """
    expertise = []

    # Domain keywords: (display_name, regex_pattern)
    # Patterns use \b for word boundary to avoid substring false positives
    tech_domains: list[tuple[str, str]] = [
        ("react", r"\breact\b"),
        ("javascript", r"\bjavascript\b"),
        ("typescript", r"\btype\s*script\b"),
        ("python", r"\bpython\b"),
        ("rust", r"\brust\b"),
        ("go (golang)", r"\bgolang\b|\bgo\s+language\b|\bgo\s+programming\b"),
        ("clojure", r"\bclojure\b"),
        ("haskell", r"\bhaskell\b"),
        ("elixir", r"\belixir\b"),
        ("scala", r"\bscala\b"),
        ("java", r"\bjava\b"),
        ("c++", r"\bc\+\+\b"),
        ("c#", r"\bc#\b"),
        ("frontend", r"\bfront[\s-]*end\b"),
        ("backend", r"\bback[\s-]*end\b"),
        ("full-stack", r"\bfull[\s-]*stack\b"),
        ("devops", r"\bdevops\b"),
        ("infrastructure", r"\binfrastructure\b"),
        ("distributed systems", r"\bdistributed\s+systems?\b"),
        ("compilers", r"\bcompilers?\b"),
        ("databases", r"\bdatabases?\b|\bsql\b"),
        ("machine learning", r"\bmachine\s+learning\b|\bml\b"),
        ("ai / llm", r"\bai\b|\bllms?\b|\blarge\s+language\s+models?\b"),
        ("design", r"\bdesign\b"),
        ("ux", r"\bux\b|\buser\s+experience\b"),
        ("accessibility", r"\baccessibility\b|\ba11y\b"),
        ("performance", r"\bperformance\b|\boptimization\b"),
        ("security", r"\bsecurity\b"),
        ("testing", r"\btesting\b|\btest\s+driven\b|\bunit\s+tests?\b"),
        ("architecture", r"\barchitecture\b|\bdesign\s+patterns?\b"),
        ("api design", r"\bapi\s+design\b|\brest\s+api\b|\bgraphql\b"),
        ("open source", r"\bopen[\s-]*source\b"),
        ("vue", r"\bvue\b"),
        ("angular", r"\bangular\b"),
        ("svelte", r"\bsvelte\b"),
        ("node.js", r"\bnode\.?js\b|\bnode\b"),
        ("deno", r"\bdeno\b"),
        ("docker", r"\bdocker\b"),
        ("kubernetes", r"\bkubernetes\b|\bk8s\b"),
        ("aws", r"\baws\b|\bamazon\s+web\s+services\b"),
        ("cloud", r"\bcloud\b"),
        ("linux", r"\blinux\b"),
        ("git", r"\bgit\b|\bgithub\b"),
        ("functional programming", r"\bfunctional\s+programming\b|\bfp\b"),
        ("writing / technical writing", r"\btechnical\s+writing\b|\bwriting\s+style\b|\bauthor\b"),
        ("teaching / mentoring", r"\bteaching\b|\bmentoring\b|\beducation\b|\bspeaking\b"),
    ]

    # Blacklist: common short words that might match domain patterns as substrings
    blacklist = {"go", "ai", "it", "we", "can", "set", "run", "use", "new", "one", "two", "top", "get", "put", "api", "css", "dom", "web", "app", "ide", "npm", "ci"}

    lower = combined.lower()
    domain_counts: dict[str, int] = {}
    domain_patterns: dict[str, str] = {}

    for display_name, pattern in tech_domains:
        matches = re.findall(pattern, lower, re.IGNORECASE)
        if matches:
            count = len(matches)
            # Filter blacklist: if the display_name maps to a blacklisted word and
            # the match count is suspiciously low (< 5 in a long text), skip it
            if display_name.split()[0] in blacklist and count < 5:
                continue
            domain_counts[display_name] = count
            domain_patterns[display_name] = pattern

    for domain, count in sorted(domain_counts.items(), key=lambda x: -x[1])[:10]:
        level = "expert" if count >= 8 else "proficient" if count >= 3 else "familiar"
        evidence = []
        pattern = domain_patterns.get(domain, domain)
        for fname, text in texts.items():
            found = len(re.findall(pattern, text, re.IGNORECASE))
            if found > 0:
                evidence.append(f"{fname}: {found} mentions")
        expertise.append({
            "domain": domain,
            "level": level,
            "evidence": evidence[:3],
        })

    return expertise


def _extract_heuristics(texts: dict, combined: str) -> list[dict]:
    """Extract decision heuristics from research texts.

    Supports both first-person (I prefer) and third-person (he prefers, the author chooses)
    patterns. Also handles declarative rules and principles.
    """
    heuristics = []

    # Pattern-based extraction — first + third person variants
    patterns = [
        # First-person conditional: "When X, I prefer Y because Z"
        (r"(?:when|if)\s+(.+?),\s*(?:I\s+)?(?:prefer|use|choose|go with|reach for|recommend)\s+(.+?)(?:because|since|as)\s+(.+)", "conditional"),
        # Third-person conditional: "When X, he prefers Y because Z"
        (r"(?:when|if)\s+(.+?),\s*(?:he|she|they|the\s+author)\s+(?:prefers?|uses?|chooses?|reaches?\s+for|recommends?)\s+(.+?)(?:because|since|as)\s+(.+)", "conditional-3p"),
        # Absolute rules: "Always/never X because Y"
        (r"(?:always|never)\s+(.+?)(?:because|since)\s+(.+)", "absolute"),
        # Rule of thumb: "The rule of thumb is X"
        (r"(?:the\s+)?rule\s+(?:of\s+)?thumb\s+(?:is|:)\s*(.+)", "rule_of_thumb"),
        # Experiential (first-person): "I've found X because Y"
        (r"(?:I've\s+found|I\s+find|in\s+my\s+experience)\s+(?:that\s+)?(.+?)(?:because|since)\s+(.+)", "experiential"),
        # Experiential (third-person): "He's found X because Y"
        (r"(?:he's|she's|they've)\s+found\s+(?:that\s+)?(.+?)(?:because|since)\s+(.+)", "experiential-3p"),
        # Principle statement: "The key insight/principle/approach is X"
        (r"(?:the|a|one)\s+(?:key\s+)?(?:insight|principle|approach|pattern|idea)\s+(?:is|:)\s*(.+)", "principle"),
        # Trade-off framing: "X vs Y" or "X over Y when Z"
        (r"(?:prefers?|chooses?|goes?\s+with)\s+(.+?)\s+(?:over|rather\s+than|instead\s+of)\s+(.+?)(?:when|because|for)\s+(.+)", "tradeoff"),
        # "Don't X, instead Y"
        (r"(?:don't|do\s+not)\s+(.+?),\s*(?:instead|rather|prefer)\s+(.+)", "correction"),
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
            elif isinstance(match, str) and len(match.strip()) > 15:
                heuristics.append({
                    "when": "",
                    "then": match.strip()[:200],
                    "because": "",
                    "source": f"regex:{htype}",
                })

    # Deduplicate by 'then' field (most distinctive)
    seen = set()
    unique = []
    for h in heuristics:
        key = h["then"].lower()[:80]
        if key not in seen:
            seen.add(key)
            unique.append(h)

    return unique[:20]  # Cap at 20 most relevant heuristics


def _extract_style(texts: dict, combined: str) -> dict:
    """Extract communication style markers.

    Filters out Markdown formatting before analysis to avoid extracting
    headings and syntax markers as style patterns.
    """
    # Strip Markdown formatting before analysis
    cleaned = _strip_markdown(combined)
    cleaned_lower = cleaned.lower()

    style = {
        "formality": 5,
        "phrases": [],
        "patterns": [],
        "explanation_style": "",
    }

    # Formality heuristics
    informal_signals = len(re.findall(r'!{1,3}', cleaned)) + \
                       len(re.findall(r"\b(don't|can't|won't|i'm|you're|it's|that's|we're|they're)\b", cleaned_lower)) + \
                       len(re.findall(r'[\U0001F300-\U0001F9FF]', cleaned))
    formal_signals = len(re.findall(r"\b(therefore|however|consequently|furthermore|nevertheless|accordingly|moreover|thus|hence)\b", cleaned_lower))

    if informal_signals > formal_signals * 3:
        style["formality"] = 3
    elif formal_signals > informal_signals * 3:
        style["formality"] = 7
    else:
        style["formality"] = 5

    # Common phrases from cleaned text (2-4 word ngrams, ≥3 occurrences)
    words = re.findall(r'\b[a-z]+\b', cleaned_lower)
    trigrams = Counter()
    # Common stop words to skip when building ngrams
    stop_ngrams = {"the", "this", "that", "with", "from", "have", "been", "were", "they", "their", "them"}
    for i in range(len(words) - 2):
        trigram = " ".join(words[i:i+3])
        if trigram in stop_ngrams:
            continue
        if 10 < len(trigram) < 40:
            trigrams[trigram] += 1
    style["phrases"] = [p for p, c in trigrams.most_common(30) if c >= 3][:10]

    # Explanation style
    if "for example" in cleaned_lower or "e.g." in cleaned_lower or "here's an example" in cleaned_lower:
        style["explanation_style"] = "example-first"
    elif "because" in cleaned_lower or "the reason" in cleaned_lower or "why" in cleaned_lower:
        style["explanation_style"] = "first-principles"
    elif "think of it" in cleaned_lower or "imagine" in cleaned_lower or "like" in cleaned_lower:
        style["explanation_style"] = "analogy-driven"
    else:
        style["explanation_style"] = "balanced"

    # Sentence patterns (filtered text)
    sentences = re.split(r'[.!?]+', cleaned)
    valid_sentences = [s for s in sentences[:100] if len(s.split()) >= 3]
    if valid_sentences:
        avg_len = sum(len(s.split()) for s in valid_sentences) / len(valid_sentences)
        if avg_len < 10:
            style["patterns"].append("short-sentences")
        elif avg_len > 30:
            style["patterns"].append("long-sentences")
        else:
            style["patterns"].append("balanced")

    # Rhetorical devices
    if re.search(r'\?', cleaned) and len(re.findall(r'\?', cleaned)) > 3:
        style["patterns"].append("uses-rhetorical-questions")
    if re.search(r'(?:not X, but Y|not only.*but also)', cleaned):
        style["patterns"].append("contrast-heavy")
    if re.search(r'(?:imagine|picture this|visualize)', cleaned_lower):
        style["patterns"].append("visual-language")

    # Add 8-dimension style analysis (ghost-writer subset)
    style["dimensions"] = {
        "sentence_variety": _sentence_variety(valid_sentences) if valid_sentences else "unknown",
        "vocabulary_richness": _vocabulary_richness(cleaned),
        "passive_voice_ratio": _passive_ratio(cleaned_lower),
        "hedging_frequency": _hedging_frequency(cleaned_lower),
        "first_person_ratio": _pronoun_ratio(cleaned_lower, "i|me|my|we|our"),
        "technical_density": _technical_density(cleaned_lower),
        "imperative_frequency": len(re.findall(r'^(?:do|don\'t|make|use|try|check|see|note|run|set|get)\b', cleaned_lower, re.MULTILINE)),
        "question_frequency": cleaned.count("?"),
    }

    return style


def _strip_markdown(text: str) -> str:
    """Remove Markdown formatting to get clean prose for NLP analysis."""
    # Remove headings
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Remove bold/italic
    text = re.sub(r'\*{1,3}(.+?)\*{1,3}', r'\1', text)
    # Remove code blocks
    text = re.sub(r'```[\s\S]*?```', '', text)
    # Remove inline code
    text = re.sub(r'`[^`]+`', '', text)
    # Remove links [text](url) -> text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Remove horizontal rules
    text = re.sub(r'^[-*_]{3,}\s*$', '', text, flags=re.MULTILINE)
    # Remove blockquotes
    text = re.sub(r'^>\s+', '', text, flags=re.MULTILINE)
    # Remove list markers
    text = re.sub(r'^[\s]*[-*+]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^[\s]*\d+\.\s+', '', text, flags=re.MULTILINE)
    # Collapse whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


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

    Captures both the pattern (what goes wrong) AND the fix (how to resolve it)
    by reading the sentence following each gotcha mention.
    """
    gotchas = []
    lower = combined.lower()

    # Split into sentences for fix-text extraction
    sentences_raw = re.split(r'(?<=[.!?])\s+', combined)
    sentences_lower = [s.lower() for s in sentences_raw]

    # Explicit gotcha markers — capture the pattern + next sentence as fix
    explicit_patterns = [
        r"(?:gotcha|watch out|be careful|beware|trap|pitfall|footgun):\s*(.+)",
        r"(?:common\s+(?:mistake|error|bug|pitfall))(?:\s+(?:is|with))?:\s*(.+)",
    ]

    for pattern in explicit_patterns:
        matches = re.findall(pattern, combined, re.IGNORECASE)
        for match in matches:
            text = (match[0] if isinstance(match, tuple) else match).strip()[:300]
            if text and len(text) > 15:
                # Try to find a fix in the next sentence
                fix = ""
                for i, s in enumerate(sentences_raw):
                    if text[:50].strip() in s:
                        if i + 1 < len(sentences_raw):
                            next_s = sentences_raw[i + 1].strip()
                            # Check if the next sentence looks like a fix
                            if re.search(r'(?:fix|instead|rather|solution|correct|should|use|try|replace)', next_s.lower()):
                                fix = next_s[:300]
                        break
                gotchas.append({
                    "pattern": text,
                    "fix": fix,
                    "source": "text-extraction",
                })

    # Negative pattern gotchas: "don't X because Y" or "avoid X"
    neg_patterns = [
        r"(?:don't|do\s+not|never|avoid)\s+(.+?)(?:because|since|as|—|\.)",
    ]
    for pattern in neg_patterns:
        matches = re.findall(pattern, combined, re.IGNORECASE)
        for match in matches:
            text = (match[0] if isinstance(match, tuple) else match).strip()[:300]
            if text and len(text) > 15:
                gotchas.append({
                    "pattern": text,
                    "fix": "",
                    "source": "negative-pattern",
                })

    # People-often-get-wrong patterns
    crowd_patterns = [
        r"(?:one thing|something)\s+(?:people|developers?|engineers?)\s+(?:often|always|frequently|typically)\s+(?:get wrong|miss|forget|overlook|don't realize)\s+(?:is|:)\s*(.+)",
        r"(?:the\s+(?:trick|key|secret|catch))\s+(?:is|:)\s*(.+)",
    ]
    for pattern in crowd_patterns:
        matches = re.findall(pattern, combined, re.IGNORECASE)
        for match in matches:
            text = (match[0] if isinstance(match, tuple) else match).strip()[:300]
            if text and len(text) > 15:
                gotchas.append({
                    "pattern": text,
                    "fix": "",
                    "source": "crowd-wisdom",
                })

    # Fallback: "make sure / ensure / verify / check" patterns
    if len(gotchas) < 5:
        fallback_matches = re.findall(
            r"(?:make sure|ensure|verify|check)\s+(?:that\s+)?(.+?)(?:\.|$|\n)",
            combined, re.IGNORECASE
        )
        for fm in fallback_matches[:10 - len(gotchas)]:
            gotchas.append({
                "pattern": fm.strip()[:300],
                "fix": "",
                "source": "check-pattern",
            })

    # Deduplicate
    seen = set()
    unique = []
    for g in gotchas:
        key = g["pattern"].lower()[:80]
        if key not in seen:
            seen.add(key)
            unique.append(g)

    return unique[:20]  # Rich gotcha list


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
# Style dimension helpers (8-dimension ghost-writer subset)
# ---------------------------------------------------------------------------

def _sentence_variety(sentences: list[str]) -> str:
    if not sentences:
        return "unknown"
    lengths = [len(s.split()) for s in sentences]
    if max(lengths) - min(lengths) > 15:
        return "high-variety"
    if max(lengths) - min(lengths) < 5:
        return "uniform"
    return "moderate-variety"


def _vocabulary_richness(text: str) -> str:
    words = re.findall(r'\b\w+\b', text.lower())
    if len(words) < 50:
        return "too-short"
    ttr = len(set(words)) / len(words)
    if ttr > 0.6:
        return "rich"
    if ttr > 0.4:
        return "moderate"
    return "repetitive"


def _passive_ratio(text_lower: str) -> str:
    passive = len(re.findall(r'\b(?:is|are|was|were|been|be)\s+\w+(?:ed|en|t)\b', text_lower))
    total = max(len(re.findall(r'[.!?]', text_lower)), 1)
    if total == 0:
        return "unknown"
    ratio = passive / total
    if ratio > 0.3:
        return "high-passive"
    if ratio > 0.1:
        return "moderate-passive"
    return "low-passive"


def _hedging_frequency(text_lower: str) -> str:
    hedges = len(re.findall(
        r'\b(?:maybe|perhaps|possibly|probably|likely|tends?\s+to|seems?\s+to|'
        r'appears?\s+to|might|may|could|would|should|generally|typically|often|'
        r'usually|sort\s+of|kind\s+of|i\s+think|i\s+believe|in\s+my\s+opinion)\b',
        text_lower
    ))
    sentences = max(len(re.findall(r'[.!?]', text_lower)), 1)
    ratio = hedges / sentences
    if ratio > 0.5:
        return "high-hedging"
    if ratio > 0.2:
        return "moderate-hedging"
    return "low-hedging"


def _pronoun_ratio(text_lower: str, pattern: str) -> str:
    matches = len(re.findall(rf'\b({pattern})\b', text_lower))
    words = max(len(re.findall(r'\b\w+\b', text_lower)), 1)
    ratio = matches / words
    if ratio > 0.05:
        return "high"
    if ratio > 0.02:
        return "moderate"
    return "low"


def _technical_density(text_lower: str) -> str:
    tech_terms = len(re.findall(
        r'\b(?:api|sdk|cli|http|json|xml|sql|css|html|dom|rest|rpc|'
        r'function|method|class|module|package|library|framework|'
        r'compiler|interpreter|runtime|binary|protocol|endpoint|'
        r'server|client|database|cache|queue|stream|pipeline)\b',
        text_lower
    ))
    words = max(len(re.findall(r'\b\w+\b', text_lower)), 1)
    ratio = tech_terms / words
    if ratio > 0.04:
        return "high"
    if ratio > 0.02:
        return "moderate"
    return "low"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _llm_extract_heuristics(text: str, max_items: int = 10) -> list[dict]:
    """LLM-based heuristic extraction fallback.

    Called when regex extraction produces fewer than 3 results.
    Uses subprocess to call Claude CLI for semantic extraction.
    """
    try:
        import subprocess
        # Truncate text to avoid token limits
        excerpt = text[:8000]
        prompt = f"""Extract decision heuristics from this text about a person's technical preferences and working style.

For each heuristic found, output a JSON object with:
- "when": the condition or situation
- "then": the preferred action/choice
- "because": the rationale (can be empty string if not stated)

Return ONLY a JSON array of these objects, nothing else. Maximum {max_items} items.
If you cannot find any clear heuristics, return an empty array [].

Text:
{excerpt}
"""
        result = subprocess.run(
            ["claude", "-p", prompt, "--output-format", "json"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0 and result.stdout.strip():
            data = json.loads(result.stdout.strip())
            if isinstance(data, list):
                return [{"when": h.get("when", ""), "then": h.get("then", ""),
                         "because": h.get("because", ""), "source": "llm-extraction"}
                        for h in data if h.get("then")]
    except Exception:
        pass
    return []


def _llm_extract_gotchas(text: str, max_items: int = 10) -> list[dict]:
    """LLM-based gotcha extraction fallback."""
    try:
        import subprocess
        excerpt = text[:8000]
        prompt = f"""Extract gotchas, common mistakes, and anti-patterns from this text about a person's technical expertise.

For each gotcha, output a JSON object with:
- "pattern": the common mistake or anti-pattern (what goes wrong)
- "fix": the recommended approach or solution (can be empty string)

Return ONLY a JSON array of these objects, nothing else. Maximum {max_items} items.
If you cannot find any clear gotchas, return an empty array [].

Text:
{excerpt}
"""
        result = subprocess.run(
            ["claude", "-p", prompt, "--output-format", "json"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0 and result.stdout.strip():
            data = json.loads(result.stdout.strip())
            if isinstance(data, list):
                return [{"pattern": g.get("pattern", ""), "fix": g.get("fix", ""),
                         "source": "llm-extraction"}
                        for g in data if g.get("pattern")]
    except Exception:
        pass
    return []


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
