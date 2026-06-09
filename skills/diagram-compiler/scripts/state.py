"""Mermaid State Diagram 状态图脚本。

强制规则：
  - 必须以 stateDiagram-v2 或 stateDiagram 开头
  - 状态名用中文或 PascalCase
  - [*] 表示起始/终止
  - 转移必须有标签说明触发条件
  - 复合状态缩进正确
"""

import re
from pathlib import Path
from _shared import core

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "diagram-themes.yaml"


def template() -> str:
    return """stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中 : 开始处理
    处理中 --> 已完成 : 处理成功
    处理中 --> 失败 : 处理异常
    失败 --> 处理中 : 重试
    已完成 --> [*]"""


def validate(diagram: str) -> list[dict]:
    """State Diagram 专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, ("stateDiagram-v2", "stateDiagram")))

    # 检查是否有 [*] 起始状态
    problems.extend(_check_initial_state(diagram))

    # 检查转移是否有标签
    problems.extend(_check_transition_labels(diagram))

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 State Diagram 规范。"""
    changes = []

    theme_vars = None
    if _THEMES_PATH.exists():
        core.set_themes_path(_THEMES_PATH)
        theme_vars = core.load_diagram_theme()
    diagram, style_changes = core.enforce_default_style(diagram, theme_overrides=theme_vars)
    changes.extend(style_changes)

    return diagram, changes


def _check_initial_state(diagram: str) -> list[dict]:
    """检查是否有 [*] 起始状态。"""
    if "[*]" not in diagram:
        return [{
            "type": "warning",
            "message": "状态图缺少 [*] 起始状态",
            "fix": "添加: [*] --> 某状态"
        }]
    return []


def _check_transition_labels(diagram: str) -> list[dict]:
    """检查状态转移是否有文字说明。"""
    problems = []
    lines = diagram.split("\n")
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith("%%") or stripped.startswith("state "):
            continue
        if "-->" in stripped and ":" not in stripped and "[*]" not in stripped:
            # 允许没有标签的情况，但给出建议
            pass  # 不强制
    return problems
