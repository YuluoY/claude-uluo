# Distill Protocol (炼)

How to extract structured patterns from raw persona research.

## From Raw to Structured

The distiller reads raw-research/ and produces persona-profile.json. Each extraction
dimension has specific heuristics.

## Expertise Domains

- Count domain keyword frequency in research text
- Rank by evidence strength, not just frequency
- Minimum 2 independent sources for "expert" level
- One mention = "familiar" at best
- Handle the generalist problem: if 10+ domains are detected, rank and keep top 5

## Decision Heuristics

Look for these linguistic patterns:
- "When X, I prefer Y because Z" → conditional heuristic
- "Always/never X" → absolute rule
- "Rule of thumb: X" → heuristic
- "In my experience, X because Y" → experiential pattern
- "I've found that X" → learned pattern
- "The key insight is X" → principle

## Communication Style

- Formality: count informal signals (contractions, exclamation marks, emojis) vs formal signals (therefore, however, consequently)
- Signature phrases: extract 2-4 word ngrams appearing 3+ times
- Explanation style:
  - "For example" / "e.g." → example-first
  - "Because" / "the reason" → first-principles
  - "Think of it as" / "Imagine" → analogy-driven
- Sentence patterns: average words per sentence (short <10, balanced 10-25, long >25)

## Gotchas (Highest Signal Content)

Gotchas are the most valuable extracted content. Search aggressively:

1. Explicit markers: "gotcha", "watch out", "beware", "trap", "pitfall", "footgun", "common mistake"
2. Warning patterns: "don't X because Y", "never X", "avoid X"
3. Correction patterns: "people often get X wrong", "most developers miss X"
4. Insight patterns: "the trick is X", "the key is X", "the secret is X"

A good gotcha extraction has:
- Specific pattern descriptions (not vague)
- Actionable fixes (not just "be careful")
- Source attribution (where was this found?)

## Quality Gates

- Every expertise claim backed by at least one specific source
- At least 3 distinct decision heuristics extracted
- At least 5 gotchas (aim for 10+)
- Style markers include specific phrase examples
- Any dimension with zero evidence must be explicitly marked "insufficient data"
- Contradictions between stated philosophy and observed behavior must be flagged
