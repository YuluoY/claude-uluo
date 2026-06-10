"""
Memex Database Operations — CRUD + FTS5 搜索 + TrueSkill 排序
"""

import json
import sqlite3
from db_schema import get_conn


def search_knowledge(db_path: str, query: str, limit: int = 10) -> list[dict]:
    """FTS5 全文搜索 + TrueSkill 排序"""
    conn = get_conn(db_path)
    rows = conn.execute(
        """SELECT k.id, k.title, k.category_path, k.key_takeaway,
                  k.trueskill_mu, k.trueskill_sigma, k.scope, k.occurrence_count,
                  (k.trueskill_mu - 2*k.trueskill_sigma) as conservative_score
           FROM knowledge_fts f
           JOIN knowledge_nodes k ON f.rowid = k.id
           WHERE knowledge_fts MATCH ?
           ORDER BY conservative_score DESC
           LIMIT ?""",
        (query, limit)
    ).fetchall()

    return [_row_to_dict(row, ["id","title","category_path","key_takeaway","trueskill_mu","trueskill_sigma","scope","occurrence_count","conservative_score"]) for row in rows]


def top_knowledge(db_path: str, limit: int = 15) -> list[dict]:
    """Top N 按 TrueSkill 保守估计排序"""
    conn = get_conn(db_path)
    rows = conn.execute(
        "SELECT id, title, category_path, key_takeaway, trueskill_mu, trueskill_sigma, scope, occurrence_count FROM knowledge_nodes ORDER BY (trueskill_mu - 2*trueskill_sigma) DESC LIMIT ?",
        (limit,)
    ).fetchall()
    return [_row_to_dict(row, ["id","title","category_path","key_takeaway","trueskill_mu","trueskill_sigma","scope","occurrence_count"]) for row in rows]


def top_knowledge_for_project(db_path: str, cwd: str, limit: int = 15) -> list[dict]:
    """按项目过滤的 Top N 知识检索。

    优先返回当前项目的知识（source_projects 中包含 cwd 的），
    不足 limit 时用全局高分知识补齐。混合输出：项目知识在前，全局知识在后。
    """
    conn = get_conn(db_path)
    search_term = f'%{cwd}%'

    # 1. 查询本项目匹配的知识
    project_rows = conn.execute(
        """SELECT k.id, k.title, k.category_path, k.key_takeaway,
                  k.trueskill_mu, k.trueskill_sigma, k.scope, k.occurrence_count,
                  (k.trueskill_mu - 2*k.trueskill_sigma) as conservative_score
           FROM knowledge_nodes k
           WHERE k.source_projects LIKE ?
           ORDER BY conservative_score DESC
           LIMIT ?""",
        (search_term, limit)
    ).fetchall()

    project_ids = {row[0] for row in project_rows}
    project_result = [_row_to_dict(row, ["id","title","category_path","key_takeaway","trueskill_mu","trueskill_sigma","scope","occurrence_count","conservative_score"]) for row in project_rows]

    # 2. 如果项目知识不足，用全局知识补齐
    remaining = limit - len(project_result)
    if remaining > 0:
        exclude_clause = f"AND k.id NOT IN ({','.join('?' * len(project_ids))})" if project_ids else ""
        params = list(project_ids) + [remaining]
        global_rows = conn.execute(
            f"""SELECT k.id, k.title, k.category_path, k.key_takeaway,
                       k.trueskill_mu, k.trueskill_sigma, k.scope, k.occurrence_count,
                       (k.trueskill_mu - 2*k.trueskill_sigma) as conservative_score
                FROM knowledge_nodes k
                WHERE 1=1 {exclude_clause}
                ORDER BY conservative_score DESC
                LIMIT ?""",
            tuple(params)
        ).fetchall()
        global_result = [_row_to_dict(row, ["id","title","category_path","key_takeaway","trueskill_mu","trueskill_sigma","scope","occurrence_count","conservative_score"]) for row in global_rows]
    else:
        global_result = []

    return project_result + global_result


