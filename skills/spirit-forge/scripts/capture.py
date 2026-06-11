#!/usr/bin/env python3
"""
Spirit Forge — Phase 1: Capture (拘灵)

Multi-source capture of a target persona. Identifies the input type
(GitHub URL, blog URL, Twitter handle, or name+domain), dispatches
parallel scraping, and produces structured raw research output.

Usage:
    python capture.py <target> [--depth L1|L2|L3] [--output-dir <path>]

Examples:
    python capture.py gaearon --depth L2
    python capture.py "github.com/D4Vinci" --depth L3 --output-dir ./research
    python capture.py "Dan Abramov, React" --depth L1
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Allow running from skill root or scripts/ directory
_skill_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_skill_root))

from scripts._shared.scraper import (
    scrape_page,
    crawl_blog,
    extract_github,
    search_person,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEPTH_CONFIG = {
    "L1": {
        "max_blog_pages": 5,
        "max_search_results": 5,
        "max_github_repos": 3,
        "description": "Quick scan: profile pages, pinned repos, top search results",
    },
    "L2": {
        "max_blog_pages": 30,
        "max_search_results": 15,
        "max_github_repos": 10,
        "description": "Standard: full blog crawl, deep GitHub, comprehensive search",
    },
    "L3": {
        "max_blog_pages": 80,
        "max_search_results": 30,
        "max_github_repos": 25,
        "description": "Exhaustive: everything discoverable about this person",
    },
}


# ---------------------------------------------------------------------------
# Input detection
# ---------------------------------------------------------------------------

def detect_target_type(target: str) -> dict:
    """Identify what kind of target identifier was provided.

    Returns a dict with 'type' and parsed fields for downstream scraping.
    """
    target = target.strip()

    # URL patterns
    if target.startswith("http://") or target.startswith("https://"):
        from urllib.parse import urlparse
        parsed = urlparse(target)

        if "github.com" in parsed.netloc:
            # github.com/username or github.com/username/repo
            parts = [p for p in parsed.path.split("/") if p]
            if parts:
                return {"type": "github", "username": parts[0], "url": target}
            return {"type": "url", "url": target}

        if parsed.netloc in ("twitter.com", "x.com", "www.twitter.com", "www.x.com"):
            parts = [p for p in parsed.path.split("/") if p]
            if parts:
                return {"type": "twitter", "handle": parts[0], "url": target}

        # Generic blog/site
        return {"type": "blog", "url": target}

    # @handle pattern (Twitter)
    if target.startswith("@"):
        return {"type": "twitter", "handle": target[1:]}

    # Plain text like "github.com/username"
    if target.startswith("github.com/"):
        username = target.split("/", 1)[1].split("/")[0]
        return {"type": "github", "username": username, "url": f"https://github.com/{username}"}

    # "Name, Domain" pattern
    if "," in target:
        parts = [p.strip() for p in target.split(",", 1)]
        return {"type": "name", "name": parts[0], "domain": parts[1] if len(parts) > 1 else ""}

    # Plain name or username
    return {"type": "name", "name": target, "domain": ""}


# ---------------------------------------------------------------------------
# Capture orchestration
# ---------------------------------------------------------------------------

def capture(target: str, depth: str = "L2", output_dir: Optional[str] = None) -> dict:
    """Main capture entrypoint.

    Args:
        target: Person identifier (URL, handle, or name)
        depth: Research depth (L1, L2, L3)
        output_dir: Where to write raw-research output

    Returns:
        Meta dict with summary of what was captured
    """
    config = DEPTH_CONFIG[depth]
    target_info = detect_target_type(target)
    _print_header("Phase 1: Capture (拘灵)")
    print(f"  Target: {target}")
    print(f"  Type: {target_info['type']}")
    print(f"  Depth: {depth} — {config['description']}")
    print()

    # Set up output directory
    if output_dir is None:
        persona_slug = _slugify(target_info.get("name", target_info.get("username", "unknown")))
        output_dir = f".spirit-forge/{persona_slug}/raw-research"
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    meta = {
        "target_raw": target,
        "target_type": target_info["type"],
        "depth": depth,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "sources_found": [],
        "files_written": [],
    }

    # ---- Source 1: Direct URL scraping ----
    if target_info["type"] in ("blog", "url"):
        _print_step(1, "Crawling target site")
        pages = crawl_blog(
            target_info["url"],
            max_pages=config["max_blog_pages"],
            output_dir=str(out / "crawl"),
        )
        meta["sources_found"].append({"type": "blog", "url": target_info["url"], "pages": len(pages)})
        _write_markdown(str(out / "writings.md"), _format_blog_pages(pages))
        meta["files_written"].append("writings.md")

    # ---- Source 2: GitHub profile ----
    if target_info["type"] == "github":
        _print_step(2, "Extracting GitHub profile")
        gh_data = extract_github(target_info["username"])
        gh_data["depth"] = depth
        gh_data["max_repos"] = config["max_github_repos"]

        with open(out / "github-profile.json", "w") as f:
            json.dump(gh_data, f, ensure_ascii=False, indent=2)
        meta["sources_found"].append({"type": "github", "username": target_info["username"]})
        meta["files_written"].append("github-profile.json")

        _write_markdown(str(out / "code-patterns.md"), _format_github_data(gh_data))
        meta["files_written"].append("code-patterns.md")

    # ---- Source 3: Web search ----
    name_for_search = target_info.get("name") or target_info.get("username", "")
    domain = target_info.get("domain", "")
    if name_for_search:
        _print_step(3, "Web search for person")
        search_results = search_person(name_for_search, domain)
        search_results = search_results[:config["max_search_results"]]

        with open(out / "search-results.json", "w") as f:
            json.dump(search_results, f, ensure_ascii=False, indent=2)
        meta["sources_found"].append({"type": "search", "results": len(search_results)})
        meta["files_written"].append("search-results.json")

        # Also scrape top search results for deeper content
        _print_step(4, "Scraping top search results")
        top_pages = []
        for sr in search_results[:5]:
            if sr.get("url"):
                try:
                    page = scrape_page(sr["url"])
                    if page["status"] == "ok" and page["text"]:
                        top_pages.append(page)
                except Exception:
                    pass

        _write_markdown(str(out / "decisions.md"), _format_search_content(search_results, top_pages))
        meta["files_written"].append("decisions.md")

    # ---- Source 4: Gotcha extraction hints ----
    _write_markdown(str(out / "gotchas.md"), _format_gotcha_hints(target_info))
    meta["files_written"].append("gotchas.md")

    # Write meta
    with open(out / "meta.json", "w") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    meta["files_written"].append("meta.json")

    _print_footer(str(out))
    return meta


# ---------------------------------------------------------------------------
# Output formatters
# ---------------------------------------------------------------------------

def _write_markdown(path: str, content: str):
    Path(path).write_text(content, encoding="utf-8")


def _format_blog_pages(pages: list[dict]) -> str:
    lines = ["# Blog/Web Content\n"]
    for p in pages:
        lines.append(f"## {p.get('title', 'Untitled')}")
        lines.append(f"URL: {p.get('url', '')}\n")
        # Truncate very long pages
        text = p.get("text", "")
        if len(text) > 5000:
            text = text[:5000] + "\n\n... (truncated)"
        lines.append(text)
        lines.append("\n---\n")
    return "\n".join(lines)


def _format_github_data(gh: dict) -> str:
    lines = [f"# GitHub Profile: {gh.get('username', 'Unknown')}\n"]
    lines.append(f"**Bio:** {gh.get('bio', 'N/A')}\n")
    lines.append(f"**Pinned Repos (visible):** {gh.get('repos', 0)}\n")
    languages = gh.get("languages", [])
    if languages:
        lines.append(f"**Languages:** {', '.join(languages)}\n")
    themes = gh.get("readme_themes", [])
    if themes:
        lines.append(f"**README Themes:** {', '.join(themes)}\n")
    lines.append(f"\n**URLs scraped:** {', '.join(gh.get('urls', []))}")
    return "\n".join(lines)


def _format_search_content(search_results: list[dict], top_pages: list[dict]) -> str:
    lines = ["# Web Search Results & Deep Content\n"]
    lines.append("## Search Results\n")
    for r in search_results:
        lines.append(f"- [{r.get('title', 'No title')}]({r.get('url', '')})")
        if r.get("snippet"):
            lines.append(f"  > {r['snippet']}")
    lines.append("\n## Scraped Content from Top Results\n")
    for p in top_pages:
        lines.append(f"### {p.get('title', 'Untitled')}\nURL: {p.get('url', '')}\n")
        text = p.get("text", "")
        if len(text) > 5000:
            text = text[:5000] + "\n\n... (truncated)"
        lines.append(text)
        lines.append("\n---\n")
    return "\n".join(lines)


def _format_gotcha_hints(target_info: dict) -> str:
    lines = ["# Potential Gotchas & Patterns\n"]
    lines.append("> This file is a placeholder. The distiller will extract actual")
    lines.append("> gotchas from the raw research data.\n")
    lines.append("## Hints from source type\n")
    t = target_info["type"]
    if t == "github":
        lines.append("- Analyze commit messages for review patterns")
        lines.append("- Check PR review comments for what this person consistently flags")
        lines.append("- Look at issue interactions: what questions do they ask?")
    elif t == "blog":
        lines.append("- Analyze post content for recurring themes and opinions")
        lines.append("- Look for 'gotcha' or 'mistake' patterns in technical posts")
    lines.append("- Cross-reference stated opinions with actual behavior")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slugify(text: str) -> str:
    return text.lower().replace(" ", "-").replace("@", "").replace("/", "-")


def _print_header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def _print_step(n: int, desc: str):
    print(f"  [{n}] {desc} ...")


def _print_footer(output_dir: str):
    print(f"\n{'='*60}")
    print(f"  Raw research written to: {output_dir}")
    print(f"{'='*60}\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Spirit Forge — Capture (拘灵): Multi-source persona research"
    )
    parser.add_argument("target", help="Person identifier: URL, @handle, github.com/user, or 'Name, Domain'")
    parser.add_argument("--depth", choices=["L1", "L2", "L3"], default="L2",
                        help="Research depth (default: L2)")
    parser.add_argument("--output-dir", default=None,
                        help="Output directory for raw research")
    args = parser.parse_args()

    meta = capture(args.target, args.depth, args.output_dir)
    print(f"Sources discovered: {len(meta['sources_found'])}")
    print(f"Files written: {meta['files_written']}")
