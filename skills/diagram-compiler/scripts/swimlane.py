"""Swimlane Diagram 泳道图脚本。

跨职能流程图——Mermaid 原生不支持，使用 Matplotlib 专用渲染。
用于业务流程分析、系统交互梳理、责任归属标注等场景。

数据驱动：AI 构建结构化数据 → render() → PNG/SVG 输出。
同时提供 data_to_diagram() 生成 Mermaid flowchart 近似表示（preview 用）。

强制规则：
  - 至少 2 个泳道（lane）
  - 至少 1 个步骤
  - 每个步骤必须归属到 lane
"""

import re
from pathlib import Path
from _shared import core

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "diagram-themes.yaml"

DATA_SCHEMA = """\
数据格式 (YAML):

title: "用户注册流程"                   # 可选
lanes:                                  # 必填，至少 2 个泳道
  - id: "user"                          # 泳道唯一标识
    name: "用户"                        # 显示名称
    color: "#e3f2fd"                    # 可选，泳道背景色（默认自动分配）
  - id: "frontend"
    name: "前端"
  - id: "backend"
    name: "后端"
  - id: "db"
    name: "数据库"
steps:                                  # 必填，至少 1 个步骤
  - id: "s1"                            # 步骤唯一标识
    lane: "user"                        # 归属泳道 id
    label: "发起注册请求"               # 步骤描述
    type: "action"                      # 可选: action | decision | start | end（默认 action）
  - id: "s2"
    lane: "frontend"
    label: "验证表单输入"
    type: "decision"
  - id: "s3"
    lane: "frontend"
    label: "提交注册 API"
    type: "action"
connections:                            # 可选，步骤之间的连线
  - from: "s1"                          # 源步骤 id
    to: "s2"                            # 目标步骤 id
    label: ""                           # 可选，连线标签
# 如果不提供 connections，步骤按 lanes 从上到下、按 steps 顺序自动连线
"""

# Lane color palette
_LANE_COLORS = [
    "#e3f2fd", "#e8f5e9", "#fff3e0", "#fce4ec",
    "#f3e5f5", "#e0f2f1", "#fff8e1", "#ede7f6",
]


def template() -> str:
    """返回 Mermaid flowchart 近似表示（preview 用）。"""
    return """flowchart TD
    subgraph user["用户"]
        s1["发起注册请求"]
    end
    subgraph frontend["前端"]
        s2{"验证表单输入"}
        s3["提交注册 API"]
    end
    subgraph backend["后端"]
        s4["处理注册逻辑"]
        s6["返回结果"]
    end
    subgraph db["数据库"]
        s5["写入用户数据"]
    end
    s1 --> s2
    s2 -->|验证通过| s3
    s2 -->|验证失败| s1
    s3 --> s4
    s4 --> s5
    s5 --> s6
    s6 --> s1"""


def data_to_diagram(data: dict) -> str:
    """结构化数据 → Mermaid flowchart 近似表示（preview 用）。

    Swimlane 不是 Mermaid 原生类型，这里用 subgraph 模拟。
    精确渲染请使用 render() → Matplotlib。
    """
    lines = ["flowchart TD"]

    lanes = data.get("lanes", [])
    steps = data.get("steps", [])
    connections = data.get("connections", [])

    # Build lane → step mapping
    lane_steps = {}
    for lane in lanes:
        lane_steps[lane["id"]] = []
    for step in steps:
        lid = step.get("lane", "")
        if lid not in lane_steps:
            lane_steps[lid] = []
        lane_steps[lid].append(step)

    # Emit subgraphs
    for lane in lanes:
        lid = lane["id"]
        lname = lane.get("name", lid)
        lines.append(f'    subgraph {lid}["{lname}"]')

        for step in lane_steps.get(lid, []):
            sid = step.get("id", "")
            slabel = step.get("label", "")
            stype = step.get("type", "action")

            if stype == "decision":
                lines.append(f'        {sid}{{"{slabel}"}}')
            elif stype == "start":
                lines.append(f'        {sid}(("{slabel}"))')
            elif stype == "end":
                lines.append(f'        {sid}(["{slabel}"])')
            else:
                lines.append(f'        {sid}["{slabel}"]')

        lines.append("    end")

    lines.append("")

    # Emit connections (or auto-connect)
    if connections:
        for conn in connections:
            from_id = conn.get("from", "")
            to_id = conn.get("to", "")
            label = conn.get("label", "")
            if label:
                lines.append(f"    {from_id} -->|{label}| {to_id}")
            else:
                lines.append(f"    {from_id} --> {to_id}")
    else:
        # Auto-connect steps in order within each lane, then across lanes
        all_steps = []
        for lane in lanes:
            all_steps.extend(lane_steps.get(lane["id"], []))
        for i in range(len(all_steps) - 1):
            lines.append(f"    {all_steps[i]['id']} --> {all_steps[i+1]['id']}")

    return "\n".join(lines)


