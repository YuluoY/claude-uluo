# Eval 5: Manual Spirit-Forge Pipeline — Summary

## What We Did

Researched Dan Abramov (gaearon) across GitHub and the web, then manually created a complete Claude Code skill directory that emulates his expertise — equivalent to what the spirit-forge pipeline would produce when given a GitHub user as input.

## What Worked Well

### Research Phase
- **GitHub API was highly effective**: Searched gaearon's 58 repos (sorted by stars), analyzed his top Redux issues (by reactions), pulled his Bluesky commit history. The issue bodies were particularly valuable — they showed his actual communication style in action.
- **Blog content was rich and consistent**: overreacted.io posts provided deep insight into his mental models (useEffect, RSC, resilient components) and his teaching voice. The consistency across 8 posts made it easy to extract patterns.
- **Multi-source triangulation**: Cross-referencing blog posts with GitHub issues and podcast summaries confirmed that his written philosophy matches his real-world behavior. The "Goodbye, Clean Code" narrative pattern appears both in his blog and his GitHub RFC discussions.
- **Commit messages revealed practical patterns**: Bluesky commits showed his working style — descriptive titles, co-author credits, problem-first framing.

### Output Quality
- **Persona profile is comprehensive**: Captured voice, expertise domains, philosophy, anti-patterns, code review style, and learning philosophy from primary sources.
- **SKILL.md is actionable**: Directly usable by Claude Code. Provides mental models, DO/DON'T lists, review lens, and scenario-specific guidance.
- **Reference files have depth**: domain-knowledge.md covers hooks, RSC, Redux, and component design in detail. communication-guide.md captures voicing patterns with before/after examples.

## What Was Hard

### Technical Challenges
- **facebook/react repo search failed**: GitHub API returned 422 for the React repo (likely permission restrictions on the organization). Had to rely on blog posts and podcast summaries for React core team contributions.
- **Bluesky code search returned empty**: No code search results for gaearon in bluesky-social/social-app. Had to use commit listing instead, which only shows high-level changes.
- **Web search quality varied**: Some queries returned zero results; needed multiple reformulations. Personal/career information required piecing together from podcast show notes and Wikipedia rather than a single authoritative source.

### Content Challenges
- **Distilling philosophy without oversimplifying**: Dan's positions are nuanced ("clean code is a phase, not a destination") — capturing the precision without making the skill too long was challenging.
- **Voice emulation is inherently imperfect**: A skill description can encode patterns and examples, but the real test is whether Claude Code actually SOUNDS like Dan when using the skill. This requires iteration.
- **RSC content is evolving**: Dan's "React for Two Computers" article was from April 2025 — the RSC landscape is still settling. The skill captures mental models rather than API specifics to stay relevant.

### Structural Challenges
- **Scope decisions**: Dan's expertise covers React, Redux, build tooling, RSC, state management, and technical writing. Including all of these made the skill broad. A narrower focus might be more effective in practice.
- **Filesystem confusion**: The mkdir -p with brace expansion accidentally created persona-profile.json as a directory. Required an extra rmdir step.

## Comparison to Spirit-Forge Pipeline

A hypothetical spirit-forge pipeline would:
1. Automatically scrape GitHub repos, issues, commits, and READMEs
2. Systematically fetch blog content, podcast transcripts, and social media
3. Perform structured extraction of coding patterns, gotchas, and communication style
4. Template-based generation of SKILL.md, references, and plugin.json

Our manual process achieved the same outputs but required manual selection of which repos/issues/posts to analyze, human judgment to distinguish core patterns from incidental ones, and iterative prompt refinement to extract the right level of detail from each source.

The manual process was slower but likely produced higher-quality output because a human (or LLM acting as one) can recognize patterns that a purely automated pipeline might miss — like the connection between Dan's "Goodbye, Clean Code" narrative arc and his GitHub RFC discussion style.

## Key Findings for Skill Quality

1. **Voice matters more than knowledge**: A skill that just lists React best practices is generic. What makes this skill unique is the communication style — Socratic questioning, permission-giving endings, self-deprecating anecdotes.
2. **Mental models > API documentation**: Dan's value isn't knowing the React API (anyone can read the docs). It's the mental models he's constructed to make sense of the API. The skill prioritizes these.
3. **Anti-patterns are as important as patterns**: What Dan says NOT to do (copy props into state, lie about deps, assume singletons) is often more actionable than what he says to do.
4. **Philosophy provides coherence**: Without Dan's core philosophy ("optimize for change"), the individual patterns would feel disconnected. The philosophy is the thread that makes them a coherent whole.

## Deliverables

```
outputs/
  raw-research/
    research-notes.md       # Comprehensive research findings (8 blog posts, 10+ issues, 5 commits)
    meta.json               # Research scope, methods, sources, and timestamps
  persona-profile.json      # Structured persona: voice, expertise, philosophy, patterns
  generated-skill/
    SKILL.md                # Main skill file for Claude Code
    references/
      domain-knowledge.md   # Deep technical patterns and gotchas
      communication-guide.md # Voice patterns, response examples, tone calibration
    .claude-plugin/
      plugin.json           # Plugin metadata for distribution
  summary.md                # This file
```
