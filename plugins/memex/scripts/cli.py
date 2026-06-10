#!/usr/bin/env python3
"""Memex CLI — 记忆管理命令行工具（支持项目级隔离）"""
import sys, os, shutil, json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

MEMEX_HOME = Path.home() / ".claude" / "memex"
GLOBAL_DB = MEMEX_HOME / "global.db"


def _get_project_db(cwd: str = None) -> str | None:
    """获取当前项目的 project.db 路径"""
    if not cwd:
        cwd = os.getcwd()
    project_db = MEMEX_HOME / "projects" / Path(cwd).resolve().name / "project.db"
    return str(project_db) if project_db.exists() else None


def _resolve_db(target: str = "auto") -> str:
    """
    解析目标数据库路径。
    target: "global" | "project" | "auto" (项目优先，全局兜底)
    """
    if target == "global":
        if not GLOBAL_DB.exists():
            print("全局库未初始化，请先运行: python scripts/cli.py init")
            sys.exit(1)
        return str(GLOBAL_DB)
    if target == "project":
        db = _get_project_db()
        if not db:
            print("项目库未初始化，请先在项目中运行一次 Claude Code")
            sys.exit(1)
        return db
    # auto: 项目优先
    db = _get_project_db()
    if db:
        return db
    if GLOBAL_DB.exists():
        return str(GLOBAL_DB)
    print("Memex 未初始化，请先运行: python scripts/cli.py init")
    sys.exit(1)


def cmd_init():
    MEMEX_HOME.mkdir(parents=True, exist_ok=True)
    (MEMEX_HOME / "embeddings").mkdir(exist_ok=True)
    if GLOBAL_DB.exists():
        print(f"已初始化: {GLOBAL_DB}")
        return
    from db_schema import init_db
    init_db(str(GLOBAL_DB))
    print(f"已初始化: {GLOBAL_DB}")


def cmd_stats(target: str = "auto"):
    db = _resolve_db(target)
    from db_ops import stats, top_knowledge
    s = stats(db)
    source = "全局库" if db == str(GLOBAL_DB) else f"项目库 ({db})"
    print(f"[{source}] 知识节点: {s['knowledge_nodes']}  事件: {s['incidents']}  边: {s['edges']}  信号: {s['signals']}")

    # 同时显示另一个库的对比
    if target == "auto":
        project_db = _get_project_db()
        global_db_exists = GLOBAL_DB.exists()
        if project_db and global_db_exists and db != str(GLOBAL_DB):
            gs = stats(str(GLOBAL_DB))
            print(f"[全局库] 知识节点: {gs['knowledge_nodes']}  事件: {gs['incidents']}  边: {gs['edges']}")
        elif global_db_exists and db == str(GLOBAL_DB):
            if project_db:
                ps = stats(project_db)
                print(f"[项目库] 知识节点: {ps['knowledge_nodes']}  事件: {ps['incidents']}")

    print()
    for r in top_knowledge(db, 5):
        cs = r.get('trueskill_mu', 25) - 2 * r.get('trueskill_sigma', 8.3)
        print(f"  #{r['id']} cs={cs:.1f} [{r.get('category_path','')}] {r['title'][:70]}")


def cmd_list(target: str = "auto", limit: int = 20):
    """列出项目库中的所有知识节点"""
    db = _resolve_db(target)
    from db_ops import top_knowledge
    source = "全局库" if db == str(GLOBAL_DB) else "项目库"
    nodes = top_knowledge(db, int(limit))
    if not nodes:
        print(f"[{source}] 暂无知识节点")
        return
    print(f"[{source}] 共 {len(nodes)} 条经验:\n")
    for r in nodes:
        cs = r.get('trueskill_mu', 25) - 2 * r.get('trueskill_sigma', 8.3)
        scope = r.get('scope', '?')
        print(f"  #{r['id']} cs={cs:.1f} scope={scope}")
        print(f"    [{r.get('category_path','')}] {r['title']}")
        if r.get('key_takeaway'):
            print(f"    ↳ {r['key_takeaway']}")
        print()


