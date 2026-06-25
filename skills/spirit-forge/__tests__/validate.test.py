#!/usr/bin/env python3
"""Unit tests for validate.py."""

import sys, json, tempfile, os
from pathlib import Path
_skill_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_skill_root))
from scripts.validate import validate


def test_yaml_fold_scalar_description():
    """YAML fold scalar ( >- ) should not cause false negative on description check."""
    # Create a minimal skill dir with fold-scalar description
    with tempfile.TemporaryDirectory() as tmp:
        skill_dir = Path(tmp) / "test-skill"
        skill_dir.mkdir()
        refs_dir = skill_dir / "references"
        refs_dir.mkdir(parents=True)
        plugin_dir = skill_dir / ".claude-plugin"
        plugin_dir.mkdir()

        # Write SKILL.md with fold scalar
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text("""---
name: test
description: >-
  This is a multi-line description that should be counted correctly
  even though it spans multiple lines with a YAML fold scalar.
  It contains trigger phrases like emulate and person and skill.
---

# Test Skill

## Gotchas & Anti-Patterns
### 1. First gotcha pattern with specific details about what goes wrong
### 2. Second gotcha with another common mistake developers make
### 3. Third pattern that people often overlook in production
### 4. Fourth gotcha about configuration edge cases
### 5. Fifth gotcha about performance implications
""")

        # Write reference files
        (refs_dir / "domain-knowledge.md").write_text("# Domain Knowledge")
        (refs_dir / "communication-guide.md").write_text("# Communication Guide")

        # Write plugin.json
        (plugin_dir / "plugin.json").write_text('{"name":"test","version":"0.1.0"}')

        report = validate(str(skill_dir))
        assert report["failed"] == 0, f"Expected 0 failures, got {report['failed']}: {report['checks']}"
        print("  PASS: YAML fold scalar correctly validates")


def test_insufficient_gotchas():
    """Skill with <5 gotchas should fail the gotcha check."""
    with tempfile.TemporaryDirectory() as tmp:
        skill_dir = Path(tmp) / "test-skill"
        skill_dir.mkdir()
        refs_dir = skill_dir / "references"
        refs_dir.mkdir(parents=True)
        plugin_dir = skill_dir / ".claude-plugin"
        plugin_dir.mkdir()

        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text("""---
name: test
description: A test skill with too few gotchas
---

# Test

## Gotchas & Anti-Patterns
### 1. Only one gotcha here
""")
        (refs_dir / "domain-knowledge.md").write_text("# Domain")
        (refs_dir / "communication-guide.md").write_text("# Comm")
        (plugin_dir / "plugin.json").write_text('{}')

        report = validate(str(skill_dir))
        gotcha_check = [c for c in report["checks"] if "gotchas" in c["label"].lower() and "≥5" in c["label"]]
        assert gotcha_check, "Gotcha count check not found"
        assert not gotcha_check[0]["passed"], "Expected <5 gotchas to fail but it passed"
        print("  PASS: insufficient gotchas correctly detected")


if __name__ == "__main__":
    print("Testing validate.py...")
    test_yaml_fold_scalar_description()
    test_insufficient_gotchas()
    print("\nAll tests passed!")
