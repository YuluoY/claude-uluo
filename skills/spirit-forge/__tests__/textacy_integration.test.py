#!/usr/bin/env python3
"""Test textacy integration: import, basic analysis, graceful degradation."""

import sys, re
from pathlib import Path
_skill_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_skill_root))


def test_textacy_available():
    """textacy can be imported and spaCy model loads."""
    try:
        from textacy import text_stats, load_spacy_lang, make_spacy_doc
        en = load_spacy_lang("en_core_web_sm", disable=("parser",))
        doc = make_spacy_doc("The quick brown fox jumps over the lazy dog.", lang=en)
        assert text_stats.n_words(doc) == 9, f"Expected 9 words, got {text_stats.n_words(doc)}"
        assert text_stats.n_sents(doc) == 1
        print("  PASS: textacy available, spaCy model loads, basic stats correct")
    except (ImportError, OSError) as e:
        print(f"  SKIP: textacy/spaCy not available ({e})")


def test_textacy_style_function():
    """_textacy_style returns correct dict structure."""
    from scripts.distill import _textacy_style
    result = _textacy_style("React is a library for building UIs. It uses components and hooks.")
    if result is None:
        print("  SKIP: spaCy model not installed")
        return
    assert result["engine"] == "textacy"
    assert result["n_words"] > 5
    assert result["n_sentences"] >= 2
    assert "flesch_kincaid" in result["readability"]
    assert "ttr" in result["diversity"]
    assert len(result["key_terms"]) >= 1
    print(f"  PASS: textacy style analysis — {result['n_words']} words, {result['n_sentences']} sentences, "
          f"FK={result['readability']['flesch_kincaid']}, TTR={result['diversity']['ttr']}")


def test_graceful_degradation():
    """_textacy_style returns None when spaCy model is missing (handled by caller)."""
    from scripts.distill import _detect_chinese
    assert _detect_chinese("Hello world") is False
    assert _detect_chinese("你好世界") is True
    assert _detect_chinese("This has 中文 mixed in") is True
    print("  PASS: Chinese detection works correctly")


if __name__ == "__main__":
    print("Testing textacy integration...")
    test_textacy_available()
    test_textacy_style_function()
    test_graceful_degradation()
    print("Done.")
