"""Mermaid User Journey 用户旅程图脚本。

用于用户使用流程、体验路径、操作步骤分析等场景。
数据驱动优先：AI 构建结构化数据 → data_to_diagram() → Mermaid journey。

强制规则：
  - 必须以 journey 开头
  - 每个 section 至少 1 个 task
  - task score 范围 1-5
  - actor 名称简洁
"""

import re
from pathlib import Path
from _shared import core

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "diagram-themes.yaml"

DATA_SCHEMA = """\
数据格式 (YAML):

title: "用户注册流程"                   # 可选
sections:                               # 必填，至少 1 个阶段
  - name: "发现产品"                    # 阶段名称
    tasks:                              # 该阶段的任务列表
      - name: "搜索关键词"              # 任务描述
        score: 4                        # 1-5 满意度评分（5=最满意）
        actors: ["用户"]                # 参与者列表
      - name: "浏览搜索结果"
        score: 3
        actors: ["用户"]
  - name: "注册账号"
    tasks:
      - name: "填写注册表单"
        score: 2
        actors: ["用户", "系统"]
      - name: "验证手机号"
        score: 4
        actors: ["用户", "短信服务"]
      - name: "设置密码"
        score: 3
        actors: ["用户"]
"""


def template() -> str:
    """返回 Mermaid 用户旅程图语法示例。"""
    return """journey
    title 用户首次使用流程
    section 探索产品
      搜索关键词: 4: 用户
      浏览结果页: 3: 用户
      点击详情: 5: 用户
    section 上手使用
      创建账号: 3: 用户, 系统
      新手引导: 4: 用户
      首次操作: 2: 用户, 系统"""


def data_to_diagram(data: dict) -> str:
    """结构化数据 → Mermaid journey 代码。"""
    lines = ["journey"]

    title = data.get("title", "")
    if title:
        lines.append(f"    title {title}")

    sections = data.get("sections", [])
    for section in sections:
        section_name = section.get("name", "")
        lines.append(f"    section {section_name}")

        tasks = section.get("tasks", [])
        for task in tasks:
            task_name = task.get("name", "")
            score = task.get("score", 3)
            actors = task.get("actors", [])

            # 限制 score 范围
            score = max(1, min(5, int(score)))
            actors_str = ", ".join(actors) if actors else "用户"

            lines.append(f"      {task_name}: {score}: {actors_str}")

    return "\n".join(lines)


def validate(diagram: str) -> list[dict]:
    """Journey 专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, "journey"))

    # 检查 section 声明
    sections = re.findall(r'section\s+(.+)', diagram)
    if not sections:
        problems.append({
            "type": "error",
            "message": "用户旅程图缺少 section 声明",
            "fix": "添加: section 阶段名称"
        })

    # 检查 task 声明
    tasks = re.findall(r'\s+([^:]+):\s*(\d+):\s*(.+)', diagram)
    if not tasks:
        problems.append({
            "type": "error",
            "message": "用户旅程图没有任何 task",
            "fix": "在每个 section 下添加 task: task名称: 评分: 参与者"
        })

    # 检查 score 范围
    for i, line in enumerate(diagram.split("\n"), 1):
        m = re.search(r':\s*(\d+)\s*:', line)
        if m:
            score = int(m.group(1))
            if score < 1 or score > 5:
                problems.append({
                    "type": "warning",
                    "line": i,
                    "message": f"评分 ({score}) 超出 1-5 范围",
                    "fix": "将评分调整到 1-5 之间"
                })

    # 检查是否有空 section（有 section 但没有 task）
    current_section = None
    section_has_task = {}
    for line in diagram.split("\n"):
        sec_m = re.match(r'section\s+(.+)', line.strip())
        task_m = re.match(r'\s+([^:]+):\s*(\d+):', line)
        if sec_m:
            current_section = sec_m.group(1)
            section_has_task[current_section] = False
        elif task_m and current_section:
            section_has_task[current_section] = True

    for sec_name, has_task in section_has_task.items():
        if not has_task:
            problems.append({
                "type": "warning",
                "message": f"section '{sec_name}' 没有任何 task",
                "fix": "在该 section 下添加 task 或删除空的 section"
            })

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Journey 规范。"""
    changes = []

    theme_vars = None
    if _THEMES_PATH.exists():
        core.set_themes_path(_THEMES_PATH)
        theme_vars = core.load_diagram_theme()
    diagram, style_changes = core.enforce_default_style(diagram, theme_overrides=theme_vars)
    changes.extend(style_changes)

    return diagram, changes
