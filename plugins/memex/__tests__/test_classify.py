"""F9: 自动分类"""
import pytest
from hierarchy import classify_auto


@pytest.mark.parametrize("text,keywords,expected_in", [
    ("ReactFlow edge disappears after zoom", ["ReactFlow", "edge", "zoom"], "coordinate"),
    ("useEffect cleanup race condition in React", [], "race"),
    ("memory leak in production needs root cause analysis", [], "debugging"),
    ("webpack build config optimization", [], "build"),
])
def test_classify_matches_category(text, keywords, expected_in):
    r = classify_auto(text, keywords)
    assert expected_in in r or 'rendering' in r or 'methodology' in r or 'tooling' in r or 'data' in r


def test_classify_fallback():
    r = classify_auto("some random text without any specific pattern", [])
    assert r == 'methodology/workflow'
