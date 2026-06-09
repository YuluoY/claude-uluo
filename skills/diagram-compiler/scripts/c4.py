"""Mermaid C4 Architecture 脚本。

支持 C4 模型的 5 种图：Context（系统上下文）、Container（容器）、
Component（组件）、Dynamic（动态）、Deployment（部署）。
数据驱动优先：AI 构建结构化数据 → data_to_diagram() → Mermaid C4。

强制规则：
  - 必须以 C4Context/C4Container/C4Component/C4Dynamic/C4Deployment 开头
  - Entity 类型必须与图级别匹配
  - Rel 关系必须引用已声明的 entity
"""

import re
from pathlib import Path
from _shared import core

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "diagram-themes.yaml"

# C4 图级别 → 可用 entity 类型
LEVEL_ENTITIES = {
    "context": ["Person", "Person_Ext", "System", "System_Ext", "SystemDb", "SystemDb_Ext",
                "Boundary", "Enterprise_Boundary", "System_Boundary"],
    "container": ["Person", "Person_Ext", "System", "System_Ext", "SystemDb", "SystemDb_Ext",
                  "Container", "ContainerDb", "Container_Ext", "ContainerDb_Ext",
                  "Boundary", "Enterprise_Boundary", "System_Boundary", "Container_Boundary"],
    "component": ["Person", "Person_Ext", "System", "System_Ext", "SystemDb", "SystemDb_Ext",
                  "Container", "ContainerDb", "Container_Ext", "ContainerDb_Ext",
                  "Component", "ComponentDb", "Component_Ext", "ComponentDb_Ext",
                  "Boundary", "Enterprise_Boundary", "System_Boundary", "Container_Boundary"],
    "dynamic": ["Person", "Person_Ext", "System", "System_Ext",
                "Container", "Container_Ext", "Component", "Component_Ext",
                "Boundary"],
    "deployment": ["Deployment_Node", "Node", "Node_L", "Node_R",
                   "Person", "Person_Ext", "System", "System_Ext",
                   "Container", "Container_Ext",
                   "Boundary"],
}

DATA_SCHEMA = """\
数据格式 (YAML):

title: "系统架构图"                    # 可选
level: "context"                       # 必填: context | container | component | dynamic | deployment
entities:                              # 至少 1 个
  - id: "customer"                     # 唯一标识（ASCII，无空格）
    type: "Person"                     # 实体类型（见下方说明）
    name: "银行客户"                   # 显示名称
    description: "使用网银的个人客户"   # 可选描述
    boundary: "外部"                   # 可选，归属的 Boundary 名称
  - id: "bankingSystem"
    type: "System"
    name: "网银系统"
    description: "核心网银服务"
relationships:                         # 可选
  - from: "customer"                   # 源实体 id
    to: "bankingSystem"                # 目标实体 id
    label: "使用"                      # 关系标签
    direction: "forward"               # 可选: forward | back | bidirectional
boundaries:                            # 可选，分组边界
  - name: "内部系统"
    entities: ["bankingSystem"]        # 包含的实体 id 列表

Context 级别可用类型: Person, Person_Ext, System, System_Ext, SystemDb, SystemDb_Ext
Container 级别额外可用: Container, ContainerDb, Container_Ext, ContainerDb_Ext
Component 级别额外可用: Component, ComponentDb, Component_Ext, ComponentDb_Ext
"""


def template() -> str:
    """返回 Mermaid C4 语法示例。"""
    return """C4Context
    title 网银系统上下文图
    Person(customer, "银行客户", "使用网银的个人客户")
    System(bankingSystem, "网银系统", "核心在线银行服务")
    System_Ext(mailSystem, "邮件系统", "发送通知邮件")
    System_Ext(mainframe, "核心银行主机", "存储账户数据")

    Rel(customer, bankingSystem, "使用")
    Rel(bankingSystem, mailSystem, "发送邮件")
    Rel(bankingSystem, mainframe, "查询账户")"""


