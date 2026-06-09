"""
Memex Database Schema
- 双层存储：global.db (~/.claude/memex/) + project.db (<project>/.claude/memex/)
- 8 张核心表：incidents / knowledge_nodes / root_causes / edges / concepts / files / signals / categories
- FTS5 全文搜索 + sqlite-vec 向量扩展
"""

import os
import sqlite3
from pathlib import Path
from typing import Optional

MEMEX_HOME = Path.home() / ".claude" / "memex"
GLOBAL_DB = str(MEMEX_HOME / "global.db")

SCHEMA = """
-- 核心表：知识节点（抽象经验模式）
CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'personal',
    abstraction_level TEXT DEFAULT 'pattern',
    category_path TEXT DEFAULT '',
    problem_statement TEXT DEFAULT '',
    root_cause TEXT DEFAULT '',
    solution_text TEXT DEFAULT '',
    key_takeaway TEXT DEFAULT '',
    causal_chain TEXT DEFAULT '[]',
    preconditions TEXT DEFAULT '[]',
    trueskill_mu REAL DEFAULT 25.0,
    trueskill_sigma REAL DEFAULT 8.333,
    occurrence_count INTEGER DEFAULT 0,
    positive_signals INTEGER DEFAULT 0,
    negative_signals INTEGER DEFAULT 0,
    signal_history TEXT DEFAULT '[]',
    source_incidents TEXT DEFAULT '[]',
    source_projects TEXT DEFAULT '[]',
    version INTEGER DEFAULT 1,
    embedding_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 核心表：具体问题事件
CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_node_id INTEGER REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
    problem_statement TEXT NOT NULL,
    context_project TEXT DEFAULT '',
    context_framework TEXT DEFAULT '',
    context_files TEXT DEFAULT '[]',
    symptoms TEXT DEFAULT '[]',
    attempts TEXT DEFAULT '[]',
    solution_description TEXT DEFAULT '',
    solution_code_snippet TEXT DEFAULT '',
    verification_type TEXT DEFAULT '',
    verification_evidence TEXT DEFAULT '',
    sentiment_score REAL DEFAULT 0.0,
    category_path TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    source TEXT DEFAULT 'realtime',
    is_historical INTEGER DEFAULT 0,
    triggered_by INTEGER,
    confidence REAL DEFAULT 1.0,
    git_commit_hash TEXT DEFAULT '',
    review_status TEXT DEFAULT '',
    embedding_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 根因表
CREATE TABLE IF NOT EXISTS root_causes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    knowledge_node_id INTEGER REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
    statement TEXT NOT NULL,
    causal_chain TEXT DEFAULT '[]',
    related_concepts TEXT DEFAULT '[]',
    is_primary INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 关系边表
CREATE TABLE IF NOT EXISTS edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    relation TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(source_type, source_id, target_type, target_id, relation)
);

-- 概念表
CREATE TABLE IF NOT EXISTS concepts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    domain TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 文件引用表
CREATE TABLE IF NOT EXISTS file_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    knowledge_node_id INTEGER REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    change_type TEXT DEFAULT 'modified',
    commit_hash TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 情感信号表
CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    knowledge_node_id INTEGER REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
    signal_type TEXT NOT NULL,
    intensity REAL DEFAULT 0.5,
    sentiment_score REAL DEFAULT 0.5,
    emotion_type TEXT DEFAULT '',
    source_text TEXT DEFAULT '',
    transcript_excerpt TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 层级分类树
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    parent_path TEXT,
    description TEXT DEFAULT ''
);

-- FTS5 全文搜索
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
    title, problem_statement, root_cause, solution_text, key_takeaway, tags,
    content='knowledge_nodes', content_rowid='id'
);

-- FTS5 触发器
CREATE TRIGGER IF NOT EXISTS kn_ai AFTER INSERT ON knowledge_nodes BEGIN
    INSERT INTO knowledge_fts(rowid, title, problem_statement, root_cause, solution_text, key_takeaway, tags)
    VALUES (new.id, new.title, new.problem_statement, new.root_cause, new.solution_text, new.key_takeaway, '');
END;

CREATE TRIGGER IF NOT EXISTS kn_ad AFTER DELETE ON knowledge_nodes BEGIN
    INSERT INTO knowledge_fts(knowledge_fts, rowid, title, problem_statement, root_cause, solution_text, key_takeaway, tags)
    VALUES ('delete', old.id, old.title, old.problem_statement, old.root_cause, old.solution_text, old.key_takeaway, '');
END;

CREATE TRIGGER IF NOT EXISTS kn_au AFTER UPDATE ON knowledge_nodes BEGIN
    INSERT INTO knowledge_fts(knowledge_fts, rowid, title, problem_statement, root_cause, solution_text, key_takeaway, tags)
    VALUES ('delete', old.id, old.title, old.problem_statement, old.root_cause, old.solution_text, old.key_takeaway, '');
    INSERT INTO knowledge_fts(rowid, title, problem_statement, root_cause, solution_text, key_takeaway, tags)
    VALUES (new.id, new.title, new.problem_statement, new.root_cause, new.solution_text, new.key_takeaway, '');
END;

-- 会话记录
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    cwd TEXT DEFAULT '',
    transcript_path TEXT DEFAULT '',
    incident_count INTEGER DEFAULT 0,
    signal_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 向量嵌入存储
CREATE TABLE IF NOT EXISTS vec_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_node_id INTEGER NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    embedding TEXT NOT NULL,
    model_name TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 团队补丁记录
CREATE TABLE IF NOT EXISTS applied_patches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patch_id TEXT NOT NULL UNIQUE,
    source_user TEXT DEFAULT '',
    source_project TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);
"""

