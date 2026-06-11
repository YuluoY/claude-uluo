# Extraction Tasks for Claude

Persona: 路遥, 作家

## Task 1: Gotcha Extraction

Read all .md files in raw-research/. Identify patterns this person consistently catches that others miss. For each: describe the common mistake (pattern) and the correct approach (fix). Aim for 5-15 gotchas.

**Output field**: `gotchas`

**Output format**:
```json
[{"pattern": "...", "fix": "...", "source": "claude-extraction"}, ...]
```

Write results to the `gotchas` array in persona-profile.json.

---

## Task 2: Heuristic Extraction

Read all .md files in raw-research/. Extract decision rules, principles, and patterns of thinking. For each: what condition triggers this response? What's the preferred action? Why? Aim for 5-10 heuristics.

**Output field**: `heuristics`

**Output format**:
```json
[{"when": "...", "then": "...", "because": "...", "source": "claude-extraction"}, ...]
```

Write results to the `heuristics` array in persona-profile.json.

---