def data_to_diagram(data: dict) -> str:
    """结构化数据 → Mermaid C4 代码。"""
    level = data.get("level", "context")
    level_map = {
        "context": "C4Context",
        "container": "C4Container",
        "component": "C4Component",
        "dynamic": "C4Dynamic",
        "deployment": "C4Deployment",
    }
    header = level_map.get(level, "C4Context")

    lines = [header]

    title = data.get("title", "")
    if title:
        lines.append(f"    title {title}")
    lines.append("")

    # 按 boundary 分组
    entities = data.get("entities", [])
    boundaries = data.get("boundaries", [])
    boundary_map = {}
    for boundary in boundaries:
        boundary_map[boundary.get("name", "")] = boundary.get("entities", [])

    unbound = []
    bound_entities = {}
    for b_name, b_ids in boundary_map.items():
        for eid in b_ids:
            bound_entities[eid] = b_name
    for entity in entities:
        eid = entity.get("id", "")
        if eid not in bound_entities:
            unbound.append(entity)

    # 输出 bound entities（在 Boundary 块内）
    for boundary in boundaries:
        b_name = boundary.get("name", "")
        b_label = boundary.get("label", b_name)
        b_type = boundary.get("type", "System_Boundary")
        b_ids = boundary.get("entities", [])
        b_entities = [e for e in entities if e.get("id") in b_ids]

        lines.append(f"    {b_type}({_safe_id(b_name)}, \"{b_label}\") {{")
        for entity in b_entities:
            _emit_entity(lines, entity)
        lines.append("    }")
        lines.append("")

    # 输出 unbound entities
    for entity in unbound:
        _emit_entity(lines, entity)
    if unbound:
        lines.append("")

    # 关系
    relationships = data.get("relationships", [])
    for rel in relationships:
        from_id = rel.get("from", "")
        to_id = rel.get("to", "")
        label = rel.get("label", "")
        direction = rel.get("direction", "forward")

        if direction == "back":
            rel_fn = "Rel_Back"
        elif direction == "bidirectional":
            rel_fn = "Rel_Bi"
        else:
            rel_fn = "Rel"

        if label:
            lines.append(f"    {rel_fn}({from_id}, {to_id}, \"{label}\")")
        else:
            lines.append(f"    {rel_fn}({from_id}, {to_id}, \"\")")

    return "\n".join(lines)


def _safe_id(text: str) -> str:
    """确保 ID 不含空格和特殊字符。"""
    return re.sub(r'[^a-zA-Z0-9_]', '_', text)


def _emit_entity(lines: list[str], entity: dict):
    """输出一个 C4 实体声明行。"""
    eid = entity.get("id", "")
    etype = entity.get("type", "System")
    name = entity.get("name", "")
    desc = entity.get("description", "")
    if desc:
        lines.append(f'    {etype}({eid}, "{name}", "{desc}")')
    else:
        lines.append(f'    {etype}({eid}, "{name}")')


def validate(diagram: str) -> list[dict]:
    """C4 专属校验规则。"""
    problems = []

    c4_keywords = ("C4Context", "C4Container", "C4Component", "C4Dynamic", "C4Deployment")
    problems.extend(core.assert_starts_with(diagram, c4_keywords))

    # 确定图级别
    first_line = diagram.strip().split("\n")[0].strip()
    level_key = first_line if first_line in c4_keywords else "C4Context"
    level_map = {
        "C4Context": "context",
        "C4Container": "container",
        "C4Component": "component",
        "C4Dynamic": "dynamic",
        "C4Deployment": "deployment",
    }
    level = level_map.get(level_key, "context")
    allowed = set(LEVEL_ENTITIES.get(level, []))

    # 检查实体类型是否与图级别匹配
    for i, line in enumerate(diagram.split("\n"), 1):
        m = re.match(r'\s*(\w+)\(', line)
        if m and not line.strip().startswith("title") and not line.strip().startswith("Rel"):
            etype = m.group(1)
            if etype not in allowed and etype not in ("title", "UpdateRelText", "UpdateLayoutConfig"):
                if not etype.endswith("_Boundary") and etype not in ("Boundary",):
                    problems.append({
                        "type": "warning",
                        "line": i,
                        "message": f"实体类型 '{etype}' 不适用于 {level_key} 级别图",
                        "fix": f"使用 {level} 级别支持的类型"
                    })

    # 检查是否有实体声明
    entities = re.findall(r'\s*(\w+)\((\w+)', diagram)
    if not entities:
        problems.append({
            "type": "error",
            "message": "C4 图没有任何实体声明",
            "fix": "添加至少一个 Person/System/Container 实体"
        })

    # 检查 Rel 关系引用是否有效
    declared_ids = {e[1] for e in entities if e[0] not in ("Rel", "Rel_Back", "Rel_Bi", "BiRel", "UpdateRelText")}
    for i, line in enumerate(diagram.split("\n"), 1):
        m = re.match(r'\s*(Rel|Rel_Back|Rel_Bi|BiRel)\((\w+),\s*(\w+)', line)
        if m:
            from_id, to_id = m.group(2), m.group(3)
            if from_id not in declared_ids:
                problems.append({
                    "type": "error",
                    "line": i,
                    "message": f"关系引用未声明的实体: '{from_id}'",
                    "fix": f"先声明实体 {from_id}"
                })
            if to_id not in declared_ids:
                problems.append({
                    "type": "error",
                    "line": i,
                    "message": f"关系引用未声明的实体: '{to_id}'",
                    "fix": f"先声明实体 {to_id}"
                })

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 C4 规范。"""
    changes = []

    theme_vars = None
    if _THEMES_PATH.exists():
        core.set_themes_path(_THEMES_PATH)
        theme_vars = core.load_diagram_theme()
    diagram, style_changes = core.enforce_default_style(diagram, theme_overrides=theme_vars)
    changes.extend(style_changes)

    return diagram, changes
