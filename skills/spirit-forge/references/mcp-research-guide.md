# MCP-Enhanced Research Guide

**用途**：当 MCP 工具可用时，用结构化提取增强 raw-research/ 数据质量。这些工具在 AGENT 层操作（非 Python 脚本），补充而非替代确定性脚本。

## Firecrawl Extract（最高优先级——结构化提取）

Use `firecrawl_extract` on the top 5 search result URLs with this JSON schema:

```json
{
  "type": "object",
  "properties": {
    "gotchas": {
      "type": "array", "items": {
        "type": "object", "properties": {
          "pattern": {"type": "string"}, "fix": {"type": "string"}
        }
      }
    },
    "heuristics": {
      "type": "array", "items": {
        "type": "object", "properties": {
          "when": {"type": "string"}, "then": {"type": "string"}, "because": {"type": "string"}
        }
      }
    }
  }
}
```

Write results to `raw-research/firecrawl-gotchas.json` and `firecrawl-heuristics.json`. `distill.py` will automatically ingest these files — no regex needed.

## Brave LLM Context（批量内容检索）

Use `brave_llm_context` to fetch multi-article content blocks in a single call. Better than page-by-page scraping for blog-heavy targets. Write results to `raw-research/brave-content.md`.

## GitHub MCP（深度代码分析）

For developer targets, use:
- `search_code(user=target)` → code patterns
- `search_commits(author=target)` → commit message style
- `search_pull_requests(author=target)` → PR review tone

Write results to `raw-research/github-deep.md`.

## Firecrawl Crawl（博客发现）

For blog-heavy targets, use `firecrawl_crawl(limit=50, maxDiscoveryDepth=3)` instead of the Python BFS crawler. Handles rate limiting automatically.

## Fallback

If any MCP tool is unavailable, the Python scripts (`capture.py` with Scrapling + requests + BeautifulSoup) handle everything independently.
