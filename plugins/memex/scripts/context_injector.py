"""
Memex Context Injector — SessionStart 上下文注入引擎
从 DB 查询高价值经验 + 项目逻辑链 + 团队约定，格式化为 Claude 上下文
"""

from pathlib import Path
from db_ops import top_knowledge, top_knowledge_for_project, get_recent_incidents


def format_injection(db_path: str, cwd: str = None, project_db_path: str = None, team_dir: str = None) -> str:
    """生成完整的 SessionStart 注入文本

    优先注入当前项目的经验 (cwd 匹配 source_projects)，不足时用全局高分经验补齐。
    """
    lines = ["[Memex 经验上下文]\n"]

    # 1. 项目过滤 + 全局补齐的高价值经验
    try:
        if cwd:
            top = top_knowledge_for_project(db_path, cwd, limit=10)
            lines.append("## 高价值经验（本项目优先）")
        else:
            top = top_knowledge(db_path, limit=10)
            lines.append("## 高价值经验")

        if top:
            for kn in top:
                cs = kn.get("conservative_score", 0)
                tag = "" if kn.get("source") == "global" else ""
                lines.append(
                    f"- #{kn['id']} μ={kn.get('trueskill_mu',25):.1f} σ={kn.get('trueskill_sigma',8.3):.1f}"
                    f" | [{kn.get('category_path','')}] {kn['title']}"
                )
                if kn.get("key_takeaway"):
                    lines.append(f"  ↳ {kn['key_takeaway']}")
    except Exception:
        pass

    # 2. 项目最近逻辑链
    if project_db_path and Path(project_db_path).exists():
        try:
            recent = get_recent_incidents(project_db_path, limit=5)
            if recent:
                lines.append("\n## 本项目最近事件")
                for inc in recent:
                    lines.append(f"- [{inc.get('category_path','')}] {inc['problem_statement']}")
        except Exception:
            pass

    # 3. 团队约定
    if team_dir and Path(team_dir).exists():
        conventions_path = Path(team_dir) / "conventions.md"
        if conventions_path.exists():
            content = conventions_path.read_text()[:500]
            lines.append(f"\n## 团队约定\n{content}")

    return "\n".join(lines)


def format_survival(db_path: str) -> str:
    """生成 PreCompact 存活摘要（精简版）"""
    lines = ["[Memex 知识存活]\n"]

    try:
        top = top_knowledge(db_path, limit=8)
        for kn in top:
            lines.append(
                f"- #{kn['id']} [{kn.get('category_path','')}] {kn['title']}"
                f" (μ={kn.get('trueskill_mu',25):.1f})"
            )
    except Exception:
        pass

    return "\n".join(lines)


if __name__ == "__main__":
    import sys
    db = sys.argv[1] if len(sys.argv) > 1 else "memex.db"
    text = format_injection(db)
    print(text)
