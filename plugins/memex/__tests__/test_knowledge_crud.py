"""F1: 知识创建与检索 —— 存进去能查出来"""
import pytest
from db_ops import insert_knowledge_node, search_knowledge, top_knowledge, stats


@pytest.mark.parametrize("query,should_find", [
    ("viewBox", True),
    ("useEffect", True),
    ("SVG", True),
    ("量子计算机蒙特卡洛模拟", False),
])
def test_search_by_keyword(db, query, should_find):
    results = search_knowledge(db, query, 10)
    if should_find:
        assert len(results) > 0, f"query '{query}' returned no results"
    else:
        assert len(results) == 0, f"query '{query}' should return empty"


def test_search_returns_empty_list_not_error(db):
    results = search_knowledge(db, 'nonexistent_xyz_12345', 10)
    assert isinstance(results, list)


def test_create_with_special_characters(db):
    lid = insert_knowledge_node(db, {
        "title": "测试 <>&\"' 特殊字符 escaping",
        "category_path": "testing",
        "key_takeaway": "escaping test"
    })
    assert lid > 0
    results = search_knowledge(db, '特殊字符', 5)
    assert len(results) > 0


def test_create_very_long_title(db):
    lid = insert_knowledge_node(db, {
        "title": "这是一个非常长的标题用来测试数据库的边界条件" * 20,
        "category_path": "testing",
        "key_takeaway": "boundary"
    })
    assert lid > 0


def test_top_knowledge_returns_sorted(db):
    results = top_knowledge(db, 5)
    assert len(results) > 0
    # 按 conservative_score 降序
    for i in range(len(results) - 1):
        cs_curr = results[i].get('trueskill_mu', 25) - 2 * results[i].get('trueskill_sigma', 8.3)
        cs_next = results[i+1].get('trueskill_mu', 25) - 2 * results[i+1].get('trueskill_sigma', 8.3)
        assert cs_curr >= cs_next - 0.1, f"not sorted: {cs_curr} < {cs_next}"


def test_stats_returns_counts(db):
    s = stats(db)
    assert s['knowledge_nodes'] >= 5
    assert s['incidents'] >= 3
    assert isinstance(s['edges'], int)
