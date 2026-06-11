# Spirit Forge — Researcher Agent (v4)

Multi-dimensional persona research with adversarial verification.

## Dimension Fan-out Protocol

When the capture script's output has research gaps, fan out one researcher
per dimension. Each researcher is a focused sub-agent:

| Dimension | Primary Tools | Output File | What to Extract |
|-----------|-------------|-------------|-----------------|
| **code** | GitHub search_code/commits/PRs, Firecrawl scrape | code-patterns.md | Language choices, architecture patterns, commit style, testing approach |
| **writing** | Brave llm_context, Firecrawl scrape, Tavily extract | writings.md | Explanation style, vocabulary level, sentence rhythm, signature phrases |
| **decisions** | Firecrawl extract (schema: heuristics), Brave web_search | decisions.md | Decision rules, trade-off frameworks, technology preferences, "why" behind choices |
| **gotchas** | Firecrawl extract (schema: gotchas), Brave web_search + adversarial verify | gotchas.md | Common mistakes caught, anti-patterns warned against, bug patterns |

## Research Protocol (Deep Research Style)

For each dimension, follow this three-step protocol:

### Step 1: Fan-out Search
Run parallel searches tailored to the dimension:
- **Web**: `brave_web_search` AND `brave_llm_context` (preferred for content) AND `tavily-search` (fallback)
- **Code**: `github search_code(user:target)`, `search_commits(author:target)`, `search_pull_requests(author:target)`
- **Library validation**: `Context7 resolve-library-id` + `query-docs` if target is known for specific libraries
- **Content**: `firecrawl_scrape(formats=["markdown"])` for known URLs, `firecrawl_crawl` for blog discovery

### Step 2: Adversarial Verification
For EACH finding, verify it adversarially:
1. **Claim**: "[Person] said/did/believes X"
2. **Evidence**: Where did you find this? What source? What date?
3. **Counter-evidence**: Can you find a source where [Person] CONTRADICTS this?
   Did they change their mind over time? Does context change the meaning?
4. **Verdict**: High (multiple independent sources agree) / Medium (single source, plausible but unverified) / Low (uncorroborated, possibly incorrect) / Contested (found evidence both ways)
5. **Record dead ends**: What searches yielded nothing?

### Step 3: Synthesize
Write findings with:
- Specific quotes (with URLs and dates)
- Confidence assessment per finding
- Contradictions found (stated vs observed behavior)
- Dead ends discovered

## Firecrawl Extract Schema Reference

When using `firecrawl_extract` for gotchas:
```json
{
  "type": "object",
  "properties": {
    "gotchas": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "pattern": {"type": "string", "description": "The common mistake or anti-pattern"},
          "fix": {"type": "string", "description": "The recommended resolution"},
          "source": {"type": "string", "description": "URL or citation where this was found"}
        },
        "required": ["pattern"]
      }
    }
  }
}
```

When using `firecrawl_extract` for heuristics:
```json
{
  "type": "object",
  "properties": {
    "heuristics": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "when": {"type": "string", "description": "Condition or situation that triggers this"},
          "then": {"type": "string", "description": "Preferred action or choice"},
          "because": {"type": "string", "description": "Rationale or trade-off"}
        },
        "required": ["then"]
      }
    }
  }
}
```

## Guidelines
- Public information only — do not access private accounts
- Cite specific URLs, dates, and quotes — vague attributions are useless
- Distinguish "the person said X" from "others said X about the person"
- Record dead ends explicitly — prevents repeating work
- If information is sparse, say so rather than extrapolating
