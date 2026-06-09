"""Mermaid Git Graph 脚本。

强制规则：
  - 必须以 gitGraph 开头
  - branch 名称语义化 (main, develop, feature/xxx)
  - commit 应带 id/tag 标注
  - checkout 用于切换分支
  - merge 用于合并
"""

import re
from _shared import core


def template() -> str:
    return (
        "gitGraph\n"
        '    commit id: "初始提交"\n'
        '    branch develop\n'
        '    checkout develop\n'
        '    commit id: "功能A"\n'
        '    commit id: "功能B"\n'
        '    checkout main\n'
        '    merge develop tag: "v1.0.0"\n'
    )


def validate(diagram: str) -> list[dict]:
    """Git Graph 专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, "gitGraph"))

    # 至少有一个 branch
    problems.extend(_check_has_branch(diagram))

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Git Graph 规范。"""
    changes = []

    diagram, style_changes = core.enforce_default_style(diagram)
    changes.extend(style_changes)

    return diagram, changes


def _check_has_branch(diagram: str) -> list[dict]:
    """检查至少有一个分支声明。"""
    if "branch " not in diagram:
        return [{
            "type": "quality",
            "message": "gitGraph 没有分支声明，只有主线提交",
            "fix": "添加 branch 声明以展示分支图"
        }]
    return []
