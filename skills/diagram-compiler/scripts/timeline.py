"""Mermaid Timeline 时间线脚本。

强制规则：
  - 必须以 timeline 开头
  - 可以有 title
  - section 用于分段
  - 事件格式: 时间点 : 事件描述
  - 同时间段多事件用换行
"""

import re
from _shared import core


def template() -> str:
    return """timeline
    title 项目里程碑
    section 2024年
        1月 : 项目启动
        6月 : MVP 发布
             : 用户反馈收集
        12月 : v1.0 正式版
    section 2025年
        3月 : 功能迭代
        9月 : v2.0 发布
    section 2026年
        规划中 : 国际化扩展"""


def validate(diagram: str) -> list[dict]:
    """Timeline 专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, "timeline"))

    # 检查是否有事件
    problems.extend(_check_has_events(diagram))

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Timeline 规范。"""
    changes = []

    diagram, style_changes = core.enforce_default_style(diagram)
    changes.extend(style_changes)

    return diagram, changes


def _check_has_events(diagram: str) -> list[dict]:
    """检查时间线是否有事件。"""
    events = [l for l in diagram.split("\n")
              if ':' in l and not l.strip().startswith("%%") and not l.strip().startswith("title ")
              and not l.strip().startswith("section ")]
    if len(events) < 2:
        return [{
            "type": "quality",
            "message": f"时间线只有 {len(events)} 个事件",
            "fix": "添加更多时间点事件"
        }]
    return []


# ═══════════════════════════════════════════════════════════════
#  Matplotlib 渲染
# ═══════════════════════════════════════════════════════════════

def render(data: dict, output_path: Path, theme: dict | None = None, dpi: int = 150) -> Path:
    """Matplotlib timeline renderer.

    data = {"title": "...", "events": [
        {"date": "2023-01", "text": "...", "section": "2023 H1", "highlight": False}, ...
    ]}
    """
    import datetime as _dt
    import matplotlib as _mpl
    import matplotlib.pyplot as _plt
    import matplotlib.dates as _mdates
    import logging
    logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)

    from _shared.fonts import setup_cjk_fonts
    setup_cjk_fonts()

    _COLORS = {
        "figure_bg": "#ffffff", "text": "#333333", "title": "#1a1a1a",
        "section": "#5b9bd5", "event_dot": "#5b9bd5", "connector": "#cccccc",
        "highlight": "#ed7d31", "grid": "#e8e8e8",
    }
    colors = dict(_COLORS)
    if theme:
        colors.update({k: v for k, v in theme.items() if k in colors})

    events = data.get("events", [])
    title = data.get("title", "")
    if not events:
        raise ValueError("No events defined")

    def _parse_date(s):
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m", "%Y"):
            try:
                return _dt.datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        raise ValueError(f"Cannot parse date: {s}")

    dates = [_parse_date(e["date"]) for e in events]
    t_min, t_max = min(dates), max(dates)
    date_range = max((t_max - t_min).days, 30)

    sections = {}
    for e in events:
        sec = e.get("section", "")
        sections.setdefault(sec, []).append(e)

    fig_w = max(12, 8 + date_range / 30 * 2)
    fig_h = max(5, len(sections) * 1.2 + 2)
    fig, ax = _plt.subplots(figsize=(fig_w, fig_h), facecolor=colors["figure_bg"])
    ax.set_facecolor(colors["figure_bg"])

    ax.axhline(y=0, color=colors["connector"], linewidth=2, zorder=1)
    ax.xaxis.set_major_locator(_mdates.MonthLocator(interval=max(1, date_range // 180)))
    ax.xaxis.set_major_formatter(_mdates.DateFormatter("%Y-%m"))
    ax.set_xlim(_mdates.date2num(t_min) - date_range * 0.05,
                _mdates.date2num(t_max) + date_range * 0.05)

    section_names = list(sections.keys())
    for si, sec_name in enumerate(section_names):
        sec_events = sections[sec_name]
        y_offset = -(si + 1) * 1.5
        ax.text(_mdates.date2num(t_min) - date_range * 0.04, y_offset,
                sec_name, ha="right", va="center",
                fontsize=10, fontweight="bold", color=colors["section"], zorder=3)
        for ei, event in enumerate(sec_events):
            d = _parse_date(event["date"])
            dx = _mdates.date2num(d)
            is_hl = event.get("highlight", False)
            mc = colors["highlight"] if is_hl else colors["event_dot"]
            ms = 120 if is_hl else 60
            ax.scatter(dx, y_offset, s=ms, color=mc, edgecolor="white", linewidth=1.5, zorder=4)
            ly = y_offset + 0.3 if ei % 2 == 0 else y_offset - 0.5
            va = "bottom" if ei % 2 == 0 else "top"
            ax.text(dx, ly, event["text"], ha="center", va=va,
                    fontsize=10 if is_hl else 9, fontweight="bold" if is_hl else "normal",
                    color=colors["text"], rotation=35 if ei % 3 == 1 else 0, zorder=5, clip_on=False)

    ax.set_ylim(-(len(sections) + 0.5) * 1.5, 1)
    ax.set_yticks([])
    for spine in ("top", "right", "left"):
        ax.spines[spine].set_visible(False)
    ax.spines["bottom"].set_color("#ccc")
    ax.tick_params(axis="x", colors="#888", labelsize=9)
    ax.grid(axis="x", color=colors["grid"], linewidth=0.5, alpha=0.5)
    ax.set_axisbelow(True)
    if title:
        ax.set_title(title, fontsize=16, fontweight="bold", color=colors["title"], pad=16)
    fig.tight_layout()
    fig.savefig(output_path, dpi=dpi, facecolor=colors["figure_bg"], edgecolor="none", bbox_inches="tight")
    _plt.close(fig)
    return output_path
