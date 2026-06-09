"""F8: 知识作用域"""
import sqlite3


def test_personal_scope_exists(db):
    conn = sqlite3.connect(db)
    r = conn.execute("SELECT COUNT(*) FROM knowledge_nodes WHERE scope='personal'").fetchone()[0]
    conn.close()
    assert r >= 1


def test_team_scope_exists(db):
    conn = sqlite3.connect(db)
    r = conn.execute("SELECT COUNT(*) FROM knowledge_nodes WHERE scope='team'").fetchone()[0]
    conn.close()
    assert r >= 1


def test_universal_scope_exists(db):
    conn = sqlite3.connect(db)
    r = conn.execute("SELECT COUNT(*) FROM knowledge_nodes WHERE scope='universal'").fetchone()[0]
    conn.close()
    assert r >= 1


def test_multiple_scopes_in_same_category(db):
    conn = sqlite3.connect(db)
    r = conn.execute(
        "SELECT COUNT(DISTINCT scope) FROM knowledge_nodes WHERE category_path='data/state/race'"
    ).fetchone()[0]
    conn.close()
    assert r >= 2, f"expected >=2 scopes in data/state/race, got {r}"
