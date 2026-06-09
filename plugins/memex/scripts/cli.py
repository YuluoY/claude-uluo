#!/usr/bin/env python3
"""Memex CLI — 记忆管理命令行工具"""
import sys, os, shutil
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

MEMEX_HOME = Path.home() / ".claude" / "memex"
MEMEX_DB = MEMEX_HOME / "global.db"


def _get_db():
    if not MEMEX_DB.exists():
        print("Memex 未初始化，请先运行: python scripts/cli.py init")
        return None
    return str(MEMEX_DB)


def cmd_init():
    MEMEX_HOME.mkdir(parents=True, exist_ok=True)
    (MEMEX_HOME / "embeddings").mkdir(exist_ok=True)
    if MEMEX_DB.exists():
        print(f"已初始化: {MEMEX_DB}"); return
    from db_schema import init_db; init_db(str(MEMEX_DB))
    print(f"已初始化: {MEMEX_DB}")


def cmd_stats():
    db = _get_db();
    if not db: return
    from db_ops import stats, top_knowledge
    s = stats(db)
    print(f"知识节点: {s['knowledge_nodes']}  事件: {s['incidents']}  边: {s['edges']}  信号: {s['signals']}")
    print()
    for r in top_knowledge(db, 5):
        cs = r.get('trueskill_mu', 25) - 2 * r.get('trueskill_sigma', 8.3)
        print(f"  #{r['id']} cs={cs:.1f} [{r.get('category_path','')}] {r['title'][:70]}")


def cmd_search(query, limit=10):
    db = _get_db();
    if not db: return
    from db_ops import search_knowledge
    results = search_knowledge(db, query, int(limit))
    if not results: print(f"未找到 '{query}'"); return
    print(f"搜索 '{query}' ({len(results)} 条):")
    for r in results:
        cs = r.get('trueskill_mu', 25) - 2 * r.get('trueskill_sigma', 8.3)
        print(f"  #{r['id']} cs={cs:.1f} [{r.get('category_path','')}] {r['title'][:80]}")


def cmd_graph(incident_id=None):
    db = _get_db();
    if not db: return
    try:
        from knowledge_graph import build_graph
        G = build_graph(db)
        if G is None or G.number_of_nodes() == 0: print("知识图谱为空"); return
        from pyvis.network import Network
        net = Network(height="750px", width="100%", bgcolor="#1a1a2e", font_color="white",
                      notebook=False, cdn_resources='in_line')
        net.from_nx(G)
        for node in net.nodes:
            t = node.get("type", "")
            if t == "KnowledgeNode": node["color"] = "#4ecdc4"; node["size"] = max(10, node.get("mu", 25) / 3)
            elif t == "Incident": node["color"] = "#ff6b6b"
            elif t == "RootCause": node["color"] = "#f9ca24"
        out = "memex-graph.html"
        net.write_html(out, open_browser=False, notebook=False)
        print(f"已生成: {Path(out).resolve()}")
    except ImportError:
        print("需要 pyvis: pip install pyvis")


def cmd_reset():
    if not MEMEX_DB.exists(): print("未初始化"); return
    backup = MEMEX_DB.with_suffix(".db.bak")
    shutil.copy2(MEMEX_DB, backup)
    print(f"已备份: {backup}")
    MEMEX_DB.unlink()
    from db_schema import init_db; init_db(str(MEMEX_DB))
    print("已重置，备份保留在 .bak")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Memex CLI")
        print("  python scripts/cli.py init             初始化")
        print("  python scripts/cli.py stats            查看状态")
        print("  python scripts/cli.py search <query>   搜索经验")
        print("  python scripts/cli.py graph            生成知识图谱 HTML（当前目录）")
        print("  python scripts/cli.py reset            重置记忆（自动备份）")
        sys.exit(0)

    cmd = sys.argv[1]
    if cmd == "init": cmd_init()
    elif cmd == "stats": cmd_stats()
    elif cmd == "search":
        if len(sys.argv) < 3: print("用法: python scripts/cli.py search <关键词>")
        else: cmd_search(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 10)
    elif cmd == "graph": cmd_graph()
    elif cmd == "reset":
        if input("确认重置？这将清除所有经验数据 [y/N] ").lower() == 'y': cmd_reset()
        else: print("已取消")
    else: print(f"未知: {cmd}")
