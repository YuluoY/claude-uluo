"""Mermaid Gantt Chart 甘特图脚本。

强制规则：
  - 必须以 gantt 开头
  - dateFormat 必须声明
  - 任务状态: done, active, crit, 或空
  - section 用于分组
  - 里程碑用 milestone
"""

import re
import logging
from pathlib import Path
from _shared import core

logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "diagram-themes.yaml"


def template() -> str:
    return """gantt
    title 项目交付计划
    dateFormat YYYY-MM-DD
    axisFormat %m/%d
    excludes weekends

    section 需求与设计
    需求澄清 :done, req1, 2026-03-02, 2026-03-06
    原型与 PRD :done, req2, after req1, 1w
    技术方案评审 :crit, done, des1, after req2, 4d

    section 开发迭代
    后端接口开发 :active, api1, 2026-03-23, 3w
    前端页面开发 :active, ui1, 2026-03-30, 3w
    联调修复 :dev2, after api1 ui1, 1w

    section 测试与发布
    集成测试 :crit, test1, after dev2, 1w
    UAT 验收 :crit, test2, after test1, 4d
    生产发布 :milestone, rel1, 2026-05-08, 0d"""


def validate(diagram: str) -> list[dict]:
    """Gantt 专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, "gantt"))

    # 必须有 dateFormat
    problems.extend(_check_date_format(diagram))

    # 检查日期格式一致性
    problems.extend(_check_date_consistency(diagram))

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Gantt 规范。"""
    changes = []

    theme_vars = None
    if _THEMES_PATH.exists():
        core.set_themes_path(_THEMES_PATH)
        theme_vars = core.load_diagram_theme()
    diagram, style_changes = core.enforce_default_style(diagram, theme_overrides=theme_vars)
    changes.extend(style_changes)

    return diagram, changes


def _check_date_format(diagram: str) -> list[dict]:
    """检查是否声明了 dateFormat。"""
    if "dateFormat" not in diagram:
        return [{
            "type": "error",
            "message": "甘特图缺少 dateFormat 声明",
            "fix": "添加: dateFormat YYYY-MM-DD"
        }]
    return []


def _check_date_consistency(diagram: str) -> list[dict]:
    """检查日期格式一致性。"""
    problems = []
    fmt_line = ""
    for line in diagram.split("\n"):
        if "dateFormat" in line:
            fmt_line = line.strip()
            break

    if "YYYY-MM-DD" in fmt_line:
        pattern = r'\d{4}-\d{2}-\d{2}'
    elif "YYYY/MM/DD" in fmt_line:
        pattern = r'\d{4}/\d{2}/\d{2}'
    else:
        return []  # 无法判断

    for i, line in enumerate(diagram.split("\n"), 1):
        if "dateFormat" in line or line.strip().startswith("%%") or line.strip().startswith("title "):
            continue
        if re.search(r'\d{2,4}[-/]\d{2}[-/]\d{2}', line):
            if not re.search(pattern, line):
                problems.append({
                    "type": "warning",
                    "line": i,
                    "message": "日期格式与 dateFormat 不一致",
                    "fix": f"将日期改为 {fmt_line.split()[-1]} 格式"
                })

    return problems


# ═══════════════════════════════════════════════════════════════
#  Matplotlib 渲染（纯 Python，无 Chrome 依赖）
# ═══════════════════════════════════════════════════════════════

