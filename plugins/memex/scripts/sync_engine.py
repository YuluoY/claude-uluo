#!/usr/bin/env python3
"""
Team Sync Engine — JSON Patches + git 团队知识自动合并
- SessionEnd: 导出 scope=team 的 KnowledgeNode 为 JSON patch
- SessionStart: 扫描 team/patches/，导入未应用的 patch
"""

import sys, os, json, uuid
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parent))
from db_ops import insert_knowledge_node, insert_edge
from rating_engine import update_lesson_rating
from db_schema import get_conn

PATCHES_DIR = ".claude/memex/team/patches"
APPLIED_FILE = ".claude/memex/team/applied.json"


def export_team_patches(db_path: str, project_root: str) -> list[str]:
    """导出 scope=team 的 KnowledgeNode 为 JSON patches"""
    patches_dir = Path(project_root) / PATCHES_DIR
    patches_dir.mkdir(parents=True, exist_ok=True)

    conn = get_conn(db_path)
    rows = conn.execute(
        "SELECT id, title, scope, category_path, root_cause, solution_text, key_takeaway, "
        "trueskill_mu, trueskill_sigma, source_incidents "
        "FROM knowledge_nodes WHERE scope='team'"
    ).fetchall()
    conn.close()

    created = []
    for row in rows:
        patch_id = f"{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:4]}"
        patch = {
            "id": patch_id,
            "format_version": 1,
            "source_user": os.getlogin(),
            "source_host": os.uname().nodename,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "knowledge_node": {
                "title": row[1], "scope": row[2], "category_path": row[3],
                "root_cause": row[4], "solution_text": row[5], "key_takeaway": row[6],
                "trueskill_mu": row[7], "trueskill_sigma": row[8],
                "source_incidents": json.loads(row[9]) if row[9] else [],
            }
        }
        patch_file = patches_dir / f"{patch_id}.json"
        with open(patch_file, "w") as f:
            json.dump(patch, f, indent=2, ensure_ascii=False)
        created.append(patch_id)

    return created


def import_team_patches(db_path: str, project_root: str):
    """导入 team/patches/ 中未应用的 patch，自动合并"""
    patches_dir = Path(project_root) / PATCHES_DIR
    if not patches_dir.exists():
        return {"imported": 0, "merged": 0}

    applied_path = Path(project_root) / APPLIED_FILE
    applied = set()
    if applied_path.exists():
        try:
            with open(applied_path) as f:
                applied = set(json.load(f))
        except Exception:
            pass

    patch_files = sorted(patches_dir.glob("*.json"))
    new_patches = [p for p in patch_files if p.stem not in applied]
    if not new_patches:
        return {"imported": 0, "merged": 0}

    imported = 0
    merged = 0

    for pf in new_patches:
        try:
            with open(pf) as f:
                patch = json.load(f)
        except Exception:
            continue

        kn = patch.get("knowledge_node", {})
        if not kn.get("title"):
            continue

        # 检查是否与已有节点重复（基于 embedding 相似度）
        existing = _find_similar(db_path, kn)
        if existing:
            # 合并：TrueSkill 聚合
            _merge_knowledge_node(db_path, existing["id"], kn)
            merged += 1
        else:
            # 新知识节点
            kid = insert_knowledge_node(db_path, {
                "title": kn.get("title", ""),
                "scope": kn.get("scope", "team"),
                "category_path": kn.get("category_path", ""),
                "root_cause": kn.get("root_cause", ""),
                "solution_text": kn.get("solution_text", ""),
                "key_takeaway": kn.get("key_takeaway", ""),
            })
            # 设置初始 TrueSkill
            mu = kn.get("trueskill_mu", 25.0)
            sigma = kn.get("trueskill_sigma", 8.333)
            conn = get_conn(db_path)
            conn.execute("UPDATE knowledge_nodes SET trueskill_mu=?, trueskill_sigma=? WHERE id=?",
                         (mu, sigma, kid))
            conn.commit()
            conn.close()
            imported += 1

        applied.add(pf.stem)

    # 记录已应用
    with open(applied_path, "w") as f:
        json.dump(list(applied), f)

    return {"imported": imported, "merged": merged}


def _find_similar(db_path: str, kn: dict) -> dict | None:
    """FTS5 搜索相似节点（fallback: 标题关键词匹配）"""
    from db_ops import search_knowledge
    keywords = kn.get("title", "")[:50]
    results = search_knowledge(db_path, keywords, 3)
    for r in results:
        if r.get("scope") == "team":
            return r
    return None


def _merge_knowledge_node(db_path: str, existing_id: int, incoming: dict):
    """合并两个 KnowledgeNode：TrueSkill 聚合"""
    conn = get_conn(db_path)
    row = conn.execute(
        "SELECT trueskill_mu, trueskill_sigma, source_incidents FROM knowledge_nodes WHERE id=?",
        (existing_id,)
    ).fetchone()
    if not row:
        conn.close()
        return

    # TrueSkill 聚合：取加权平均
    mu1, sigma1 = row[0], row[1]
    mu2 = incoming.get("trueskill_mu", 25.0)
    sigma2 = incoming.get("trueskill_sigma", 8.333)

    # 简单平均（TrueSkill 的标准多证据聚合是 rate 多次，这里用近似）
    new_mu = (mu1 + mu2) / 2
    new_sigma = max(min(sigma1, sigma2) * 0.9, 1.0)

    # 合并 source_incidents
    existing_sources = json.loads(row[2]) if row[2] else []
    incoming_sources = incoming.get("source_incidents", [])
    merged_sources = list(set(existing_sources + incoming_sources))

    conn.execute(
        "UPDATE knowledge_nodes SET trueskill_mu=?, trueskill_sigma=?, source_incidents=? WHERE id=?",
        (new_mu, new_sigma, json.dumps(merged_sources), existing_id)
    )
    conn.commit()
    conn.close()


if __name__ == "__main__":
    from cli import MEMEX_DB
    project = sys.argv[1] if len(sys.argv) > 1 else str(Path.cwd())
    db = str(MEMEX_DB)

    print("=== 导入 team patches ===")
    r = import_team_patches(db, project)
    print(f"  新导入: {r['imported']}  合并: {r['merged']}")

    print("\n=== 导出 team patches ===")
    patches = export_team_patches(db, project)
    print(f"  导出: {len(patches)} 个 patch")
    for p in patches:
        print(f"    {p}")
