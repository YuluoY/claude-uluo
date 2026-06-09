"""Mermaid Mindmap 思维导图脚本。

强制规则：
  - 必须以 mindmap 开头
  - root 节点用 root((文字))
  - 缩进表示层级（支持空格和 Tab）
  - 层级深度建议 ≤ 5
  - 节点支持 Markdown 格式
"""

import re
from _shared import core


def template() -> str:
    return """mindmap
    root((中心主题))
        一级分支A
            二级节点A1
            二级节点A2
                三级节点
        一级分支B
            二级节点B1
            二级节点B2
        一级分支C"""


def validate(diagram: str) -> list[dict]:
    """Mindmap 专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, "mindmap"))

    # 检查有 root 节点
    problems.extend(_check_root_node(diagram))

    # 检查嵌套深度
    problems.extend(_check_depth(diagram))

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Mindmap 规范。"""
    changes = []

    diagram, style_changes = core.enforce_default_style(diagram)
    changes.extend(style_changes)

    return diagram, changes


def _check_root_node(diagram: str) -> list[dict]:
    """检查是否有 root 节点。"""
    if not re.search(r'root\s*\(\(', diagram):
        return [{
            "type": "error",
            "message": "思维导图缺少 root((...)) 根节点",
            "fix": "添加: root((中心主题))"
        }]
    return []


def _check_depth(diagram: str) -> list[dict]:
    """检查嵌套深度不超过 5 层。"""
    max_indent = 0
    for line in diagram.split("\n"):
        stripped = line.rstrip()
        if stripped.strip().startswith("%%") or stripped.strip().startswith("root"):
            continue
        indent = len(stripped) - len(stripped.lstrip())
        if indent > 0:
            level = indent // 4  # 假设 4 空格为一级
            if level > max_indent:
                max_indent = level
    if max_indent > 5:
        return [{
            "type": "quality",
            "message": f"思维导图深度 ({max_indent} 层) 超过建议上限 (5)",
            "fix": "将深层节点上移或拆分为新的分支"
        }]
    return []
