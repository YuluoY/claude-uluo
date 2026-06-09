"""Mermaid Quadrant Chart 象限图脚本。

用于技术选型矩阵、风险评估、竞品分析等 2D 象限定位场景。
数据驱动优先：AI 构建结构化数据 → data_to_diagram() → Mermaid quadrantChart。

强制规则：
  - 必须以 quadrantChart 开头
  - title/x-axis/y-axis 必须声明
  - 4 个象限标签必须齐全
  - 每个 item 的 x/y 坐标在 [0, 1] 范围内
  - 每个 item 必须有 label 和 [x, y] 坐标
"""

import re
import math
from pathlib import Path
from _shared import core

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "diagram-themes.yaml"

DATA_SCHEMA = """\
数据格式 (YAML):

title: "图表标题"                    # 必填
x_axis:                              # 必填
  label: "X轴名称"
  low: "低端标签"                     # 如 "实现简单"
  high: "高端标签"                    # 如 "实现复杂"
y_axis:                              # 必填
  label: "Y轴名称"
  low: "低端标签"                     # 如 "业务价值低"
  high: "高端标签"                    # 如 "业务价值高"
quadrants:                           # 必填，4个象限标签（顺序：右上、左上、左下、右下）
  - "优先投入"                        # quadrant-1: 右上 (高X, 高Y)
  - "逐步优化"                        # quadrant-2: 左上 (低X, 高Y)
  - "暂缓"                            # quadrant-3: 左下 (低X, 低Y)
  - "谨慎投入"                        # quadrant-4: 右下 (高X, 低Y)
items:                                # 至少1个
  - label: "项目A"
    x: 0.75                           # 0.0-1.0，在X轴上的位置
    y: 0.85                           # 0.0-1.0，在Y轴上的位置
    radius: 12                        # 可选，气泡大小（默认10）
  - label: "项目B"
    x: 0.35
    y: 0.60
    radius: 10
"""


def template() -> str:
    """返回 Mermaid 象限图语法示例。"""
    return """quadrantChart
    title 技术选型分析
    x-axis "实现简单" --> "实现复杂"
    y-axis "业务价值低" --> "业务价值高"
    quadrant-1 "优先投入"
    quadrant-2 "逐步优化"
    quadrant-3 "暂缓"
    quadrant-4 "谨慎投入"
    "微服务架构": [0.75, 0.85]
    "单体应用": [0.30, 0.60]
    "Serverless": [0.60, 0.70]
    "边缘计算": [0.40, 0.30]"""


def data_to_diagram(data: dict) -> str:
    """结构化数据 → Mermaid quadrantChart 代码。"""
    lines = ["quadrantChart"]

    title = data.get("title", "")
    if title:
        lines.append(f"    title {title}")

    # x-axis
    x_axis = data.get("x_axis", {})
    x_label = x_axis.get("label", "")
    x_low = x_axis.get("low", "")
    x_high = x_axis.get("high", "")
    if x_low or x_high or x_label:
        low_part = f'"{x_low}"' if x_low else '""'
        high_part = f'"{x_high}"' if x_high else '""'
        lines.append(f"    x-axis {low_part} --> {high_part}")

    # y-axis
    y_axis = data.get("y_axis", {})
    y_label = y_axis.get("label", "")
    y_low = y_axis.get("low", "")
    y_high = y_axis.get("high", "")
    if y_low or y_high or y_label:
        low_part = f'"{y_low}"' if y_low else '""'
        high_part = f'"{y_high}"' if y_high else '""'
        lines.append(f"    y-axis {low_part} --> {high_part}")

    # quadrants
    quadrants = data.get("quadrants", [])
    for i in range(4):
        label = quadrants[i] if i < len(quadrants) else f"象限{i+1}"
        lines.append(f'    quadrant-{i+1} "{label}"')

    # items
    items = data.get("items", [])
    for item in items:
        label = item.get("label", "")
        x = item.get("x", 0.5)
        y = item.get("y", 0.5)
        radius = item.get("radius")
        if radius is not None:
            lines.append(f'    "{label}": [{x}, {y}] radius: {radius}')
        else:
            lines.append(f'    "{label}": [{x}, {y}]')

    return "\n".join(lines)


def validate(diagram: str) -> list[dict]:
    """Quadrant Chart 专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, "quadrantChart"))

    # 检查 title 声明
    if "title " not in diagram and "title\t" not in diagram:
        problems.append({
            "type": "warning",
            "message": "象限图缺少 title",
            "fix": "添加: title 图表标题"
        })

    # 检查坐标轴
    if "x-axis" not in diagram:
        problems.append({
            "type": "error",
            "message": "象限图缺少 x-axis 声明",
            "fix": '添加: x-axis "低" --> "高"'
        })
    if "y-axis" not in diagram:
        problems.append({
            "type": "error",
            "message": "象限图缺少 y-axis 声明",
            "fix": '添加: y-axis "低" --> "高"'
        })

    # 检查 4 个象限
    for i in range(1, 5):
        if f"quadrant-{i}" not in diagram:
            problems.append({
                "type": "warning",
                "message": f"缺少 quadrant-{i} 声明",
                "fix": f'添加: quadrant-{i} "象限{i}标签"'
            })

    # 检查数据点
    points = re.findall(r'"[^"]+"\s*:\s*\[[\d.]+,\s*[\d.]+\]', diagram)
    if not points:
        problems.append({
            "type": "warning",
            "message": "象限图没有任何数据点",
            "fix": '添加数据点: "项目名": [x, y]'
        })

    # 检查坐标范围
    for i, line in enumerate(diagram.split("\n"), 1):
        m = re.search(r'\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]', line)
        if m and not line.strip().startswith(("%%", "title", "quadrant", "x-axis", "y-axis")):
            x_val = float(m.group(1))
            y_val = float(m.group(2))
            if x_val < 0 or x_val > 1:
                problems.append({
                    "type": "warning",
                    "line": i,
                    "message": f"数据点 X 坐标 ({x_val}) 超出 [0, 1] 范围",
                    "fix": "将 X 坐标调整到 0.0-1.0 之间"
                })
            if y_val < 0 or y_val > 1:
                problems.append({
                    "type": "warning",
                    "line": i,
                    "message": f"数据点 Y 坐标 ({y_val}) 超出 [0, 1] 范围",
                    "fix": "将 Y 坐标调整到 0.0-1.0 之间"
                })

    # 检查数据点数量（不超过 30 个，否则象限图拥挤）
    if len(points) > 30:
        problems.append({
            "type": "quality",
            "message": f"数据点 ({len(points)} 个) 过多，象限图会拥挤",
            "fix": "精简到 20 个以内，或拆分为多个象限图"
        })

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Quadrant Chart 规范。"""
    changes = []

    theme_vars = None
    if _THEMES_PATH.exists():
        core.set_themes_path(_THEMES_PATH)
        theme_vars = core.load_diagram_theme()
    diagram, style_changes = core.enforce_default_style(diagram, theme_overrides=theme_vars)
    changes.extend(style_changes)

    return diagram, changes
