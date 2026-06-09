"""Mermaid ER Diagram 实体关系图脚本。

强制规则：
  - 必须以 erDiagram 开头
  - 实体名用中文（带英文注释可选）
  - 关系用 ||--o{ 等标准基数语法
  - 属性必须标注类型（int/varchar/datetime 等）
  - PK/FK 必须标注
"""

import re
from pathlib import Path
from _shared import core

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "diagram-themes.yaml"


def template() -> str:
    return """erDiagram
    用户 {
        int id PK
        varchar name
        varchar email UK
        datetime createdAt
    }
    订单 {
        int id PK
        int userId FK
        decimal amount
        varchar status
        datetime createdAt
    }
    用户 ||--o{ 订单 : 拥有"""


def validate(diagram: str) -> list[dict]:
    """ER 图专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, "erDiagram"))

    # 检查实体是否有至少一个 PK
    problems.extend(_check_primary_keys(diagram))

    # 检查是否有关系声明
    problems.extend(_check_has_relationships(diagram))

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 ER 图规范。"""
    changes = []

    theme_vars = None
    if _THEMES_PATH.exists():
        core.set_themes_path(_THEMES_PATH)
        theme_vars = core.load_diagram_theme()
    diagram, style_changes = core.enforce_default_style(diagram, theme_overrides=theme_vars)
    changes.extend(style_changes)

    return diagram, changes


def _check_primary_keys(diagram: str) -> list[dict]:
    """检查每个实体是否有 PK。"""
    problems = []
    entities_with_pk = set()

    for line in diagram.split("\n"):
        m = re.match(r'\s*(\S+)\s*\{', line)
        if m:
            entity_name = m.group(1)
            # 实体开始，找 PK
            entities_with_pk.add(entity_name)
        if "PK" in line and "FK" not in line:
            # 有 PK
            pass  # 保持实体在集合中

    # 检查哪些实体没有 PK（简化逻辑：检查实体定义块）
    in_entity = False
    entity_name = ""
    has_pk = False
    entity_lines = {}

    for i, line in enumerate(diagram.split("\n"), 1):
        m = re.match(r'\s*(\S+)\s*\{', line)
        if m and not in_entity:
            in_entity = True
            entity_name = m.group(1)
            has_pk = False
            entity_lines[entity_name] = {"has_pk": False, "line": i}
        elif in_entity and "PK" in line:
            entity_lines[entity_name]["has_pk"] = True
        elif in_entity and "}" in line:
            in_entity = False
            entity_name = ""

    for name, info in entity_lines.items():
        if not info["has_pk"]:
            problems.append({
                "type": "warning",
                "line": info["line"],
                "message": f"实体 '{name}' 缺少主键 (PK)",
                "fix": "为实体添加主键字段，如: int id PK"
            })

    return problems


def _check_has_relationships(diagram: str) -> list[dict]:
    """检查是否有实体关系声明。"""
    has_rel = any(
        re.search(r'\|\|--|\}--|\|--o|\}--o', line)
        for line in diagram.split("\n")
    )
    entity_count = len(re.findall(r'\b\w+\s*\{', diagram))
    if not has_rel and entity_count > 1:
        return [{
            "type": "quality",
            "message": "存在多个实体但没有关系声明",
            "fix": "添加实体关系: 实体A ||--o{ 实体B : 描述"
        }]
    return []
