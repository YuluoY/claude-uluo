# Forge Protocol (遣将)

How to generate a working Claude Code SKILL.md from a persona profile.

## Generation Rules

### Frontmatter

- **name**: kebab-case, derived from persona name + domain (e.g., "dan-abramov-react")
- **description**: Written for the MODEL to decide when to trigger:
  - Include specific domain triggers
  - Include both English and Chinese keywords
  - Make it "pushy" enough to actually trigger in relevant conversations
  - Include trigger verbs: "emulate", "think like", "review", "debug", "write", "design"
  - Mention the persona by name so users can invoke by name

### Body Structure

Priority order (most important first):

1. **Core Principles** — The persona's guiding philosophy, mapped as Claude instructions.
   Each principle should be paired with a rationale (the "because").

2. **Workflow Protocol** — How the persona approaches their domain. Step-by-step.
   Use specific tool names and patterns the persona uses.

3. **Gotchas & Anti-Patterns** — THE HIGHEST SIGNAL SECTION.
   This should be the longest, most specific part of SKILL.md.
   Each gotcha gets its own `### N.` heading with a descriptive title.
   Include both the pattern AND the fix.

4. **Reference Pointers** — A table showing what's in references/ and when to load it.
   This enables progressive disclosure.

5. **Communication Style** — Brief inline summary of tone, formality, signature markers.
   Details go to references/communication-guide.md.

### Anti-Patterns to Avoid

- Don't restate what Claude already knows (from the lessons doc: "Don't state the obvious")
- Don't railroad Claude — give information, not rigid constraints
- Don't make the skill a biography — it should be an actionable instruction set
- Don't forget the description is for the model, not for marketing

## Reference File Generation

- **domain-knowledge.md**: Deep expertise content organized by domain
- **communication-guide.md**: Full style markers, phrase catalog, tone guidance
- **tool-preferences.md**: Specific tools, workflows, config preferences

## Progressive Disclosure

- SKILL.md main body: <500 lines (Level 2 — loaded on trigger)
- Reference files: unlimited (Level 3 — loaded on demand)
- Script files: deterministic, not loaded into context (executed, not read)