def cmd_search(query, limit: int = 10, target: str = "auto"):
    db = _resolve_db(target)
    from db_ops import search_knowledge
    results = search_knowledge(db, query, int(limit))
    if not results:
        print(f"未找到 '{query}'")
        return
    source = "全局库" if db == str(GLOBAL_DB) else "项目库"
    print(f"[{source}] 搜索 '{query}' ({len(results)} 条):")
    for r in results:
        cs = r.get('trueskill_mu', 25) - 2 * r.get('trueskill_sigma', 8.3)
        print(f"  #{r['id']} cs={cs:.1f} [{r.get('category_path','')}] {r['title'][:80]}")


def cmd_promote(node_id: int):
    """
    将项目知识节点提升到全局库。
    提升条件（自动检查）：
    - 与框架/语言/方法论相关（非项目特有代码）
    - TrueSkill conservative_score > 0（已被验证有价值）
    """
    project_db = _get_project_db()
    if not project_db:
        print("错误: 当前不在项目上下文中，或项目库未初始化")
        sys.exit(1)
    if not GLOBAL_DB.exists():
        print("错误: 全局库未初始化")
        sys.exit(1)

    import sqlite3
    conn = sqlite3.connect(project_db)
    row = conn.execute(
        "SELECT id, title, scope, category_path, problem_statement, root_cause, solution_text, key_takeaway, causal_chain, preconditions, source_projects, trueskill_mu, trueskill_sigma FROM knowledge_nodes WHERE id = ?",
        (node_id,)
    ).fetchone()
    conn.close()

    if not row:
        print(f"错误: 项目库中不存在 #{node_id}")
        sys.exit(1)

    fields = ["id","title","scope","category_path","problem_statement","root_cause",
              "solution_text","key_takeaway","causal_chain","preconditions","source_projects",
              "trueskill_mu","trueskill_sigma"]
    node = dict(zip(fields, row))

    cs = node['trueskill_mu'] - 2 * node['trueskill_sigma']

    # 检查是否适合提升
    print(f"审查 #{node_id}: {node['title']}")
    print(f"  范畴: {node['category_path']}")
    print(f"  scope: {node['scope']}")
    print(f"  TrueSkill: μ={node['trueskill_mu']:.1f} σ={node['trueskill_sigma']:.1f} cs={cs:.1f}")
    print(f"  key_takeaway: {node['key_takeaway']}")
    print()

    if node['scope'] == 'project':
        print("⚠️  此节点 scope=project，建议先人工确认是否具有跨项目通用性")
        print("   如果确认通用，请直接修改 scope 为 'domain' 或 'framework' 后重试")
        print("   或使用 --force 跳过此检查")
        if "--force" not in sys.argv and "-f" not in sys.argv:
            print("   提示: python scripts/cli.py promote <id> --force")
            sys.exit(0)

    # 检查全局库是否有重复（按 title）
    gconn = sqlite3.connect(str(GLOBAL_DB))
    dup = gconn.execute(
        "SELECT id, title FROM knowledge_nodes WHERE title = ?",
        (node['title'],)
    ).fetchone()
    if dup:
        print(f"⚠️  全局库已存在同名节点 #{dup[0]}: {dup[1]}")
        print("   跳过提升。如需合并，请手动操作。")
        gconn.close()
        sys.exit(0)

    # 执行提升
    from db_ops import insert_knowledge_node
    new_id = insert_knowledge_node(str(GLOBAL_DB), {
        'title': node['title'],
        'scope': 'framework',  # 提升到全局时默认标记为 framework
        'abstraction_level': 'pattern',
        'category_path': node['category_path'],
        'problem_statement': node['problem_statement'],
        'root_cause': node['root_cause'],
        'solution_text': node['solution_text'],
        'key_takeaway': node['key_takeaway'],
        'source_projects': json.loads(node.get('source_projects', '[]')),
    })

    # 在全局库建立关联边
    from db_ops import insert_edge
    insert_edge(str(GLOBAL_DB), 'knowledge_node', new_id, 'knowledge_node', new_id,
                'PROMOTED_FROM', 0.8,
                json.dumps({'original_id': node_id, 'original_db': project_db}))

    gconn.close()
    print(f"✅ 已提升 #{node_id}(项目) → #{new_id}(全局)")
    print(f"   标题: {node['title']}")
    print(f"   scope: project → framework")