ROOT_CATEGORIES = [
    ("architecture", "架构设计"),
    ("architecture/boundary", "模块边界"),
    ("architecture/dependency", "依赖关系"),
    ("architecture/pattern", "设计模式"),
    ("data/state/race", "竞态条件"),
    ("data/state/timing", "时序问题"),
    ("data/flow", "数据流"),
    ("data/persistence", "持久化"),
    ("rendering/layout", "布局"),
    ("rendering/animation", "动画"),
    ("rendering/coordinate", "坐标系"),
    ("rendering/viewport", "视口裁剪"),
    ("interaction/event", "事件处理"),
    ("interaction/feedback", "反馈"),
    ("tooling/build", "构建"),
    ("tooling/cli", "命令行"),
    ("tooling/config", "配置"),
    ("methodology/debugging", "调试方法"),
    ("methodology/decision", "决策框架"),
    ("methodology/thinking", "思维方式"),
    ("methodology/workflow", "工作流"),
    ("domain/graph/node", "图节点"),
    ("domain/graph/edge", "图边线"),
    ("domain/graph/layout", "图布局"),
    ("domain/graph/zoom", "图缩放"),
]


def get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(db_path: str) -> dict:
    """初始化数据库：建表 + 种子数据"""
    conn = get_conn(db_path)
    conn.executescript(SCHEMA)

    for path, label in ROOT_CATEGORIES:
        conn.execute(
            "INSERT OR IGNORE INTO categories (path, label) VALUES (?, ?)",
            (path, label)
        )

    conn.commit()
    stats = {
        "knowledge_nodes": conn.execute("SELECT COUNT(*) FROM knowledge_nodes").fetchone()[0],
        "incidents": conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0],
        "categories": conn.execute("SELECT COUNT(*) FROM categories").fetchone()[0],
    }
    conn.close()
    return {"ok": True, "db": db_path, "stats": stats}


# CLI entry point for testing
if __name__ == "__main__":
    import sys
    db = sys.argv[1] if len(sys.argv) > 1 else GLOBAL_DB
    result = init_db(db)
    print(f"Initialized: {result}")
