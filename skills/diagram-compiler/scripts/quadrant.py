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
    radius: 12                        # 可选，气泡大小（默认10，最大12，过大将覆盖文字）
  - label: "项目B"
    x: 0.35
    y: 0.60
    radius: 10

定位约束（避免文字覆盖）：
  - 有数据点时，象限文字渲染在象限顶部：Q1[0.75,0.90] Q2[0.25,0.90] Q3[0.25,0.40] Q4[0.75,0.40]
  - 数据点与象限文字距离 > 0.15，否则点覆盖象限标签
  - 数据点与象限中心距离 > 0.12：Q1[0.75,0.75] Q2[0.25,0.75] Q3[0.25,0.25] Q4[0.75,0.25]
  - 相邻数据点距离 > 0.08，否则标签互相重叠
  - 建议将点放在象限中下部，远离顶部文字区域
  - radius 默认 10，最大 12，过大将覆盖周边文字
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

    # 检查数据点与象限标签重叠
    # Mermaid 渲染规则：有数据点时，象限文字渲染在象限顶部（非中心）
    # Q1 文字约在 [0.75, 0.90]，Q2 文字约在 [0.25, 0.90]
    # Q3 文字约在 [0.25, 0.40]，Q4 文字约在 [0.75, 0.40]
    quadrant_text_pos = [(0.75, 0.90), (0.25, 0.90), (0.25, 0.40), (0.75, 0.40)]
    quadrant_centers = [(0.75, 0.75), (0.25, 0.75), (0.25, 0.25), (0.75, 0.25)]
    point_coords = []
    for line in diagram.split("\n"):
        m = re.search(r'"([^"]+)"\s*:\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]', line)
        if m and not line.strip().startswith(("%%", "title", "quadrant", "x-axis", "y-axis")):
            point_coords.append((m.group(1), float(m.group(2)), float(m.group(3))))

    for label, px, py in point_coords:
        # 检查与象限文字位置的距离
        for i, (tx, ty) in enumerate(quadrant_text_pos, 1):
            dist = math.sqrt((px - tx) ** 2 + (py - ty) ** 2)
            if dist < 0.15:
                problems.append({
                    "type": "quality",
                    "message": f"数据点 '{label}' [{px}, {py}] 距象限 {i} 文字位置过近（距离 {dist:.2f}），点将覆盖象限标签",
                    "fix": f"调整 '{label}' 坐标，远离象限 {i} 文字位置 [{tx}, {ty}]（建议距离 > 0.15）"
                })
        # 检查与象限中心的距离
        for i, (cx, cy) in enumerate(quadrant_centers, 1):
            dist = math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
            if dist < 0.12:
                problems.append({
                    "type": "quality",
                    "message": f"数据点 '{label}' [{px}, {py}] 距象限 {i} 中心过近（距离 {dist:.2f}）",
                    "fix": f"调整 '{label}' 坐标，远离象限 {i} 中心 [{cx}, {cy}]（建议距离 > 0.12）"
                })

    # 检查数据点之间重叠
    for i, (label_a, ax, ay) in enumerate(point_coords):
        for label_b, bx, by in point_coords[i + 1:]:
            dist = math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)
            if dist < 0.08:
                problems.append({
                    "type": "quality",
                    "message": f"数据点 '{label_a}' [{ax}, {ay}] 与 '{label_b}' [{bx}, {by}] 距离过近（{dist:.2f}），标签将重叠",
                    "fix": "调整坐标，使相邻数据点距离 > 0.08"
                })

    # 检查数据点半径过大（覆盖文字）
    for line in diagram.split("\n"):
        m = re.search(r'"([^"]+)"\s*:\s*\[[\d.]+,\s*[\d.]+\]\s*radius:\s*(\d+)', line)
        if m:
            label = m.group(1)
            radius = int(m.group(2))
            if radius > 12:
                problems.append({
                    "type": "quality",
                    "message": f"数据点 '{label}' radius={radius} 过大，气泡将覆盖周边文字",
                    "fix": f"将 radius 调整到 ≤ 12（默认 10），当前 {radius}"
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