def _parse_edit_args(args: list[str]) -> dict:
    """解析 edit 命令的 --key value 参数"""
    data = {}
    i = 0
    while i < len(args):
        arg = args[i]
        if arg.startswith("--"):
            key = arg[2:]
            if i + 1 < len(args) and not args[i + 1].startswith("--"):
                data[key] = args[i + 1]
                i += 2
            else:
                data[key] = "true"  # boolean flag
                i += 1
        else:
            i += 1
    return data


def cmd_edit(node_id: int, args: list[str]):
    """编辑知识节点的文本字段"""
    data = _parse_edit_args(args)
    if not data:
        print("用法: python scripts/cli.py edit <id> --title '...' --key_takeaway '...' --scope project")
        print("可编辑字段: title, key_takeaway, root_cause, solution_text, problem_statement, category_path, scope")
        sys.exit(1)

    db = _resolve_db("auto")
    from db_ops import update_knowledge_node

    # 显示当前值
    import sqlite3
    conn = sqlite3.connect(db)
    row = conn.execute("SELECT id, title, scope, category_path, key_takeaway FROM knowledge_nodes WHERE id = ? AND scope != 'deleted'", (node_id,)).fetchone()
    conn.close()
    if not row:
        print(f"错误: 不存在或已删除 #{node_id}")
        sys.exit(1)
    print(f"编辑 #{row[0]}: {row[1]}")
    print(f"  当前 scope={row[2]} category={row[3]}")

    ok = update_knowledge_node(db, node_id, data)
    if ok:
        print(f"✅ 已更新 #{node_id}")
        for k, v in data.items():
            print(f"   {k}: {v[:60] if len(v) > 60 else v}")
    else:
        print(f"❌ 更新失败 #{node_id}")


def cmd_delete(node_id: int):
    """软删除知识节点"""
    db = _resolve_db("auto")
    from db_ops import delete_knowledge_node

    import sqlite3
    conn = sqlite3.connect(db)
    row = conn.execute("SELECT id, title, scope FROM knowledge_nodes WHERE id = ? AND scope != 'deleted'", (node_id,)).fetchone()
    conn.close()
    if not row:
        print(f"错误: 不存在或已删除 #{node_id}")
        sys.exit(1)

    print(f"确认删除 #{row[0]}: {row[1]} (scope={row[2]})")
    confirm = input("此操作将软删除该经验（标记为 deleted），不可撤销 [y/N] ")
    if confirm.lower() != 'y':
        print("已取消")
        return

    ok = delete_knowledge_node(db, node_id)
    if ok:
        print(f"✅ 已删除 #{node_id}")
    else:
        print(f"❌ 删除失败 #{node_id}")


def cmd_retry(target: str = "auto"):
    """列出有信号但可能未提取知识的 session，供手动重试"""
    db = _resolve_db(target)
    from db_ops import get_unprocessed_sessions
    sessions = get_unprocessed_sessions(db, os.getcwd() if target != "global" else None)
    if not sessions:
        print("所有 session 已处理完毕")
        return
    print(f"潜在未处理 session ({len(sessions)} 个):\n")
    for s in sessions:
        print(f"  {s['session_id'][:8]}... cwd={s.get('cwd','?')} signals={s.get('signal_count',0)} time={s.get('created_at','?')}")
    print(f"\n回放提取（需在对应项目目录下执行）:")
    print(f"  python scripts/cli.py retry --run <session_id>")


