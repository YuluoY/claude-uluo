"""Mermaid Flowchart 图表脚本。

覆盖：流程图 (flowchart)、架构图 (architecture)、分层模块图 (layered)。
强制规则：
  - 必须以 flowchart TD/LR/TB/RL/BT 或 graph TD/LR/TB/RL/BT 开头
  - 方向选择：流程用 TD，宽架构用 LR
  - subgraph 最多嵌套 3 层
  - 节点 ID 语义化
  - 禁止 end 作节点标签
"""

import re
from pathlib import Path
from _shared import core

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "diagram-themes.yaml"

TYPE_KEYWORDS = ("flowchart", "graph")


def template() -> str:
    return """flowchart TD
    A[开始] --> B{判断条件}
    B -->|是| C[处理A]
    B -->|否| D[处理B]
    C --> E[结束]
    D --> E"""


def architecture_template() -> str:
    return """flowchart TB
    subgraph Frontend["前端层"]
        A[Web App]
        B[Mobile App]
    end
    subgraph Backend["后端服务层"]
        C[API Gateway]
        D[Business Service]
    end
    subgraph Data["数据层"]
        E[(Database)]
        F[(Cache)]
    end
    A --> C
    B --> C
    C --> D
    D --> E
    D --> F"""


def layered_template() -> str:
    return """flowchart TB
    subgraph Layer1["表现层 Presentation"]
        direction LR
        C[Controller]
        V[View]
    end
    subgraph Layer2["应用层 Application"]
        direction LR
        AS[AppService]
        DTO[DTO]
    end
    subgraph Layer3["领域层 Domain"]
        direction LR
        E[Entity]
        VO[ValueObject]
    end
    subgraph Layer4["基础设施层 Infrastructure"]
        direction LR
        R[Repository]
        GW[Gateway]
    end
    Layer1 --> Layer2 --> Layer3 --> Layer4"""


def validate(diagram: str) -> list[dict]:
    """Flowchart 专属校验规则。"""
    problems = []

    # 必须以 flowchart 或 graph 开头
    problems.extend(core.assert_starts_with(diagram, TYPE_KEYWORDS))

    # 检查 end 关键字
    problems.extend(core.check_reserved_node_labels(diagram, "flowchart"))

    # 节点数上限
    problems.extend(core.check_node_count(diagram, max_nodes=40))

    # 标签长度
    problems.extend(core.check_long_labels(diagram, max_len=60))

    # 检查 subgraph 嵌套深度
    problems.extend(_check_subgraph_depth(diagram))

    # 检查是否存在为空的 subgraph
    problems.extend(_check_empty_subgraph(diagram))

    # 检查是否有节点但无连线
    problems.extend(_check_orphan_nodes(diagram))

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Flowchart 规范，返回 (修正后图表, 变更记录)。"""
    changes = []

    # 样式强制（优先使用主题配置）
    theme_vars = None
    if _THEMES_PATH.exists():
        core.set_themes_path(_THEMES_PATH)
        theme_vars = core.load_diagram_theme()
    diagram, style_changes = core.enforce_default_style(diagram, theme_overrides=theme_vars)
    changes.extend(style_changes)

    # 检查并修正 end 标签
    diagram, end_changes = _fix_flowchart_end_labels(diagram)
    changes.extend(end_changes)

    return diagram, changes


def _check_subgraph_depth(diagram: str) -> list[dict]:
    """检查 subgraph 嵌套深度不超过 3 层。"""
    problems = []
    depth = 0
    max_depth = 0

    for i, line in enumerate(diagram.split("\n"), 1):
        stripped = line.strip()
        if re.match(r'subgraph\s+\w+', stripped):
            depth += 1
            if depth > max_depth:
                max_depth = depth
        elif stripped == "end" and depth > 0:
            depth -= 1

    if max_depth > 3:
        problems.append({
            "type": "quality",
            "message": f"subgraph 嵌套深度为 {max_depth}，超过建议上限 (3)",
            "fix": "减少嵌套层数，将深层 subgraph 提升到更高层级"
        })
    return problems


def _check_empty_subgraph(diagram: str) -> list[dict]:
    """检查是否有空的 subgraph。"""
    problems = []
    in_subgraph = False
    subgraph_line = 0
    has_content = False

    for i, line in enumerate(diagram.split("\n"), 1):
        stripped = line.strip()
        if re.match(r'subgraph\s+\w+', stripped):
            in_subgraph = True
            subgraph_line = i
            has_content = False
        elif stripped == "end" and in_subgraph:
            if not has_content:
                problems.append({
                    "type": "warning",
                    "line": subgraph_line,
                    "message": f"subgraph（第 {subgraph_line} 行）内容为空",
                    "fix": "在 subgraph 内添加节点或删除空的 subgraph"
                })
            in_subgraph = False
        elif in_subgraph and stripped and not stripped.startswith("%%") and not stripped.startswith("direction "):
            has_content = True
    return problems


def _check_orphan_nodes(diagram: str) -> list[dict]:
    """检查孤立节点（声明但无连线）。"""
    # 收集声明和引用
    declared = set()
    referenced = set()
    skip_words = {"TD", "TB", "LR", "RL", "BT", "subgraph", "end", "style",
                  "classDef", "direction", "linkStyle", "click"}

    for line in diagram.split("\n"):
        stripped = line.strip()
        if stripped.startswith("%%") or stripped.startswith("style "):
            continue
        # 节点声明
        decls = re.findall(r'\b(\w+)\s*[\[\(\{\(\[\(\"]', stripped)
        for d in decls:
            if d not in skip_words:
                declared.add(d)
        # 连线中的引用
        words = re.findall(r'\b(\w+)\b', stripped)
        for w in words:
            if w not in skip_words and re.match(r'^[A-Za-z]\w*$', w):
                referenced.add(w)

    orphan = declared - referenced
    if orphan and len(orphan) <= 5:
        return [{
            "type": "quality",
            "message": f"孤立节点（无连线）: {', '.join(sorted(orphan))}",
            "fix": "删除无用节点或添加连线"
        }]
    return []


def _fix_flowchart_end_labels(diagram: str) -> tuple[str, list[dict]]:
    """修正 flowchart 中用作标签的 end 关键字。"""
    changes = []
    lines = diagram.split("\n")
    for i, line in enumerate(lines):
        if line.strip().startswith("%%") or line.strip().startswith("style "):
            continue
        # 匹配节点定义中的 end 标签（括号内的独立 end 词）
        def repl_bracket(m):
            full = m.group(0)
            bracket_open = full[0]
            inner = full[1:-1]
            bracket_close = full[-1]
            fixed_inner = re.sub(r'\bend\b', 'End', inner)
            if fixed_inner != inner:
                return bracket_open + fixed_inner + bracket_close
            return full
        new_line = re.sub(
            r'[\[\(\{][^\[\]\(\)\{\}]*\bend\b[^\[\]\(\)\{\}]*[\]\)\}]',
            repl_bracket,
            line,
        )
        if new_line != line:
            changes.append({
                "type": "warning",
                "action": "fixed",
                "line": i + 1,
                "message": f"已将保留字 'end' 修正为 'End'"
            })
            lines[i] = new_line
    return "\n".join(lines), changes
