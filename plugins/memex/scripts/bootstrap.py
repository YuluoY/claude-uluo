#!/usr/bin/env python3
"""
冷启动增量回溯——每次新 Incident 产生时，自动搜索 git log 中相关历史 commit
"""
import sys, subprocess, json
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent))
from db_ops import insert_incident, insert_edge, search_knowledge
from sentiment_detector import detect
from hierarchy import classify_auto


def git_log_search(repo_path: str, keywords: list[str], since: str = "2 years ago", max_count: int = 20) -> list[dict]:
    """搜索 git log 中与关键词相关的 commit"""
    if not keywords:
        return []

    pattern = "|".join(kw for kw in keywords[:5] if len(kw) > 1)

    try:
        result = subprocess.run(
            ["git", "log", f"--grep={pattern}", f"--since={since}",
             "--oneline", "--no-merges", f"-n{max_count}"],
            cwd=repo_path, capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0 or not result.stdout.strip():
            return []

        commits = []
        for line in result.stdout.strip().split("\n"):
            parts = line.split(" ", 1)
            if len(parts) == 2:
                commits.append({"hash": parts[0], "message": parts[1][:200]})
        return commits
    except Exception:
        return []


def git_log_files(repo_path: str, commit_hash: str) -> list[str]:
    """获取某个 commit 涉及的文件"""
    try:
        result = subprocess.run(
            ["git", "diff-tree", "--no-commit-id", "--name-only", "-r", commit_hash],
            cwd=repo_path, capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            return [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]
        return []
    except Exception:
        return []


def bootstrap_from_git(repo_path: str, incident_text: str, db_path: str) -> dict:
    """
    增量回溯：用当前 Incident 的关键词搜索 git 历史，
    创建 historical Incident（confidence=0.5），
    历史证据只帮助发现模式，不参与 TrueSkill 验证。
    """
    from jieba.analyse import textrank
    keywords = textrank(incident_text, topK=5)

    commits = git_log_search(repo_path, keywords)
    if not commits:
        return {"historical": 0}

    created = []
    for c in commits[:10]:
        files = git_log_files(repo_path, c["hash"])
        cat = classify_auto(c["message"], keywords)

        iid = insert_incident(db_path, {
            "problem_statement": c["message"][:200],
            "context_project": Path(repo_path).name,
            "context_files": json.dumps([f for f in files[:10]]),
            "category_path": cat,
            "source": "git_history",
            "is_historical": 1,
            "confidence": 0.5,
            "git_commit_hash": c["hash"],
        })

        created.append({"id": iid, "hash": c["hash"], "message": c["message"][:80]})

    return {"historical": len(created), "incidents": created}


def check_promotion(db_path: str, category_path: str, threshold: int = 3) -> bool:
    """检查某个分类下是否达到晋升阈值"""
    import sqlite3
    conn = sqlite3.connect(db_path)
    count = conn.execute(
        "SELECT COUNT(*) FROM incidents WHERE category_path=?",
        (category_path,)
    ).fetchone()[0]
    conn.close()
    return count >= threshold


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python scripts/bootstrap.py <repo-path> [incident-text]")
        print("      如果不提供 incident-text，用最近的 commit message")
        sys.exit(1)

    repo = sys.argv[1]
    text = sys.argv[2] if len(sys.argv) > 2 else ""

    if not text:
        result = subprocess.run(["git", "log", "-1", "--format=%s"], cwd=repo,
                                capture_output=True, text=True)
        text = result.stdout.strip() or "recent changes"

    from cli import MEMEX_DB, cmd_init
    if not MEMEX_DB.exists():
        cmd_init()

    result = bootstrap_from_git(repo, text, str(MEMEX_DB))
    print(f"搜索: {text[:80]}")
    print(f"历史匹配: {result['historical']} 条 commit")
    for inc in result.get('incidents', []):
        print(f"  #{inc['id']} {inc['hash']} {inc['message']}")
