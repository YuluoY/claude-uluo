"""
Scrapling-based shared scraping utilities for Spirit Forge.

Provides deterministic functions for web scraping, platform-specific
extraction (GitHub, blogs, social media), and person search.

Usage:
    from scripts._shared.scraper import scrape_page, extract_github, search_person
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_dir(path: str) -> Path:
    d = Path(path)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _rate_limit(seconds: float = 1.0):
    """Simple rate limiter to avoid hammering servers."""
    time.sleep(seconds)


def _is_github_url(url: str) -> bool:
    return "github.com" in urlparse(url).netloc


def _is_twitter_url(url: str) -> bool:
    netloc = urlparse(url).netloc
    return netloc in ("twitter.com", "x.com", "www.twitter.com", "www.x.com")


# ---------------------------------------------------------------------------
# Page scraping
# ---------------------------------------------------------------------------

def scrape_page(url: str, timeout: int = 30) -> dict:
    """Scrape a single page, returning cleaned title + text + metadata.

    Returns:
        {"url": str, "title": str, "text": str, "links": [str],
         "timestamp": str, "status": "ok"|"error", "error": str|None}
    """
    result = {
        "url": url,
        "title": "",
        "text": "",
        "links": [],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "status": "ok",
        "error": None,
    }

    try:
        from scrapling import PlaywrightScraper
        scraper = PlaywrightScraper()
        page = scraper.get(url, timeout=timeout)
        result["title"] = page.title or ""
        result["text"] = page.get_text() or ""
        links = page.get_links()
        result["links"] = [l.get("href", "") for l in links if l.get("href")]
    except ImportError:
        # Fallback: use requests + BeautifulSoup if scrapling not available
        try:
            import requests
            from bs4 import BeautifulSoup
            resp = requests.get(url, timeout=timeout, headers={
                "User-Agent": "Mozilla/5.0 (compatible; SpiritForge/0.1)"
            })
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            result["title"] = soup.title.string if soup.title else ""
            result["text"] = soup.get_text(separator="\n", strip=True)
            result["links"] = [a.get("href", "") for a in soup.find_all("a") if a.get("href")]
        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)

    return result


def crawl_blog(url: str, max_pages: int = 50, output_dir: Optional[str] = None) -> list[dict]:
    """Crawl a blog/site, returning list of scraped pages.

    Crawls same-domain pages starting from url, up to max_pages.
    If output_dir is given, writes intermediate results there.
    """
    results = []
    domain = urlparse(url).netloc
    visited = set()
    queue = [url]

    while queue and len(results) < max_pages:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)

        _rate_limit(0.5)
        page = scrape_page(current)
        results.append(page)

        # Enqueue same-domain links
        for link in page.get("links", []):
            if len(results) + len(queue) >= max_pages:
                break
            # Resolve relative URLs
            if link.startswith("/"):
                link = f"https://{domain}{link}"
            elif not link.startswith("http"):
                continue
            if urlparse(link).netloc == domain and link not in visited:
                queue.append(link)

    if output_dir:
        out = _ensure_dir(output_dir)
        for i, page in enumerate(results):
            fname = f"page_{i:03d}.json"
            with open(out / fname, "w") as f:
                json.dump(page, f, ensure_ascii=False, indent=2)

    return results


# ---------------------------------------------------------------------------
# Platform-specific extraction
# ---------------------------------------------------------------------------

def extract_github(username: str) -> dict:
    """Extract patterns from a GitHub user profile.

    Returns:
        {"username": str, "bio": str, "repos": int, "languages": [str],
         "readme_themes": [str], "commit_style": str, "pr_style": str,
         "urls": [str], "status": "ok"|"error"}
    """
    result = {
        "username": username,
        "bio": "",
        "repos": 0,
        "languages": [],
        "readme_themes": [],
        "commit_style": "",
        "pr_style": "",
        "urls": [],
        "status": "ok",
        "error": None,
    }

    profile_url = f"https://github.com/{username}"
    result["urls"].append(profile_url)

    try:
        from scrapling import PlaywrightScraper
        scraper = PlaywrightScraper()

        # Scrape profile overview
        page = scraper.get(profile_url)
        text = page.get_text() or ""

        # Basic extraction from profile text
        # Bio is usually right after the name in the profile
        result["bio"] = _extract_bio_from_github_text(text)

        # Count pinned repos as a signal
        pinned = page.get_elements_by_xpath(
            "//ol[contains(@class, 'pinned-items')]//span[contains(@class, 'repo')]"
        )
        result["repos"] = len(pinned) if pinned else 0

        # Check for common languages in pinned repos
        lang_elems = page.get_elements_by_xpath("//span[@itemprop='programmingLanguage']")
        result["languages"] = list(set(
            e.get_text().strip() for e in (lang_elems or []) if e.get_text()
        ))[:8]

        # Scrape README if it exists
        readme_url = f"https://github.com/{username}/{username}"
        try:
            readme_page = scraper.get(readme_url)
            readme_text = readme_page.get_text() or ""
            result["readme_themes"] = _extract_readme_themes(readme_text)
            result["urls"].append(readme_url)
        except Exception:
            pass

    except ImportError:
        try:
            import requests
            from bs4 import BeautifulSoup
            resp = requests.get(profile_url, timeout=30, headers={
                "User-Agent": "Mozilla/5.0 (compatible; SpiritForge/0.1)"
            })
            soup = BeautifulSoup(resp.text, "html.parser")
            text = soup.get_text(separator="\n", strip=True)
            result["bio"] = _extract_bio_from_github_text(text)
        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)

    return result


def _extract_bio_from_github_text(text: str) -> str:
    """Heuristic: extract likely bio line from GitHub profile text."""
    lines = text.split("\n")
    # Bio usually appears near the top, is short, and not a heading
    for line in lines[:30]:
        stripped = line.strip()
        if stripped and len(stripped) < 200 and not stripped.startswith("#"):
            if "followers" not in stripped.lower() and "following" not in stripped.lower():
                if "repositories" not in stripped.lower():
                    return stripped
    return ""


def _extract_readme_themes(text: str) -> list[str]:
    """Extract thematic keywords from a GitHub profile README."""
    themes = []
    keywords = [
        "rust", "react", "typescript", "python", "go", "clojure",
        "functional", "systems", "compiler", "distributed", "frontend",
        "backend", "infrastructure", "devops", "machine learning",
        "open source", "performance", "security", "testing", "design",
    ]
    lower = text.lower()
    for kw in keywords:
        if kw in lower:
            themes.append(kw)
    return themes


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search_person(name: str, domain: str = "") -> list[dict]:
    """Search for a person using web search.

    Returns list of {"url": str, "title": str, "snippet": str, "relevance": float}
    """
    results = []

    # Try different search engines via requests
    try:
        import requests
        from bs4 import BeautifulSoup

        query = f'"{name}" {domain}'
        if domain:
            query += f" {domain}"

        # DuckDuckGo HTML search (no API key needed)
        resp = requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0 (compatible; SpiritForge/0.1)"}
        )
        soup = BeautifulSoup(resp.text, "html.parser")
        for i, res in enumerate(soup.select(".result")):
            title_el = res.select_one(".result__title")
            snippet_el = res.select_one(".result__snippet")
            link_el = res.select_one(".result__url")

            title = title_el.get_text(strip=True) if title_el else ""
            snippet = snippet_el.get_text(strip=True) if snippet_el else ""
            link = link_el.get_text(strip=True) if link_el else ""

            if title or snippet:
                results.append({
                    "url": link,
                    "title": title,
                    "snippet": snippet,
                    "relevance": 1.0 - (i * 0.05),  # Simple position-based relevance
                })
    except Exception:
        pass

    return results


# ---------------------------------------------------------------------------
# CLI entrypoints for testing
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("action", choices=["scrape", "crawl", "github", "search"])
    ap.add_argument("target")
    ap.add_argument("--max-pages", type=int, default=50)
    ap.add_argument("--output-dir", default=None)
    args = ap.parse_args()

    if args.action == "scrape":
        result = scrape_page(args.target)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif args.action == "crawl":
        results = crawl_blog(args.target, args.max_pages, args.output_dir)
        print(f"Crawled {len(results)} pages")
    elif args.action == "github":
        result = extract_github(args.target)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif args.action == "search":
        results = search_person(args.target)
        for r in results:
            print(f"[{r['relevance']:.2f}] {r['title']}\n  {r['snippet']}\n  {r['url']}\n")
