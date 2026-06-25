# Information Source Matrix

What each source type reveals about a target persona. Adapted from uluo-spec-driven
research protocol and customized for persona research.

| Source Type | Reveals | Best Tools | Depth Needed |
|-------------|---------|-----------|--------------|
| **GitHub Profile** | Code languages, project themes, bio self-description | `extract_github()` | L1 |
| **GitHub Repos** | Architecture preferences, code style, README quality, testing habits | `extract_github()`, repo readme scraping | L2 |
| **Commit Messages** | Work style, attention to detail, humor, git conventions | Commit log analysis | L2 |
| **PR Reviews** | What they flag, communication tone, thoroughness, dogmatism | PR comment scraping | L2 |
| **Personal Blog** | Deep thinking, writing style, decision rationale, teaching ability | `crawl_blog()` | L1-L2 |
| **Technical Articles** | Domain depth, explanatory style, opinions, what they consider important | `scrape_page()`, `search_person()` | L2 |
| **Twitter/X** | Communication style, hot takes, what they amplify, interaction patterns | `scrape_page()` | L2 |
| **Conference Talks** | Presentation style, key messages, humor, how they handle questions | WebSearch, transcript extraction | L3 |
| **Podcasts** | Unfiltered opinions, career philosophy, workflow details | WebSearch | L3 |
| **Papers/Research** | Intellectual depth, reference canon, methodology rigor | URL access | L3 |
| **Stack Overflow** | Problem-solving approach, communication with peers | WebSearch | L2 |
| **Reddit/HN** | Community engagement style, what they upvote/comment on | WebSearch | L3 |

## Source Reliability

| Reliability | Sources |
|-------------|---------|
| **High** (direct attribution) | Personal blog, GitHub account, verified social media |
| **Medium** (likely authentic) | Conference talks, podcast interviews, cited quotes |
| **Low** (third-party) | Articles about the person, second-hand accounts, aggregations |

## Contradiction Detection

When a source contradicts another:
1. Flag it explicitly in the persona profile
2. Note which source has higher reliability
3. Check if the contradiction is a genuine evolution (they changed their mind)
   or a performance inconsistency (they say X but do Y)
