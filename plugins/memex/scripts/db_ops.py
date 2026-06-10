"""
Memex Database Operations — CRUD + FTS5 搜索 + TrueSkill 排序
"""

import json
import sqlite3
from db_schema import get_conn


def search_knowledge(db_path: str, query: str, limit: int = 10) -> list[dict]:
    """FTS5 全文搜索 + TrueSkill 排序（自动过滤已删除）"""
    if not query or not query.strip():
        return []
    conn = get_conn(db_path)
    rows = conn.execute(
        """SELECT k.id, k.title, k.category_path, k.key_takeaway,
                  k.trueskill_mu, k.trueskill_sigma, k.scope, k.occurrence_count,
                  (k.trueskill_mu - 2*k.trueskill_sigma) as conservative_score
           FROM knowledge_fts f
           JOIN knowledge_nodes k ON f.rowid = k.id
           WHERE knowledge_fts MATCH ? AND k.scope != 'deleted'
           ORDER BY conservative_score DESC
           LIMIT ?""",
        (query, limit)
    ).fetchall()

    return [_row_to_dict(row, ["id","title","category_path","key_takeaway","trueskill_mu","trueskill_sigma","scope","occurrence_count","conservative_score"]) for row in rows]


def top_knowledge(db_path: str, limit: int = 15) -> list[dict]:
    """Top N 按 TrueSkill 保守估计排序（自动过滤已删除）"""
    conn = get_conn(db_path)
    rows = conn.execute(
        "SELECT id, title, category_path, key_takeaway, trueskill_mu, trueskill_sigma, scope, occurrence_count "
        "FROM knowledge_nodes WHERE scope != 'deleted' "
        "ORDER BY (trueskill_mu - 2*trueskill_sigma) DESC LIMIT ?",
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
           WHERE k.source_projects LIKE ? AND k.scope != 'deleted'
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
                WHERE k.scope != 'deleted' {exclude_clause}
                ORDER BY conservative_score DESC
                LIMIT ?""",
            tuple(params)
        ).fetchall()
        global_result = [_row_to_dict(row, ["id","title","category_path","key_takeaway","trueskill_mu","trueskill_sigma","scope","occurrence_count","conservative_score"]) for row in global_rows]
    else:
        global_result = []

    return project_result + global_result


def insert_knowledge_node(db_path: str, data: dict, dedup: bool = True) -> int:
    """插入知识节点。dedup=True 时检查标题重复。

    Args:
        db_path: 数据库路径
        data: 节点数据
        dedup: 是否检查重复（默认 True）

    Returns:
        新节点 ID，或已存在节点的 ID（如果重复）
    """
    conn = get_conn(db_path)
    title = data.get("title", "")

    # 去重：精确 title 匹配
    if dedup and title:
        dup = conn.execute(
            "SELECT id FROM knowledge_nodes WHERE title = ? AND scope != 'deleted'",
            (title,)
        ).fetchone()
        if dup:
            conn.close()
            return dup[0]  # 返回已有 ID

    source_projects = data.get("source_projects", [])
    if isinstance(source_projects, list):
        source_projects = json.dumps(source_projects)
    source_incidents = data.get("source_incidents", [])
    if isinstance(source_incidents, list):
        source_incidents = json.dumps(source_incidents)

    cur = conn.execute(
        """INSERT INTO knowledge_nodes (title, scope, abstraction_level, category_path, problem_statement, root_cause, solution_text, key_takeaway, causal_chain, preconditions, source_incidents, source_projects)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (title, data.get("scope","personal"), data.get("abstraction_level","pattern"),
         data.get("category_path",""), data.get("problem_statement",""), data.get("root_cause",""),
         data.get("solution_text",""), data.get("key_takeaway",""),
         data.get("causal_chain","[]"), data.get("preconditions","[]"),
         source_incidents, source_projects)
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


def update_knowledge_node(db_path: str, node_id: int, data: dict) -> bool:
    """更新知识节点的文本字段。不修改 TrueSkill 评分。

    Args:
        db_path: 数据库路径
        node_id: 节点 ID
        data: 要更新的字段 dict，支持 title/key_takeaway/root_cause/
              solution_text/problem_statement/category_path/scope

    Returns:
        True 如果更新了至少一行，False 如果节点不存在
    """
    ALLOWED_FIELDS = {
        "title", "key_takeaway", "root_cause", "solution_text",
        "problem_statement", "category_path", "scope",
        "abstraction_level", "causal_chain", "preconditions",
    }
    updates = {k: v for k, v in data.items() if k in ALLOWED_FIELDS}
    if not updates:
        return False

    conn = get_conn(db_path)
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + ["datetime('now')", node_id]
    cur = conn.execute(
        f"UPDATE knowledge_nodes SET {set_clause}, updated_at = ? WHERE id = ?",
        values
    )
    conn.commit()
    affected = cur.rowcount
    conn.close()
    return affected > 0


def delete_knowledge_node(db_path: str, node_id: int) -> bool:
    """软删除知识节点（标记 scope='deleted'）。
    数据和 TrueSkill 评分保留，用于审计。检索时自动过滤已删除节点。

    Args:
        db_path: 数据库路径
        node_id: 节点 ID

    Returns:
        True 如果删除成功，False 如果节点不存在或已删除
    """
    conn = get_conn(db_path)
    cur = conn.execute(
        "UPDATE knowledge_nodes SET scope = 'deleted', updated_at = datetime('now') "
        "WHERE id = ? AND scope != 'deleted'",
        (node_id,)
    )
    conn.commit()
    affected = cur.rowcount
    conn.close()
    return affected > 0


def apply_decay_to_all(db_path: str) -> int:
    """对指定库的所有节点执行一次衰减检查。"""
    from rating_engine import apply_decay
    return apply_decay(db_path)


def get_unprocessed_sessions(db_path: str, cwd: str = None) -> list[dict]:
    """查询有信号但尚未提取知识节点的 session。

    判断标准：session 有 signal_count > 0，但没有关联的 knowledge_node
    通过 session 的 cwd 和 knowledge_node 的 updated_at 时间窗口匹配。

    Args:
        db_path: 全局库路径
        cwd: 可选，过滤特定项目

    Returns:
        [{session_id, cwd, signal_count, created_at}, ...]
    """
    conn = get_conn(db_path)
    if cwd:
        rows = conn.execute(
            "SELECT session_id, cwd, signal_count, created_at FROM sessions "
            "WHERE signal_count > 0 AND cwd = ? "
            "ORDER BY created_at DESC LIMIT 20",
            (cwd,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT session_id, cwd, signal_count, created_at FROM sessions "
            "WHERE signal_count > 0 "
            "ORDER BY created_at DESC LIMIT 20"
        ).fetchall()
    conn.close()
    return [_row_to_dict(r, ["session_id", "cwd", "signal_count", "created_at"]) for r in rows]


def _row_to_dict(row: tuple, cols: list[str]) -> dict:
    return dict(zip(cols, row))


if __name__ == "__main__":
    import sys
    db = sys.argv[1] if len(sys.argv) > 1 else "memex.db"
    from db_schema import init_db
    init_db(db)
    print(stats(db))
