"""
Memex Context Injector — SessionStart 上下文注入引擎
从 DB 查询高价值经验 + 项目逻辑链 + 团队约定，格式化为 Claude 上下文
支持双库注入：项目库（优先）+ 全局库（补齐）
"""

from pathlib import Path
from db_ops import top_knowledge, top_knowledge_for_project, get_recent_incidents


def format_injection(db_path: str, cwd: str = None, project_db_path: str = None, team_dir: str = None) -> str:
    """生成完整的 SessionStart 注入文本

    优先注入当前项目的经验 (project_db)，不足时用全局高分经验补齐 (global_db)。
    """
    lines = ["[Memex 经验上下文]\n"]

    # 1. 高价值经验：项目库优先 → 全局库补齐
    try:
        all_top = []

        # 先取项目库知识
        if project_db_path and Path(project_db_path).exists():
            try:
                project_knowledge = top_knowledge(project_db_path, limit=10)
                for kn in project_knowledge:
                    kn['_source'] = 'project'
                all_top.extend(project_knowledge)
            except Exception:
                pass

        # 项目库不足，全局库补齐
        remaining = 10 - len(all_top)
        if remaining > 0:
            if cwd:
                global_knowledge = top_knowledge_for_project(db_path, cwd, limit=remaining)
            else:
                global_knowledge = top_knowledge(db_path, limit=remaining)

            # 去重（按 title）
            project_titles = {kn['title'] for kn in all_top}
            for kn in global_knowledge:
                if kn['title'] not in project_titles and len(all_top) < 10:
                    kn['_source'] = 'global'
                    all_top.append(kn)

        if all_top:
            lines.append("## 高价值经验（本项目优先）")
            for kn in all_top:
                cs = kn.get("conservative_score", 0)
                src_tag = "[项目]" if kn.get('_source') == 'project' else "[全局]"
                lines.append(
                    f"- #{kn['id']} {src_tag} μ={kn.get('trueskill_mu',25):.1f} σ={kn.get('trueskill_sigma',8.3):.1f}"
                    f" | [{kn.get('category_path','')}] {kn['title']}"
                )
                if kn.get("key_takeaway"):
                    lines.append(f"  ↳ {kn['key_takeaway']}")
    except Exception:
        pass

    # 2. 项目最近事件
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


def format_survival(db_path: str, label: str = "") -> str:
    """生成 PreCompact 存活摘要（精简版）"""
    label_prefix = f"[Memex {label}知识存活]\n" if label else "[Memex 知识存活]\n"
    lines = [label_prefix]

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
