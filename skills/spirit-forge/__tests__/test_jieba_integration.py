#!/usr/bin/env python3
"""Test jieba Chinese word segmentation and routing."""

import sys
from pathlib import Path
_skill_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_skill_root))


def test_jieba_basic():
    """jieba correctly segments Chinese text."""
    try:
        import jieba
        words = jieba.lcut("路遥是中国著名的现实主义作家")
        assert len(words) >= 4, f"Expected >=4 words, got {len(words)}: {words}"
        assert "路遥" in words
        print(f"  PASS: jieba segmented into {len(words)} words: {words}")
    except ImportError:
        print("  SKIP: jieba not installed")


def test_jieba_style_function():
    """_jieba_style returns correct dict structure."""
    from scripts.distill import _jieba_style
    result = _jieba_style("平凡的世界是一部描写中国农村生活的长篇小说")
    assert result["engine"] == "jieba" or result["engine"] == "fallback"
    if result["engine"] == "jieba":
        assert result["word_count"] > 0
        assert result["unique_words"] > 0
        assert 0 < result["ttr"] <= 1.0
        print(f"  PASS: jieba analysis — {result['word_count']} words, TTR={result['ttr']}")
    else:
        print(f"  SKIP: {result.get('error', 'unknown')}")


def test_chinese_routing():
    """_detect_chinese correctly routes mixed content."""
    from scripts.distill import _detect_chinese
    assert not _detect_chinese("def hello(): return 'world'")
    assert _detect_chinese("我们平凡的世界")
    assert _detect_chinese("This is English but has 中文 too")
    # Edge: CJK punctuation
    assert _detect_chinese("你好。世界！")
    print("  PASS: Chinese routing: en=False, zh=True, mixed=True, punct=True")


if __name__ == "__main__":
    print("Testing jieba integration...")
    test_jieba_basic()
    test_jieba_style_function()
    test_chinese_routing()
    print("Done.")