def render(data: dict, output_path: Path, theme: dict | None = None,
           dpi: int = 150, figure_bg: str = "#ffffff") -> Path:
    """Matplotlib 泳道图渲染器。

    data = {
      "title": "用户注册流程",
      "lanes": [{"id": "user", "name": "用户"}, ...],
      "steps": [{"id": "s1", "lane": "user", "label": "发起注册", "type": "action"}, ...],
      "connections": [{"from": "s1", "to": "s2", "label": ""}, ...],
    }
    """
    import matplotlib as _mpl
    import matplotlib.pyplot as _plt
    import matplotlib.patches as _mpatches
    from _shared.fonts import setup_cjk_fonts
    setup_cjk_fonts()

    lanes = data.get("lanes", [])
    steps = data.get("steps", [])
    connections = data.get("connections", [])
    title = data.get("title", "")

    if not lanes:
        raise ValueError("泳道图至少需要 1 个 lane")
    if not steps:
        raise ValueError("泳道图至少需要 1 个 step")

    # Build lane→step mapping
    lane_step_map = {}
    for lane in lanes:
        lane_step_map[lane["id"]] = []
    for step in steps:
        lid = step.get("lane", lanes[0]["id"])
        if lid not in lane_step_map:
            lane_step_map[lid] = []
        lane_step_map[lid].append(step)

    # Layout parameters
    lane_h = 120
    step_w = 140
    step_h = 56
    label_w = 100
    lane_gap = 2
    x_pad = 80
    y_pad = 60
    arrow_h = 40

    n_lanes = len(lanes)
    max_steps = max(len(lane_step_map.get(l["id"], [])) for l in lanes)

    total_w = label_w + max_steps * (step_w + 30) + x_pad * 2
    total_h = title_offset = (60 if title else 0) + n_lanes * (lane_h + lane_gap) + y_pad * 2

    fig_w = total_w / dpi
    fig_h = total_h / dpi

    fig, ax = _plt.subplots(figsize=(fig_w, fig_h), dpi=dpi, facecolor=figure_bg)
    ax.set_facecolor(figure_bg)
    ax.set_xlim(0, total_w)
    ax.set_ylim(0, total_h)
    ax.set_aspect("equal")
    ax.axis("off")

    y_cursor = total_h - y_pad

    step_positions = {}  # step_id → (cx, cy)

    # Draw title
    if title:
        title_y = total_h - 30
        ax.text(total_w / 2, title_y, title, ha="center", va="center",
                fontsize=16, fontweight="bold", color="#1a1a1a")
        y_cursor -= 30

    # Draw lanes
    for li, lane in enumerate(lanes):
        lid = lane["id"]
        lname = lane.get("name", lid)
        lane_bg = lane.get("color", _LANE_COLORS[li % len(_LANE_COLORS)])

        lane_top = y_cursor
        lane_bottom = y_cursor - lane_h

        # Lane background
        ax.add_patch(_mpatches.Rectangle(
            (0, lane_bottom), total_w, lane_h,
            facecolor=lane_bg, edgecolor="#cccccc", linewidth=1, zorder=1))

        # Lane label
        ax.add_patch(_mpatches.Rectangle(
            (0, lane_bottom), label_w, lane_h,
            facecolor=_darken(lane_bg, 0.9), edgecolor="#cccccc", linewidth=1, zorder=2))
        ax.text(label_w / 2, lane_bottom + lane_h / 2, lname,
                ha="center", va="center", fontsize=11, fontweight="bold",
                color="#333333", zorder=3)

        # Steps in this lane
        lane_steps = lane_step_map.get(lid, [])
        start_x = label_w + x_pad
        available_w = total_w - label_w - x_pad * 2
        if lane_steps:
            spacing = available_w / len(lane_steps)
        else:
            spacing = available_w

        for si, step in enumerate(lane_steps):
            step_cx = start_x + spacing * si + spacing / 2
            step_cy = lane_bottom + lane_h / 2
            sid = step.get("id", f"s{li}_{si}")
            slabel = step.get("label", "")
            stype = step.get("type", "action")

            # Step box
            _draw_step_box(ax, step_cx - step_w / 2, step_cy + step_h / 2,
                           step_w, step_h, slabel, stype)
            step_positions[sid] = (step_cx, step_cy)

        y_cursor = lane_bottom - lane_gap

    # Draw connections
    if connections:
        for conn in connections:
            from_id = conn.get("from", "")
            to_id = conn.get("to", "")
            clabel = conn.get("label", "")

            if from_id in step_positions and to_id in step_positions:
                fx, fy = step_positions[from_id]
                tx, ty = step_positions[to_id]

                # Draw arrow
                ax.annotate("",
                            xy=(tx, ty + step_h / 2 + 4),
                            xytext=(fx, fy - step_h / 2 - 4),
                            arrowprops=dict(arrowstyle="->", color="#555555",
                                            lw=1.5, connectionstyle="arc3,rad=0"),
                            zorder=5)
                if clabel:
                    mid_x = (fx + tx) / 2
                    mid_y = (fy + ty) / 2
                    ax.text(mid_x, mid_y, clabel, ha="center", va="center",
                            fontsize=8, color="#666666", zorder=6,
                            bbox=dict(facecolor="white", edgecolor="none", pad=2))

    fig.savefig(output_path, dpi=dpi, facecolor=figure_bg, edgecolor="none",
                bbox_inches="tight")
    _plt.close(fig)
    return output_path


