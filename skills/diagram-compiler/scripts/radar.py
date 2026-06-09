"""Radar Chart 雷达图脚本。

用于多维度技术对比、能力评估、竞品分析等场景。
⚠️ Mermaid CLI 不支持 radar 图表类型，使用 Matplotlib render() 作为主渲染路径。
data_to_diagram() 仅生成 Mermaid 语法预览（不可通过 mmdc 导出）。

数据驱动：AI 构建结构化数据 → render() → PNG/SVG 输出。

强制规则：
  - 至少 3 个轴（维度）
  - 所有 series 的 values 数量必须与 axes 数量一致
  - values 范围建议 0-10
"""

import re
import math
from pathlib import Path
from _shared import core

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "diagram-themes.yaml"

DATA_SCHEMA = """\
⚠️ Mermaid CLI 不支持 radar 图表，使用 Matplotlib render() 渲染。
数据格式 (YAML):

title: "技术方案多维对比"              # 可选
axes:                                  # 必填，至少 3 个维度
  - "性能"
  - "可维护性"
  - "开发效率"
  - "社区生态"
  - "学习成本"
  - "扩展性"
items:                                 # 必填，至少 1 个
  - label: "方案A: 微服务"
    values: [8, 7, 5, 9, 4, 9]        # 每个维度 0-10 分
  - label: "方案B: 单体应用"
    values: [6, 5, 9, 6, 8, 4]
  - label: "方案C: 模块化单体"
    values: [7, 8, 7, 7, 6, 7]
max_value: 10                          # 可选，默认 10

渲染方式:
  python -c "import radar; radar.render(data, 'output.png')"
"""


def template() -> str:
    """返回 Mermaid 雷达图语法示例。"""
    return """radar
    title 技术方案对比
    axis 性能, 可维护性, 开发效率, 社区生态, 学习成本
    series "方案A": 8, 7, 5, 9, 4
    series "方案B": 6, 5, 9, 6, 8"""


def data_to_diagram(data: dict) -> str:
    """结构化数据 → Mermaid radar 代码（preview 用）。"""
    lines = ["radar"]

    title = data.get("title", "")
    if title:
        lines.append(f"    title {title}")

    axes = data.get("axes", [])
    if axes:
        axes_str = ", ".join(axes)
        lines.append(f"    axis {axes_str}")

    items = data.get("items", [])
    for item in items:
        label = item.get("label", "")
        values = item.get("values", [])
        vals_str = ", ".join(str(v) for v in values)
        lines.append(f'    series "{label}": {vals_str}')

    return "\n".join(lines)


def _hex_to_rgba(hex_color: str, alpha: float = 0.25) -> tuple:
    """Hex → (r, g, b, a) for 0-1 range."""
    c = hex_color.lstrip("#")
    r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
    return (r / 255, g / 255, b / 255, alpha)


def render(data: dict, output_path: Path, theme: dict | None = None,
           dpi: int = 150, figure_bg: str = "#ffffff") -> Path:
    """Matplotlib 雷达图渲染器。

    data = {
      "title": "技术方案对比",
      "axes": ["性能", "可维护性", ...],
      "items": [{"label": "方案A", "values": [8, 7, 5, ...]}, ...],
      "max_value": 10,
    }
    """
    import matplotlib as _mpl
    import matplotlib.pyplot as _plt
    import numpy as _np
    from _shared.fonts import setup_cjk_fonts
    setup_cjk_fonts()

    DEFAULT_COLORS = [
        "#5470c6", "#91cc75", "#fac858", "#ee6666",
        "#73c0de", "#3ba272", "#fc8452", "#9a60b4",
    ]

    axes = data.get("axes", [])
    items = data.get("items", [])
    title = data.get("title", "")
    max_value = data.get("max_value", 10)

    n_axes = len(axes)
    if n_axes < 3:
        raise ValueError("雷达图至少需要 3 个维度")

    # Compute angles
    angles = [n / float(n_axes) * 2 * math.pi for n in range(n_axes)]
    angles += angles[:1]  # close the circle

    fig, ax = _plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True),
                             facecolor=figure_bg)
    ax.set_facecolor(figure_bg)

    # Draw each item
    for i, item in enumerate(items):
        values = item.get("values", [])
        label = item.get("label", f"系列{i+1}")
        if len(values) != n_axes:
            raise ValueError(f"'{label}' 的 values 数量 ({len(values)}) 与 axes ({n_axes}) 不匹配")

        values_closed = values + values[:1]
        color = DEFAULT_COLORS[i % len(DEFAULT_COLORS)]

        ax.fill(angles, values_closed, alpha=0.15, color=color)
        ax.plot(angles, values_closed, 'o-', linewidth=2, color=color,
                label=label, markersize=6)

    # Axis labels
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(axes, fontsize=11)
    ax.set_ylim(0, max_value)

    # Grid and ticks
    ax.set_rlabel_position(30)
    ax.tick_params(axis='y', labelsize=8, colors='#888888')

    # Legend
    if len(items) > 1:
        ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1),
                  fontsize=10, framealpha=0.9)

    if title:
        ax.set_title(title, fontsize=15, fontweight='bold', pad=25, color='#1a1a1a')

    fig.tight_layout()
    fig.savefig(output_path, dpi=dpi, facecolor=figure_bg, edgecolor="none",
                bbox_inches="tight")
    _plt.close(fig)
    return output_path


def validate(diagram: str) -> list[dict]:
    """Radar Chart 专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, "radar"))

    # 检查 axis 声明
    if "axis " not in diagram and "axis\t" not in diagram:
        problems.append({
            "type": "error",
            "message": "雷达图缺少 axis 声明",
            "fix": "添加: axis 维度1, 维度2, 维度3"
        })

    # 检查 series 数量
    series_count = len(re.findall(r'series\s+"[^"]*"\s*:', diagram))
    if series_count == 0:
        problems.append({
            "type": "warning",
            "message": "雷达图没有任何 series",
            "fix": "添加至少一个 series"
        })

    # 检查 values 数量一致性
    axis_line = ""
    for line in diagram.split("\n"):
        if line.strip().startswith("axis "):
            axis_line = line.strip()
            break

    axis_count = len(re.findall(r'[^,\s]+', axis_line.replace("axis ", ""))) if axis_line else 0
    if axis_count > 0:
        for i, line in enumerate(diagram.split("\n"), 1):
            m = re.search(r'series\s+"[^"]*"\s*:\s*(.*)', line)
            if m:
                vals = [v.strip() for v in m.group(1).split(",") if v.strip()]
                if len(vals) != axis_count:
                    problems.append({
                        "type": "error",
                        "line": i,
                        "message": f"series 有 {len(vals)} 个值，但 axis 声明了 {axis_count} 个维度",
                        "fix": f"调整为 {axis_count} 个值，与 axis 数量一致"
                    })

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Radar 规范。"""
    changes = []

    theme_vars = None
    if _THEMES_PATH.exists():
        core.set_themes_path(_THEMES_PATH)
        theme_vars = core.load_diagram_theme()
    diagram, style_changes = core.enforce_default_style(diagram, theme_overrides=theme_vars)
    changes.extend(style_changes)

    return diagram, changes
