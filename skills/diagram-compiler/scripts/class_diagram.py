"""Mermaid Class Diagram 类图脚本。

强制规则：
  - 必须以 classDiagram 开头
  - 类名 PascalCase
  - 可见性: + public, - private, # protected
  - 关系明确: <|-- 继承, *-- 组合, o-- 聚合, --> 关联
  - 方法签名完整: methodName(param: Type) ReturnType
"""

import re
from _shared import core


def template() -> str:
    return """classDiagram
    class User {
        -String id
        +String name
        +String email
        +login(password: String) bool
        +logout() void
    }
    class Admin {
        +String role
        +manageUsers() void
    }
    class Order {
        +String orderId
        +Decimal amount
        +create() void
    }
    User <|-- Admin
    User "1" --> "*" Order : 创建"""


def validate(diagram: str) -> list[dict]:
    """Class Diagram 专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, "classDiagram"))

    # 检查类名是否 PascalCase
    problems.extend(_check_class_names(diagram))

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Class Diagram 规范。"""
    changes = []

    diagram, style_changes = core.enforce_default_style(diagram)
    changes.extend(style_changes)

    return diagram, changes


def _check_class_names(diagram: str) -> list[dict]:
    """检查类名是否使用 PascalCase。"""
    problems = []
    for i, line in enumerate(diagram.split("\n"), 1):
        m = re.match(r'\s*class\s+(\w+)', line)
        if m:
            name = m.group(1)
            if not name[0].isupper():
                problems.append({
                    "type": "quality",
                    "line": i,
                    "message": f"类名 '{name}' 应使用 PascalCase",
                    "fix": f"将类名改为 '{name[0].upper() + name[1:]}'"
                })
    return problems
