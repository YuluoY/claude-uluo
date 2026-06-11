---
name: spirit-forge
description: >-
  Research a target person online, capture their expertise patterns,
  decision frameworks, communication style, and domain knowledge — then
  distill everything into a working Claude Code skill that emulates that
  person. Use this skill whenever the user asks to "capture" a person,
  "clone" an expert, "emulate" someone's thinking, create a "persona
  skill", "bottle" someone's knowledge, or mentions 拘灵遣将, 人物研究,
  技能生成, 人物仿真, 专家克隆, 人格提取, 蒸馏, forge, or any request
  to research a person and turn their expertise into a reusable skill.
  Also use when the user provides a GitHub profile, blog URL, Twitter
  handle, or name and wants to turn that person's patterns into a skill.
---

# Spirit Forge (拘灵遣将)

A meta-skill that researches a target person, captures their expertise
and style, then generates a working Claude Code skill that emulates them.

## Core Principles

1. **Scripts fix the skeleton, Claude does composition**—deterministic
   Python scripts handle scraping, extraction, and generation. Claude
   orchestrates, decides what to research, and fills creative gaps.
2. **Gotchas are the highest-signal content**—the generated skill's
   gotchas section is always the most valuable and should be the richest.
3. **Progressive disclosure is essential**—deep persona knowledge goes in
   the generated skill's references/, not the main SKILL.md.
4. **Descriptions are written for the model**—the generated skill's
   frontmatter description must contain specific trigger phrases that
   cause Claude to activate it at the right time.
5. **Self-referential closure**—Spirit Forge can improve itself using
   its own Capture→Distill→Forge→Validate pipeline.

## Pipeline Overview

```
User provides target → [Capture] → [Distill] → [Forge] → [Validate] → Skill
                         ↑                                          │
                         └─────────── iterate if needed ─────────────┘
```

All heavy lifting is done by deterministic Python scripts in `scripts/`.
Claude's role is composition, edge-case research, and quality review.

## Phase 1: Capture (拘灵—Binding the Spirit)

Run the deterministic capture script:

```bash
python scripts/capture.py <target> \
  --depth L2 \
  --output-dir .spirit-forge/<name>/raw-research/
```

**Target formats accepted:**
- GitHub URL or username: `gaearon`, `github.com/D4Vinci`
- Blog URL: `https://overreacted.io/`
- Twitter handle: `@dan_abramov`
- Name + domain: `"Dan Abramov, React"`

**Depth levels:**
- `L1`: Quick scan—profile pages, top 5 search results
- `L2`: Standard (default)—full blog crawl, deep GitHub, 15 search results
- `L3`: Exhaustive—everything discoverable

After capture runs, review the output in `raw-research/`:
- `meta.json`—what was found, which sources
- `code-patterns.md`—GitHub analysis results
- `writings.md`—blog/social content
- `decisions.md`—search results and deep scraped content
- `gotchas.md`—hints for gotcha extraction

**If the capture script missed important sources**, dispatch the
[researcher agent](agents/researcher.md) to fill gaps:

> "Use the researcher agent to find additional sources for this
> target. Focus on [dimension: code/writing/decisions/gotchas].
> Write findings to .spirit-forge/<name>/raw-research/<dimension>-extra.md"

## Phase 2: Distill (炼—Refining the Spirit)

Run the deterministic distill script:

```bash
python scripts/distill.py .spirit-forge/<name>/raw-research/ \
  --output .spirit-forge/<name>/persona-profile.json
```

This extracts structured patterns from raw research:
- **Expertise domains** (ranked by evidence strength)
- **Decision heuristics** (if-then rules, trade-off frameworks)
- **Communication style** (formality, signature phrases, explanation patterns)
- **Tool preferences** (IDE, terminal, libraries, workflows)
- **Gotchas** (what they catch that others miss—the highest-signal content)
- **Reference canon** (papers, books, repos, talks cited)

**User review gate:** Present the persona-profile to the user:
- Summarize what was found for each dimension
- Flag any confidence gaps (e.g., "only 2 gotchas found, need more source material")
- Ask: "Does this capture the essence? Any dimensions I missed?"

If the user says no, go back to Capture with adjusted focus.

## Phase 3: Forge (遣将—Deploying the General)

Run the deterministic forge script:

```bash
python scripts/forge.py .spirit-forge/<name>/persona-profile.json \
  --skill-name <desired-identifier> \
  --output-dir <target-path>
```

This generates a complete skill directory:
```
<output-dir>/
├── SKILL.md                          # Main instruction file
├── references/
│   ├── domain-knowledge.md            # Deep expertise content
│   ├── communication-guide.md         # Style markers, tone guidance
│   └── tool-preferences.md            # Tool and workflow preferences
└── .claude-plugin/
    └── plugin.json                    # Plugin wrapper for installation
```

The generated SKILL.md follows all Anthropic best practices:
- Frontmatter description written for the model (not marketing copy)
- Core principles paired with rationale
- Gotchas section is the richest part of the skill
- Progressive disclosure via references/ table

## Phase 4: Validate (验—Testing the Forged Spirit)

Run the deterministic validate script:

```bash
python scripts/validate.py <generated-skill-dir> \
  --persona-profile .spirit-forge/<name>/persona-profile.json
```

This checks:
- Frontmatter completeness (name, description)
- Gotcha count ≥ 5
- SKILL.md under 500 lines
- references/ directory has ≥ 2 files
- .claude-plugin/plugin.json present
- Optional: fidelity comparison with source profile

If validation fails, dispatch the [reviewer agent](agents/reviewer.md) for
qualitative assessment and iterate on the weakest dimension.

## Workspace Convention

All outputs go to `.spirit-forge/<persona-name>/`:
```
.spirit-forge/<persona-name>/
├── raw-research/          # Phase 1 output
│   ├── meta.json
│   ├── code-patterns.md
│   ├── writings.md
│   ├── decisions.md
│   └── gotchas.md
├── persona-profile.json    # Phase 2 output
├── generated-skill/        # Phase 3 output
│   ├── SKILL.md
│   ├── references/
│   └── .claude-plugin/
└── validation-report.md    # Phase 4 (optional)
```

## Setup

First-time setup installs dependencies:

```bash
pip install -r requirements.txt
```

This installs [Scrapling](https://github.com/D4Vinci/Scrapling)—the adaptive
web scraping framework used by `scripts/_shared/scraper.py`.

## Self-Improvement

Spirit Forge is self-referential. To improve itself:

1. Collect usage data: what worked, what didn't, which phases needed manual intervention
2. Run Capture on itself: "research the spirit-forge skill's methodology"
3. Run Distill to extract patterns from the meta-analysis
4. Run Forge to generate improvements
5. Run Validate to verify the improvements

This is the "dogfooding loop"—Spirit Forge eating its own cooking.

## Reference Files

Load these on demand for detailed protocols:

| File | When to Load |
|------|-------------|
| [capture-protocol.md](references/capture-protocol.md) | Designing research strategy, selecting sources |
| [distill-protocol.md](references/distill-protocol.md) | Debugging poor extraction quality |
| [forge-protocol.md](references/forge-protocol.md) | Debugging generated skill quality |
| [skill-anatomy.md](references/skill-anatomy.md) | Understanding what makes a skill good |
| [source-matrix.md](references/source-matrix.md) | Deciding which sources to use for a target |

## Agents

| Agent | When to Use |
|-------|-----------|
| [researcher.md](agents/researcher.md) | Capturing sources the scripts missed |
| [reviewer.md](agents/reviewer.md) | Qualitative review of generated skill quality |