def _darken(hex_color: str, factor: float = 0.85) -> str:
    c = hex_color.lstrip("#")
    r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
    return f"#{min(255, int(r*factor)):02x}{min(255, int(g*factor)):02x}{min(255, int(b*factor)):02x}"


def _draw_step_box(ax, x: float, y_top: float, w: float, h: float,
                   label: str, stype: str):
    """Draw a process step box."""
    import matplotlib.patches as _mpatches

    if stype == "start" or stype == "end":
        # Rounded pill shape
        face = "#e8f5e9" if stype == "start" else "#fce4ec"
        edge = "#4caf50" if stype == "start" else "#e53935"
        boxstyle = "round,pad=3,rounding_size=15"
    elif stype == "decision":
        # Diamond shape (approximated with color)
        face = "#fff3e0"
        edge = "#ff9800"
        boxstyle = "round,pad=2,rounding_size=3"
    else:
        # Standard action rect
        face = "#ffffff"
        edge = "#5f666d"
        boxstyle = "round,pad=2,rounding_size=3"

    ax.add_patch(_mpatches.FancyBboxPatch(
        (x, y_top - h), w, h,
        boxstyle=boxstyle,
        facecolor=face, edgecolor=edge, linewidth=1.5, zorder=4))

    # Label text
    fontsize = 9 if len(label) > 15 else 10
    ax.text(x + w / 2, y_top - h / 2, label,
            ha="center", va="center", fontsize=fontsize,
            color="#1a1a1a", zorder=5)


def validate(diagram: str) -> list[dict]:
    """Swimlane 专属校验规则（检查 flowchart 近似表示）。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, ("flowchart", "graph")))

    # 检查 subgraph（泳道）
    subgraphs = re.findall(r'subgraph\s+(\w+)', diagram)
    if len(subgraphs) < 2:
        problems.append({
            "type": "warning",
            "message": f"泳道图只有 {len(subgraphs)} 个泳道（subgraph），建议至少 2 个",
            "fix": "添加更多泳道（subgraph）以清楚展示跨职能流程"
        })

    # 检查是否有 end 关键字问题
    problems.extend(core.check_reserved_node_labels(diagram, "flowchart"))

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Swimlane 规范。"""
    changes = []

    theme_vars = None
    if _THEMES_PATH.exists():
        core.set_themes_path(_THEMES_PATH)
        theme_vars = core.load_diagram_theme()
    diagram, style_changes = core.enforce_default_style(diagram, theme_overrides=theme_vars)
    changes.extend(style_changes)

    return diagram, changes