def render(data: dict, output_path: Path, theme: dict | None = None, dpi: int = 150) -> Path:
    """Render a readable project schedule as a Gantt chart.

    The renderer follows Mermaid's Gantt model: sections group tasks, the x-axis
    is time, the y-axis is the task order, and milestones are timeline markers.
    """
    import datetime as _dt
    import matplotlib as _mpl
    import matplotlib.pyplot as _plt
    import matplotlib.dates as _mdates
    import matplotlib.patches as _mpatches
    from _shared.fonts import setup_cjk_fonts
    setup_cjk_fonts()

    default_colors = {
        "done": {"face": "#b7dfc3", "edge": "#2f9e44", "text": "#14532d"},
        "active": {"face": "#b9dcff", "edge": "#1c7ed6", "text": "#0b4f8a"},
        "crit": {"face": "#ffc9c9", "edge": "#e03131", "text": "#842029"},
        "milestone": {"face": "#845ef7", "edge": "#5f3dc4", "text": "#3b2b77"},
        "default": {"face": "#dee2e6", "edge": "#868e96", "text": "#343a40"},
        "section_header": "#e9ecef",
        "section_bg": "#f8f9fa",
        "section_alt": "#ffffff",
        "grid": "#dfe3e8",
        "dependency": "#7c8794",
        "today": "#d9480f",
        "figure_bg": "#ffffff",
        "axis_text": "#495057",
        "muted_text": "#6c757d",
        "title_text": "#17202a",
    }
    colors = dict(default_colors)
    if theme:
        colors.update({k: v for k, v in theme.items() if k in colors})

    sections = data.get("sections", [])
    milestones = data.get("milestones", [])
    title = data.get("title", "Gantt Chart")
    today_str = data.get("today")
    tick_interval = data.get("tick_interval", "week")
    axis_fmt = data.get("axis_format", "%b %d")

    def _parse_date(value):
        if isinstance(value, _dt.date):
            return value
        for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
            try:
                return _dt.datetime.strptime(value, fmt).date()
            except ValueError:
                continue
        raise ValueError(f"Cannot parse date: {value}")

    def _as_list(value) -> list[str]:
        if not value:
            return []
        if isinstance(value, str):
            return [part for part in re.split(r"[\s,]+", value) if part]
        return list(value)

    def _make_task_row(task: dict, section_index: int) -> dict:
        status = task.get("status", "default")
        if status == "milestone" or task.get("milestone"):
            milestone_date = _parse_date(task.get("date") or task.get("start") or task.get("end"))
            return {
                "kind": "milestone",
                "id": task.get("id"),
                "name": task["name"],
                "date": milestone_date,
                "start": milestone_date,
                "end": milestone_date,
                "status": "milestone",
                "section_index": section_index,
                "depends_on": _as_list(task.get("depends_on")),
            }
        start = _parse_date(task["start"])
        end = _parse_date(task["end"])
        return {
            "kind": "task",
            "id": task.get("id"),
            "name": task["name"],
            "start": start,
            "end": end,
            "status": status or "default",
            "progress": task.get("progress"),
            "section_index": section_index,
            "depends_on": _as_list(task.get("depends_on")),
        }

    parsed_sections = []
    section_ranges = []
    for section_index, section in enumerate(sections):
        task_rows = [_make_task_row(task, section_index) for task in section.get("tasks", [])]
        dated_rows = [row for row in task_rows if row["kind"] != "milestone"]
        if dated_rows:
            section_ranges.append((min(row["start"] for row in dated_rows), max(row["end"] for row in dated_rows)))
        else:
            section_ranges.append((None, None))
        parsed_sections.append({"name": section["name"], "tasks": task_rows})

    milestone_rows_by_section = {section_index: [] for section_index in range(len(parsed_sections))}
    section_name_to_index = {section["name"]: index for index, section in enumerate(sections)}
    for milestone in milestones:
        milestone_date = _parse_date(milestone["date"])
        target_section = section_name_to_index.get(milestone.get("section"))
        if target_section is None:
            for section_index, (range_start, range_end) in enumerate(section_ranges):
                if range_start and range_start <= milestone_date <= range_end + _dt.timedelta(days=21):
                    target_section = section_index
                    break
        if target_section is None:
            target_section = max(0, len(parsed_sections) - 1)
        milestone_rows_by_section[target_section].append({
            "kind": "milestone",
            "id": milestone.get("id"),
            "name": milestone["name"],
            "date": milestone_date,
            "start": milestone_date,
            "end": milestone_date,
            "status": "milestone",
            "section_index": target_section,
            "depends_on": _as_list(milestone.get("depends_on")),
        })

    rows = []
    task_rows_by_id = {}
    for section_index, section in enumerate(parsed_sections):
        rows.append({"kind": "section", "name": section["name"], "section_index": section_index})
        section_rows = section["tasks"] + milestone_rows_by_section[section_index]
        section_rows.sort(key=lambda item: (item["start"], 0 if item["kind"] == "milestone" else 1))
        for row in section_rows:
            rows.append(row)
            if row.get("id"):
                task_rows_by_id[row["id"]] = row

    timeline_rows = [row for row in rows if row["kind"] != "section"]
    if not timeline_rows:
        raise ValueError("No tasks defined")

    all_starts = [row["start"] for row in timeline_rows]
    all_ends = [row["end"] for row in timeline_rows]
    timeline_start = min(all_starts)
    timeline_end = max(all_ends)
    date_range_days = max(1, (timeline_end - timeline_start).days)
    x_min = _mdates.date2num(timeline_start - _dt.timedelta(days=max(2, date_range_days * 0.03)))
    x_max = _mdates.date2num(timeline_end + _dt.timedelta(days=max(5, date_range_days * 0.06)))

    row_count = len(rows)
    fig_width = min(20, max(14, 11 + date_range_days / 20))
    fig_height = max(7, row_count * 0.48 + 1.9)
    fig = _plt.figure(figsize=(fig_width, fig_height), facecolor=colors["figure_bg"])
    grid_spec = fig.add_gridspec(1, 2, width_ratios=[0.34, 0.66], wspace=0.02)
    label_ax = fig.add_subplot(grid_spec[0, 0])
    ax = fig.add_subplot(grid_spec[0, 1], sharey=label_ax)

    for axis in (label_ax, ax):
        axis.set_facecolor(colors["figure_bg"])
        axis.set_ylim(-0.6, row_count - 0.15)
        axis.set_yticks([])

    label_ax.set_xlim(0, 1)
    label_ax.set_xticks([])
    for spine in label_ax.spines.values():
        spine.set_visible(False)
    label_ax.axvline(0.995, color=colors["grid"], linewidth=1)

    ax.set_xlim(x_min, x_max)
    ax.xaxis.grid(True, color=colors["grid"], linewidth=0.8, alpha=0.8)
    ax.set_axisbelow(True)
    for spine_name in ("top", "right", "left"):
        ax.spines[spine_name].set_visible(False)
    ax.spines["bottom"].set_color(colors["grid"])

    row_positions = {}
    bar_height = 0.46
    for row_index, row in enumerate(rows):
        y_center = row_count - row_index - 1
        row_positions[id(row)] = y_center
        section_index = row.get("section_index", 0)
        row_bg = colors["section_bg"] if section_index % 2 == 0 else colors["section_alt"]
        if row["kind"] == "section":
            row_bg = colors["section_header"]
        label_ax.add_patch(_mpatches.Rectangle((0, y_center - 0.5), 1, 1,
                                               facecolor=row_bg, edgecolor="none", zorder=0))
        ax.axhspan(y_center - 0.5, y_center + 0.5, facecolor=row_bg, edgecolor="none", zorder=0)

        if row["kind"] == "section":
            label_ax.text(0.03, y_center, row["name"], ha="left", va="center",
                          fontsize=10, fontweight="bold", color=colors["title_text"])
            continue

        label_color = colors["milestone"]["text"] if row["kind"] == "milestone" else colors["axis_text"]
        label_ax.text(0.06, y_center, row["name"], ha="left", va="center",
                      fontsize=9.2, color=label_color,
                      fontweight="bold" if row["kind"] == "milestone" else "normal")
        if row["kind"] == "task":
            date_label = f"{row['start'].strftime('%m/%d')} - {row['end'].strftime('%m/%d')}"
        else:
            date_label = row["date"].strftime("%m/%d")
        label_ax.text(0.97, y_center, date_label, ha="right", va="center",
                      fontsize=8.2, color=colors["muted_text"])

        if row["kind"] == "milestone":
            marker_color = colors["milestone"]
            marker_x = _mdates.date2num(row["date"])
            ax.scatter(marker_x, y_center, marker="D", s=78,
                       facecolor=marker_color["face"], edgecolor=marker_color["edge"],
                       linewidth=1.4, zorder=5)
            ax.text(marker_x + date_range_days * 0.01, y_center, row["name"],
                    ha="left", va="center", fontsize=8.8, color=marker_color["text"], zorder=6)
            continue

        status_color = colors.get(row["status"], colors["default"])
        start_num = _mdates.date2num(row["start"])
        end_num = _mdates.date2num(row["end"])
        duration = max(1, end_num - start_num + 1)
        bar = _mpatches.FancyBboxPatch(
            (start_num, y_center - bar_height / 2), duration, bar_height,
            boxstyle="round,pad=0.02,rounding_size=0.04",
            facecolor=status_color["face"], edgecolor=status_color["edge"],
            linewidth=1.2, zorder=3,
        )
        ax.add_patch(bar)

        progress = row.get("progress")
        if progress is not None:
            progress_width = duration * max(0, min(1, float(progress)))
            ax.add_patch(_mpatches.Rectangle(
                (start_num, y_center - bar_height / 2), progress_width, bar_height,
                facecolor=status_color["edge"], edgecolor="none", alpha=0.18, zorder=4))

    for row in timeline_rows:
        if row["kind"] == "milestone":
            row_x = _mdates.date2num(row["date"])
        else:
            row_x = _mdates.date2num(row["start"])
        row_y = row_positions[id(row)]
        for dependency_id in row.get("depends_on", []):
            predecessor = task_rows_by_id.get(dependency_id)
            if not predecessor:
                continue
            predecessor_x = _mdates.date2num(predecessor.get("date", predecessor["end"]))
            predecessor_y = row_positions[id(predecessor)]
            ax.annotate("", xy=(row_x, row_y), xytext=(predecessor_x, predecessor_y),
                        arrowprops=dict(arrowstyle="->", color=colors["dependency"], lw=0.9,
                                        alpha=0.65, shrinkA=8, shrinkB=8,
                                        connectionstyle="angle3,angleA=0,angleB=90"),
                        zorder=2)

    if today_str:
        today = _parse_date(today_str)
        today_num = _mdates.date2num(today)
        if x_min <= today_num <= x_max:
            ax.axvline(x=today_num, color=colors["today"], linewidth=1.8,
                       linestyle="--", alpha=0.85, zorder=2)
            ax.text(today_num, row_count - 0.05, f"Today {today.strftime('%m/%d')}",
                    ha="center", va="bottom", fontsize=8.6,
                    color=colors["today"], fontweight="bold", clip_on=False)

    if tick_interval == "day":
        locator = _mdates.DayLocator(interval=max(1, date_range_days // 18))
    elif tick_interval == "month":
        locator = _mdates.MonthLocator()
    else:
        locator = _mdates.WeekdayLocator(byweekday=0, interval=2 if date_range_days > 90 else 1)
    ax.xaxis.set_major_locator(locator)
    ax.xaxis.set_major_formatter(_mdates.DateFormatter(axis_fmt))
    ax.tick_params(axis="x", colors=colors["axis_text"], labelsize=8.8)

    fig.suptitle(title, fontsize=17, fontweight="bold", color=colors["title_text"], y=0.975)
    label_ax.text(0.03, row_count - 0.03, "Phase / task", ha="left", va="bottom",
                  fontsize=8.5, color=colors["muted_text"], clip_on=False)

    handles = []
    for status_key, status_label in (("done", "Done"), ("active", "Active"),
                                     ("crit", "Critical"), ("default", "Planned")):
        status_color = colors[status_key]
        handles.append(_mpatches.Patch(facecolor=status_color["face"],
                                       edgecolor=status_color["edge"], label=status_label))
    milestone_color = colors["milestone"]
    handles.append(_plt.Line2D([0], [0], marker="D", color="w",
                               markerfacecolor=milestone_color["face"],
                               markeredgecolor=milestone_color["edge"],
                               markersize=7, label="Milestone"))
    ax.legend(handles=handles, loc="upper right", bbox_to_anchor=(1, 1.12),
              fontsize=8.4, framealpha=0.95, edgecolor=colors["grid"], ncol=5)

    fig.subplots_adjust(left=0.035, right=0.985, top=0.88, bottom=0.11)
    fig.savefig(output_path, dpi=dpi, facecolor="#ffffff", edgecolor="none",
                bbox_inches="tight", pad_inches=0.18)
    _plt.close(fig)
    return output_path
