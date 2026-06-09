"""Mermaid Pie Chart 饼图脚本。

强制规则：
  - 必须以 pie 开头
  - 可以有 title
  - 数据项: "标签" : 数值
  - 标签用引号包裹
"""

import re
from pathlib import Path
from _shared import core

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "diagram-themes.yaml"


def template() -> str:
    return """pie
    title 数据分布
    "类别A" : 40
    "类别B" : 30
    "类别C" : 20
    "类别D" : 10"""


def validate(diagram: str) -> list[dict]:
    """Pie Chart 专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, "pie"))

    # 检查至少有 2 个数据项
    problems.extend(_check_min_entries(diagram))

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Pie Chart 规范。"""
    changes = []

    theme_vars = None
    if _THEMES_PATH.exists():
        core.set_themes_path(_THEMES_PATH)
        theme_vars = core.load_diagram_theme()
    diagram, style_changes = core.enforce_default_style(diagram, theme_overrides=theme_vars)
    changes.extend(style_changes)

    return diagram, changes


def _check_min_entries(diagram: str) -> list[dict]:
    """检查饼图至少包含 2 个数据项。"""
    entries = re.findall(r'".+?"\s*:\s*\d+', diagram)
    if len(entries) < 2:
        return [{
            "type": "warning",
            "message": f"饼图只有 {len(entries)} 个数据项，建议至少 2 个",
            "fix": "添加更多数据项"
        }]
    return []


# ═══════════════════════════════════════════════════════════════
#  Matplotlib 渲染
# ═══════════════════════════════════════════════════════════════

def render(data: dict, output_path: Path, theme: dict | None = None, dpi: int = 150) -> Path:
    """Matplotlib pie chart renderer.

    data = {"title": "Traffic Sources", "slices": [{"label": "A", "value": 40}, ...]}
    """
    import matplotlib as _mpl
    import matplotlib.pyplot as _plt

    from _shared.fonts import setup_cjk_fonts
    setup_cjk_fonts()

    _COLORS = {
        "palette": ["#5470c6","#91cc75","#fac858","#ee6666","#73c0de","#3ba272","#fc8452","#9a60b4"],
        "figure_bg": "#ffffff", "text": "#333333", "title": "#1a1a1a", "wedge_edge": "#ffffff",
    }
    colors = dict(_COLORS)
    if theme:
        colors.update({k: v for k, v in theme.items() if k in colors})

    slices = data.get("slices", [])
    title = data.get("title", "")
    labels = [s["label"] for s in slices]
    values = [s["value"] for s in slices]
    palette = colors["palette"]
    wedge_colors = [palette[i % len(palette)] for i in range(len(values))]

    fig, ax = _plt.subplots(figsize=(9, 7), facecolor=colors["figure_bg"])
    ax.set_facecolor(colors["figure_bg"])
    wedges, _texts, autotexts = ax.pie(
        values, labels=None, autopct="%1.1f%%", startangle=90, pctdistance=0.6,
        colors=wedge_colors,
        wedgeprops={"edgecolor": colors["wedge_edge"], "linewidth": 2},
        textprops={"fontsize": 11, "color": colors["text"]},
    )
    for at in autotexts:
        at.set_fontsize(11); at.set_fontweight("bold"); at.set_color("#fff")
    legend_labels = [f"{l}  ({v})" for l, v in zip(labels, values)]
    ax.legend(wedges, legend_labels, title="", loc="center left",
              bbox_to_anchor=(1, 0.5), fontsize=11, framealpha=0.8, edgecolor="#ddd")
    if title:
        ax.set_title(title, fontsize=16, fontweight="bold", color=colors["title"], pad=20)
    fig.tight_layout()
    fig.savefig(output_path, dpi=dpi, facecolor=colors["figure_bg"], edgecolor="none", bbox_inches="tight")
    _plt.close(fig)
    return output_path
