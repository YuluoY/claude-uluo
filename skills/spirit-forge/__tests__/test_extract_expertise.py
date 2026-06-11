#!/usr/bin/env python3
"""Unit tests for distill.py expertise extraction."""

import sys, json
from pathlib import Path
_skill_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_skill_root))
from scripts.distill import _extract_expertise, _strip_markdown


def test_no_false_positive_go():
    """'go' in 'gotcha' or 'golang' should not match."""
    text = "Let clean code guide you. Then let it go. Don't overthink golang vs rust."
    result = _extract_expertise({"test": text}, text)
    domains = [r["domain"] for r in result]
    assert "go (golang)" not in domains, f"False positive 'go' found in: {domains}"
    print("  PASS: no false positive 'go'")


def test_no_false_positive_ai():
    """'ai' in 'main', 'explain', 'again' should not match."""
    text = "The main AI framework is explained again in the documentation."
    result = _extract_expertise({"test": text}, text)
    domains = [r["domain"] for r in result]
    assert "ai / llm" not in domains, f"False positive 'ai' found in: {domains}"
    print("  PASS: no false positive 'ai'")


def test_react_detected():
    """'react' should be detected."""
    text = "React is a JavaScript library for building user interfaces. React hooks changed everything."
    result = _extract_expertise({"test": text}, text)
    domains = [r["domain"] for r in result]
    assert "react" in domains, f"'react' not detected in: {domains}"
    print("  PASS: react detected")


def test_strip_markdown():
    """Markdown formatting should be stripped."""
    md = "# Heading\n**bold text** and `code`\n- list item\n[link](https://example.com)"
    clean = _strip_markdown(md)
    assert "#" not in clean, f"heading not stripped: {clean[:50]}"
    assert "**" not in clean, f"bold not stripped: {clean[:50]}"
    assert "`" not in clean, f"code not stripped: {clean[:50]}"
    assert "list item" in clean, f"list item lost: {clean[:50]}"
    assert "link" in clean, f"link text lost: {clean[:50]}"
    print("  PASS: markdown stripped")


if __name__ == "__main__":
    print("Testing expertise extraction...")
    test_no_false_positive_go()
    test_no_false_positive_ai()
    test_react_detected()
    test_strip_markdown()
    print("\nAll tests passed!")
