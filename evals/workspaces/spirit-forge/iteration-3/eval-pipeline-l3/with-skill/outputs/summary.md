# Spirit Forge L3 Pipeline Test — paulgraham.com

**Date:** 2026-06-11
**Pipeline Duration:** 18.3s
**Target:** https://paulgraham.com
**Depth:** L3 (exhaustive: up to 80 blog pages, 30 search results, 25 GitHub repos)

---

## Pipeline Phase Results

| Phase | Status | Notes |
|-------|--------|-------|
| Capture | OK | 1 blog page crawled (of 80 max). See root cause below. |
| Distill | GATE_FAILED | 0 expertise domains, 0 heuristics, 0 gotchas extracted |
| Forge | OK | Generated skeleton skill with placeholder content |
| Validate | 9/10 passed | Only gotcha count check failed (found 0, need >=5) |

---

## Blog Pages Crawled

**1 page** of 80 max (L3 limit).

The crawl captured only the paulgraham.com homepage. No essay pages were reached.

## Heuristics Extracted

**0 heuristics.** The distiller's regex patterns found no matching decision heuristics in the 197 bytes of text from the single homepage. The LLM fallback was invoked but got nothing to work with — the text was just a nav listing.

## Gotchas Extracted

**0 gotchas.** Same root cause — insufficient source text for either regex or LLM extraction.

---

## Root Cause: Link Resolution Bug in crawl_blog()

The `crawl_blog()` function in `scripts/_shared/scraper.py` (line ~118) has a link resolution gap:

```python
# Resolve relative URLs
if link.startswith("/"):
    link = f"https://{domain}{link}"
elif not link.startswith("http"):
    continue
```

This correctly handles root-relative URLs (`/articles/foo.html`) and absolute URLs (`https://...`), but **skips page-relative URLs without a leading slash** (`brandage.html`, `articles.html`).

paulgraham.com uses exactly this linking style:

```
<a href="brandage.html">The Brand Age</a>
<a href="goodwriting.html">Good Writing</a>
<a href="foundermode.html">Founder Mode</a>
```

These 4 links were extracted but all were skipped by the `continue`, so the crawler's queue emptied after 1 page — the homepage itself.

### Actual Links Discovered (but skipped):

| Link | Type | Skipped Reason |
|------|------|----------------|
| `brandage.html` | page-relative | No leading `/` or `http` |
| `goodwriting.html` | page-relative | No leading `/` or `http` |
| `foundermode.html` | page-relative | No leading `/` or `http` |
| `http://ycombinator.com/apply.html` | absolute, different domain | Not same-domain |

### Impact

- L3 depth (80-page max) is meaningless when the crawler can only reach 1 page
- paulgraham.com has ~200+ essays — all unreachable via this crawl path
- The pipeline functions correctly end-to-end, but the capture substrate starves downstream phases of input

---

## Unit Tests

| Test Suite | Result |
|-----------|--------|
| `test_extract_expertise.py` (4 tests) | All passed |
| `test_validate.py` (3 tests) | All passed |

---

## Generated Skill

Location: `outputs/generated-skill/`

| File | Status |
|------|--------|
| `SKILL.md` (39 lines) | Skeleton with placeholder sections |
| `references/domain-knowledge.md` | Empty header only |
| `references/communication-guide.md` | Style markers only (formality 5, balanced) |
| `.claude-plugin/plugin.json` | Valid, name: `https-paulgrahamcom` |

The skill is structurally valid but semantically empty — it contains no domain-specific gotchas, heuristics, or expertise because the capture phase produced insufficient source material.

---

## Recommended Fix

In `scripts/_shared/scraper.py`, the link resolution block should handle page-relative URLs using `urllib.parse.urljoin`:

```python
from urllib.parse import urljoin
# Resolve relative URLs
if not link.startswith("http"):
    link = urljoin(current, link)
```

The `urljoin` function from stdlib correctly resolves all relative URL forms against the current page URL, including both root-relative (`/foo`) and page-relative (`foo.html`) forms.