def cmd_graph(target: str = "auto"):
    db = _resolve_db(target)
    try:
        from knowledge_graph import build_graph
        G = build_graph(db)
        if G is None or G.number_of_nodes() == 0:
            print("知识图谱为空")
            return
        from pyvis.network import Network
        net = Network(height="750px", width="100%", bgcolor="#1a1a2e", font_color="white",
                      notebook=False, cdn_resources='in_line')
        net.from_nx(G)
        for node in net.nodes:
            t = node.get("type", "")
            if t == "KnowledgeNode":
                node["color"] = "#4ecdc4"
                node["size"] = max(10, node.get("mu", 25) / 3)
            elif t == "Incident":
                node["color"] = "#ff6b6b"
            elif t == "RootCause":
                node["color"] = "#f9ca24"
        out = "memex-graph.html"
        net.write_html(out, open_browser=False, notebook=False)
        print(f"已生成: {Path(out).resolve()}")
    except ImportError:
        print("需要 pyvis: pip install pyvis")


def cmd_reset():
    if not GLOBAL_DB.exists():
        print("未初始化")
        return
    backup = GLOBAL_DB.with_suffix(".db.bak")
    shutil.copy2(GLOBAL_DB, backup)
    print(f"已备份: {backup}")
    GLOBAL_DB.unlink()
    from db_schema import init_db
    init_db(str(GLOBAL_DB))
    print("已重置，备份保留在 .bak")


USAGE = """Memex CLI — 记忆管理

  python scripts/cli.py init                    初始化全局库
  python scripts/cli.py stats [global|project]  查看知识统计（默认项目优先）
  python scripts/cli.py list [global|project]   列出知识节点
  python scripts/cli.py search <query>          搜索经验
  python scripts/cli.py promote <id> [--force]  提升项目经验到全局库
  python scripts/cli.py edit <id> --key value   编辑经验节点
  python scripts/cli.py delete <id>             删除经验节点（软删除）
  python scripts/cli.py retry                   列出未处理 session
  python scripts/cli.py graph [global|project]  生成知识图谱 HTML
  python scripts/cli.py reset                   重置全局记忆（自动备份）

edit 可编辑字段:
  --title --key_takeaway --root_cause --solution_text
  --problem_statement --category_path --scope

目标参数:
  global   — 操作全局库 (~/.claude/memex/global.db)
  project  — 操作当前项目库 (~/.claude/memex/projects/<name>/project.db)
  auto     — 项目优先，全局兜底（默认）"""

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(USAGE)
        sys.exit(0)

    cmd = sys.argv[1]

    if cmd == "init":
        cmd_init()
    elif cmd == "stats":
        target = sys.argv[2] if len(sys.argv) > 2 else "auto"
        cmd_stats(target)
    elif cmd == "list":
        target = sys.argv[2] if len(sys.argv) > 2 else "auto"
        limit = sys.argv[3] if len(sys.argv) > 3 else 20
        cmd_list(target, limit)
    elif cmd == "search":
        if len(sys.argv) < 3:
            print("用法: python scripts/cli.py search <关键词> [global|project]")
        else:
            target = sys.argv[3] if len(sys.argv) > 3 else "auto"
            cmd_search(sys.argv[2], 10, target)
    elif cmd == "promote":
        if len(sys.argv) < 3:
            print("用法: python scripts/cli.py promote <节点ID> [--force]")
        else:
            cmd_promote(int(sys.argv[2]))
    elif cmd == "edit":
        if len(sys.argv) < 3:
            print("用法: python scripts/cli.py edit <节点ID> --title '...' --key_takeaway '...'")
        else:
            cmd_edit(int(sys.argv[2]), sys.argv[3:])
    elif cmd == "delete":
        if len(sys.argv) < 3:
            print("用法: python scripts/cli.py delete <节点ID>")
        else:
            cmd_delete(int(sys.argv[2]))
    elif cmd == "retry":
        target = sys.argv[2] if len(sys.argv) > 2 else "auto"
        cmd_retry(target)
    elif cmd == "graph":
        target = sys.argv[2] if len(sys.argv) > 2 else "auto"
        cmd_graph(target)
    elif cmd == "reset":
        if input("确认重置？这将清除所有经验数据 [y/N] ").lower() == 'y':
            cmd_reset()
        else:
            print("已取消")
    elif cmd in ("-h", "--help", "help"):
        print(USAGE)
    else:
        print(f"未知命令: {cmd}\n")
        print(USAGE)
