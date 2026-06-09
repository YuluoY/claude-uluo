"""F4: 知识图谱 —— 节点和关系构建"""
import pytest
from knowledge_graph import build_graph, graph_stats, pagerank_rank
from db_ops import insert_edge


class TestGraphConstruction:
    def test_non_empty_graph(self, db):
        G = build_graph(db)
        assert G is not None and G.number_of_nodes() > 0

    def test_stats_reflects_seed_data(self, db):
        s = graph_stats(db)
        assert s['knowledge_nodes'] >= 5, str(s)
        assert s['edges'] >= 2, str(s)

    def test_pagerank_returns_knowledge_nodes(self, db):
        r = pagerank_rank(db, 5)
        assert len(r) > 0
        for node in r:
            assert 'pagerank' in node
            assert 'title' in node

    def test_new_edge_reflected_in_stats(self, db, seed_ids):
        before = graph_stats(db)['edges']
        insert_edge(db, 'knowledge_node', seed_ids[2], 'knowledge_node',
                     seed_ids[3], 'COMPOSES', 1.0)
        after = graph_stats(db)['edges']
        assert after > before


def test_duplicate_edge_not_inserted(db):
    import sqlite3
    conn = sqlite3.connect(db)
    for _ in range(3):
        conn.execute(
            "INSERT OR IGNORE INTO edges (source_type,source_id,target_type,target_id,relation) VALUES (?,?,?,?,?)",
            ('knowledge_node', 999, 'knowledge_node', 998, 'RELATED_TO'))
    conn.commit()
    cnt = conn.execute(
        "SELECT COUNT(*) FROM edges WHERE source_id=999 AND target_id=998").fetchone()[0]
    conn.close()
    assert cnt <= 1