def insert_knowledge_node(db_path: str, data: dict) -> int:
    conn = get_conn(db_path)
    source_projects = data.get("source_projects", [])
    if isinstance(source_projects, list):
        source_projects = json.dumps(source_projects)
    cur = conn.execute(
        """INSERT INTO knowledge_nodes (title, scope, abstraction_level, category_path, problem_statement, root_cause, solution_text, key_takeaway, causal_chain, preconditions, source_incidents, source_projects)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (data.get("title",""), data.get("scope","personal"), data.get("abstraction_level","pattern"),
         data.get("category_path",""), data.get("problem_statement",""), data.get("root_cause",""),
         data.get("solution_text",""), data.get("key_takeaway",""),
         data.get("causal_chain","[]"), data.get("preconditions","[]"),
         data.get("source_incidents","[]"), source_projects)
    )
    lid = cur.lastrowid
    conn.commit()
    conn.close()
    return lid


def insert_incident(db_path: str, data: dict) -> int:
    conn = get_conn(db_path)
    cur = conn.execute(
        """INSERT INTO incidents (problem_statement, context_project, context_framework, context_files, symptoms, attempts, solution_description, solution_code_snippet, verification_type, verification_evidence, sentiment_score, category_path, tags, source, is_historical, triggered_by, confidence, git_commit_hash)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (data.get("problem_statement",""), data.get("context_project",""), data.get("context_framework",""),
         data.get("context_files","[]"), data.get("symptoms","[]"), data.get("attempts","[]"),
         data.get("solution_description",""), data.get("solution_code_snippet",""),
         data.get("verification_type",""), data.get("verification_evidence",""),
         data.get("sentiment_score",0.0), data.get("category_path",""), data.get("tags",""),
         data.get("source","realtime"), data.get("is_historical",0),
         data.get("triggered_by",None), data.get("confidence",1.0), data.get("git_commit_hash",""))
    )
    lid = cur.lastrowid
    conn.commit()
    conn.close()
    return lid


def insert_signal(db_path: str, data: dict) -> int:
    conn = get_conn(db_path)
    cur = conn.execute(
        "INSERT INTO signals (incident_id, knowledge_node_id, signal_type, intensity, sentiment_score, emotion_type, source_text) VALUES (?,?,?,?,?,?,?)",
        (data.get("incident_id"), data.get("knowledge_node_id"), data.get("signal_type",""),
         data.get("intensity",0.5), data.get("sentiment_score",0.5), data.get("emotion_type",""),
         data.get("source_text",""))
    )
    lid = cur.lastrowid
    conn.commit()
    conn.close()
    return lid


def insert_edge(db_path: str, source_type: str, source_id: int, target_type: str, target_id: int, relation: str, weight: float = 1.0, metadata: str = "{}") -> int:
    conn = get_conn(db_path)
    cur = conn.execute(
        "INSERT OR IGNORE INTO edges (source_type, source_id, target_type, target_id, relation, weight, metadata) VALUES (?,?,?,?,?,?,?)",
        (source_type, source_id, target_type, target_id, relation, weight, metadata)
    )
    lid = cur.lastrowid
    conn.commit()
    conn.close()
    return lid


def get_recent_incidents(db_path: str, limit: int = 5) -> list[dict]:
    conn = get_conn(db_path)
    rows = conn.execute(
        "SELECT id, problem_statement, category_path, verification_type, sentiment_score, created_at FROM incidents ORDER BY created_at DESC LIMIT ?",
        (limit,)
    ).fetchall()
    cols = ["id","problem_statement","category_path","verification_type","sentiment_score","created_at"]
    return [_row_to_dict(row, cols) for row in rows]


def stats(db_path: str) -> dict:
    conn = get_conn(db_path)
    return {
        "knowledge_nodes": conn.execute("SELECT COUNT(*) FROM knowledge_nodes").fetchone()[0],
        "incidents": conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0],
        "edges": conn.execute("SELECT COUNT(*) FROM edges").fetchone()[0],
        "signals": conn.execute("SELECT COUNT(*) FROM signals").fetchone()[0],
        "categories": conn.execute("SELECT COUNT(*) FROM categories").fetchone()[0],
    }


def _row_to_dict(row: tuple, cols: list[str]) -> dict:
    return dict(zip(cols, row))


if __name__ == "__main__":
    import sys
    db = sys.argv[1] if len(sys.argv) > 1 else "memex.db"
    from db_schema import init_db
    init_db(db)
    print(stats(db))
