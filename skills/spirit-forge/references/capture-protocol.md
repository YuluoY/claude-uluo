# Capture Protocol (拘灵)

How to research a target person online — methodology, tools, and best practices.

## Information Sources

Adapted from the uluo-spec-driven research protocol.

| Source | What It Reveals | Priority | Tools |
|--------|----------------|----------|-------|
| GitHub profile/repos | Code patterns, tool choices, collaboration style, review habits | Highest | `extract_github()`, GitHub API |
| Personal blog | Writing style, decision rationale, depth of thinking | Highest | `crawl_blog()` |
| Technical articles (Medium, Dev.to) | Explanatory style, domain depth, opinions | High | `scrape_page()`, WebSearch |
| Conference talks/slides | How they teach, what they emphasize | High | WebSearch, transcript extraction |
| Twitter/social | Communication style, hot takes, real-time opinions | Medium | `scrape_page()` |
| Podcast interviews | Unfiltered opinions, workflow details | Medium | WebSearch |
| Papers/research | Domain depth, reference canon | Medium | Direct URL access |
| Stack Overflow answers | Problem-solving approach, communication with peers | Lower | WebSearch |

## Research Depth Levels

### L1 — Quick Scan
- Profile pages only
- Top 5 search results
- Pinned repos and README
- Use when: quick exploration, validating if someone is worth deeper research

### L2 — Standard (Default)
- Full blog crawl (30 pages)
- Deep GitHub analysis (10 repos, commit patterns)
- 15 search results + top 5 scraped
- Use when: generating a usable persona skill, typical cases

### L3 — Exhaustive
- 80+ page blog crawl
- 25+ GitHub repos analyzed
- 30+ search results + deep scraping
- Use when: high-stakes emulation, writing a definitive skill

## Research Dimensions

For each target, cover these dimensions:

1. **Code Patterns**: What languages? What architectural preferences? How do they structure code?
2. **Review Patterns**: What do they flag in PR reviews? What's their testing philosophy?
3. **Decision Frameworks**: How do they choose between options? What trade-off frameworks do they use?
4. **Writing Style**: Formal or casual? Long-form or punchy? Favorite phrases?
5. **Gotchas**: What common mistakes do they consistently warn about?
6. **Tool Preferences**: IDE, terminal, libraries, workflows
7. **Reference Canon**: Papers, books, repos, talks they cite

## Ethical Boundaries

- Public information only — no private repos, DMs, or paid content
- Respect robots.txt and rate limits
- Do not scrape personal contact information
- Attribute all findings to specific public sources
