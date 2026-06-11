# Skill Anatomy — Patterns for High-Quality Skills

Reference extracted from the skill-creator skill and Anthropic's own lessons document.

## The 10 Principles

1. **Description writes the trigger** — Write descriptions for the model, not humans.
   Include specific trigger phrases, domain keywords, and "pushy" language.

2. **Gotchas are highest signal** — The gotchas section of any skill is the most valuable
   content per byte. Build it up over time from Claude's actual failure modes.

3. **Progressive disclosure in 3 levels**:
   - Level 1 (always): Just the frontmatter name + description (~100 words)
   - Level 2 (on trigger): SKILL.md body (<500 lines)
   - Level 3 (on demand): References/, scripts/, agents/

4. **Scripts fix the skeleton** — Deterministic scripts raise the quality floor.
   Claude composes and calls scripts; it doesn't reconstruct from scratch.

5. **Don't state the obvious** — Claude already knows how to code and can read the
   codebase. A skill that restates defaults adds context without adding value.

6. **Avoid railroading** — Give Claude the information it needs, but flexibility to
   adapt to the situation. Overly rigid constraints reduce usefulness.

7. **Think through setup** — Some skills need configuration. Use config.json in the
   skill directory. If config is missing, prompt the user.

8. **Help Claude remember** — Append-only log files, JSON state, or SQLite let the
   model build persistent awareness across sessions.

9. **File system as context engineering** — Think of the entire skill directory as
   context management. Tell Claude what files exist and when to read them.

10. **One skill, one purpose** — Skills that try to do too much confuse the agent.
    If it straddles multiple categories, split it.

## Common Failure Modes

| Failure | Fix |
|---------|-----|
| Undertriggering (skill never activates) | Make description more "pushy"; add trigger phrases |
| Overtriggering (skill activates too often) | Narrow description scope; add exclusion phrases |
| Boilerplate skill (restates defaults) | Remove anything Claude would do by default |
| Missing gotchas (skill doesn't catch issues) | Add gotchas from real usage; update after each session |
| Overly prescriptive (skill is too rigid) | Replace "ALWAYS" rules with rationale-based guidance |
| Context overload (skill is too long) | Move detailed content to references/ |
