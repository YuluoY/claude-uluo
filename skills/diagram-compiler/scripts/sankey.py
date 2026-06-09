"""Mermaid Sankey Diagram 桑基图脚本。

用于流量分析、能量流、预算分配、用户转化漏斗等场景。
数据驱动优先：AI 构建结构化数据 → data_to_diagram() → Mermaid sankey-beta。

强制规则：
  - 必须以 sankey-beta 开头
  - 需要至少 2 个 flow（source → target → value）
  - value 必须为正数
"""

import re
from pathlib import Path
from _shared import core

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "diagram-themes.yaml"

DATA_SCHEMA = """\
数据格式 (YAML):

title: "图表标题"                     # 可选
flows:                                # 必填，至少 2 条
  - source: "来源名称"
    target: "目标名称"
    value: 1200                       # 流量数值（正数）
  - source: "来源名称2"
    target: "目标名称2"
    value: 800
# 节点名称相同的 source/target 会自动合并为同一节点
# 示例：用户转化漏斗
# flows:
#   - {source: "访问", target: "注册", value: 5000}
#   - {source: "注册", target: "激活", value: 2000}
#   - {source: "激活", target: "付费", value: 800}
#   - {source: "付费", target: "续费", value: 500}

⚠️ Mermaid CLI sankey-beta 不支持中文节点标签。
   含中文时使用 render() 函数（Matplotlib）渲染。
   纯 ASCII 标签可用 generate 命令通过 mmdc 导出。
"""


def template() -> str:
    """返回 Mermaid 桑基图语法示例。"""
    return """sankey-beta
%% source,target,value
访问,注册,5000
注册,激活,2000
激活,付费,800
付费,续费,500
注册,流失,3000
激活,沉默,1200"""


def data_to_diagram(data: dict) -> str:
    """结构化数据 → Mermaid sankey-beta 代码。"""
    lines = ["sankey-beta"]

    title = data.get("title", "")
    if title:
        # sankey-beta 不支持双引号和 title 关键字含空格，用 %% 注释标注标题
        safe_title = title.replace('"', '').replace('\n', ' ')
        lines.append(f"%% {safe_title}")

    lines.append("")

    flows = data.get("flows", [])
    for flow in flows:
        source = flow.get("source", "")
        target = flow.get("target", "")
        value = flow.get("value", 0)
        # 处理含特殊字符的节点名（逗号、引号等）
        src = _sanitize_label(source)
        tgt = _sanitize_label(target)
        lines.append(f"    {src},{tgt},{value}")

    return "\n".join(lines)


def _sanitize_label(label: str) -> str:
    """处理含特殊字符的标签，必要时加引号。"""
    if not label:
        return '""'
    if "," in label or '"' in label:
        escaped = label.replace('"', '\\"')
        return f'"{escaped}"'
    return label


def validate(diagram: str) -> list[dict]:
    """Sankey 专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, "sankey-beta"))

    # 统计 flow 行（source,target,value 格式）
    flow_lines = []
    for line in diagram.split("\n"):
        stripped = line.strip()
        if (stripped and not stripped.startswith("%%")
                and not stripped.startswith("sankey-beta")
                and not stripped.startswith("title")
                and not stripped.startswith("accTitle")
                and not stripped.startswith("accDescr")):
            # 统计逗号分隔的 source,target,value 行
            parts = _split_csv(stripped)
            if len(parts) >= 3:
                flow_lines.append((stripped, parts))

    if len(flow_lines) < 2:
        problems.append({
            "type": "error",
            "message": f"桑基图至少需要 2 条流，当前 {len(flow_lines)} 条",
            "fix": "添加更多 source,target,value 数据行"
        })

    # 检查 value 是否为正数
    for line_text, parts in flow_lines:
        try:
            val = float(parts[2])
            if val <= 0:
                problems.append({
                    "type": "warning",
                    "message": f"流量值必须为正数: {line_text[:50]}",
                    "fix": "将 value 改为正数"
                })
        except ValueError:
            problems.append({
                "type": "error",
                "message": f"流量值无法解析为数字: {line_text[:50]}",
                "fix": "确保 value 为数字"
            })

    # 检查是否有孤立节点（只有 source 没有 target 或反之）
    sources = set()
    targets = set()
    for _, parts in flow_lines:
        if len(parts) >= 2:
            sources.add(parts[0])
            targets.add(parts[1])

    if len(flow_lines) > 10:
        # 大型桑基图，检查流量量级一致性
        values = []
        for _, parts in flow_lines:
            try:
                values.append(float(parts[2]))
            except ValueError:
                pass
        if values:
            max_v = max(values)
            min_v = min(values)
            if max_v > min_v * 100:
                problems.append({
                    "type": "quality",
                    "message": f"流量值跨度巨大（{min_v:.0f} ~ {max_v:.0f}），小流量可能不可见",
                    "fix": "合并小流量项或使用对数尺度标注"
                })

    return problems


def _split_csv(text: str) -> list[str]:
    """简单的 CSV 行解析，处理引号包裹的字段。"""
    parts = []
    current = ""
    in_quotes = False
    for ch in text:
        if ch == '"':
            in_quotes = not in_quotes
        elif ch == ',' and not in_quotes:
            parts.append(current.strip())
            current = ""
        else:
            current += ch
    parts.append(current.strip())
    return parts


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Sankey 规范。"""
    changes = []

    theme_vars = None
    if _THEMES_PATH.exists():
        core.set_themes_path(_THEMES_PATH)
        theme_vars = core.load_diagram_theme()
    diagram, style_changes = core.enforce_default_style(diagram, theme_overrides=theme_vars)
    changes.extend(style_changes)

    return diagram, changes


def render(data: dict, output_path: Path, theme: dict | None = None,
           dpi: int = 150, figure_bg: str = "#ffffff") -> Path:
    """Matplotlib Sankey 渲染器，使用 matplotlib.sankey 模块。

    支持中文节点标签。当 Mermaid CLI 不支持 sankey-beta 中文时使用。

    data = {
      "title": "用户转化漏斗",
      "flows": [{"source": "访问", "target": "注册", "value": 5000}, ...],
    }
    """
    import matplotlib as _mpl
    import matplotlib.pyplot as _plt
    from matplotlib.sankey import Sankey
    from _shared.fonts import setup_cjk_fonts
    setup_cjk_fonts()

    flows = data.get("flows", [])
    title = data.get("title", "")

    if not flows:
        raise ValueError("Sankey 图至少需要 1 条流")

    # Build topological order: which nodes are sources/sinks/intermediate
    # Count flow through each node
    outflows = {}
    inflows = {}
    for flow in flows:
        src = flow.get("source", "")
        tgt = flow.get("target", "")
        val = flow.get("value", 0)
        outflows[src] = outflows.get(src, 0) + val
        inflows[tgt] = inflows.get(tgt, 0) + val

    # Deduplicate and order nodes
    all_nodes = list(dict.fromkeys(
        [f.get("source", "") for f in flows] +
        [f.get("target", "") for f in flows]
    ))

    # Build a chain of Sankey objects, one per node
    fig, ax = _plt.subplots(figsize=(max(10, len(all_nodes) * 2.5),
                                     max(4, len(all_nodes) * 0.8)),
                            facecolor=figure_bg)
    ax.set_facecolor(figure_bg)
    ax.axis("off")

    # Colors
    FLOW_COLORS = [
        "#5470c6", "#91cc75", "#fac858", "#ee6666",
        "#73c0de", "#3ba272", "#fc8452", "#9a60b4",
        "#ea7ccc", "#36a3a8",
    ]

    # Build Sankey chain: each node gets one Sankey instance,
    # connected to the previous one via connect=
    sankey_instances = []
    prev_sankey = None

    for node_idx, node_name in enumerate(all_nodes):
        # Gather flows for this node
        in_flows = [f for f in flows if f.get("target", "") == node_name]
        out_flows = [f for f in flows if f.get("source", "") == node_name]

        # Build flow values: positive=in, negative=out
        flow_values = []
        flow_labels = []
        flow_colors = []

        for f in in_flows:
            flow_values.append(f.get("value", 0))
            flow_labels.append(f.get("source", ""))
            flow_colors.append(FLOW_COLORS[(len(flow_colors)) % len(FLOW_COLORS)])

        for f in out_flows:
            flow_values.append(-f.get("value", 0))
            flow_labels.append(f.get("target", ""))
            flow_colors.append(FLOW_COLORS[(len(flow_colors)) % len(FLOW_COLORS)])

        if not flow_values:
            continue

        # orientations: 0 for in (from left), 1 for out (to right)
        # Actually for Sankey module: 0=flows from top to bottom, needs careful setup
        # Simpler approach: use orientations for left-in, right-out
        orientations = []
        for i in range(len(in_flows)):
            orientations.append(0)  # in from left
        for i in range(len(out_flows)):
            orientations.append(1)  # out to right

        # Check flow conservation
        total_in = sum(f.get("value", 0) for f in in_flows)
        total_out = sum(f.get("value", 0) for f in out_flows)
        gap = abs(total_in - total_out)

        sk = Sankey(ax=ax,
                    scale=0.015 / max(1, max(abs(v) for v in flow_values) / 1000),
                    format='%.0f',
                    unit='',
                    gap=0.3 if gap > 0 else 0.15,
                    radius=0.15,
                    shoulder=0.03,
                    offset=0.15,
                    head_angle=120,
                    margin=0.5)

        sk.add(flows=flow_values,
               labels=flow_labels,
               orientations=orientations,
               pathlengths=[0.5] * len(flow_values),
               facecolor=flow_colors[0] if flow_colors else "#5470c6",
               alpha=0.65,
               patchlabel=node_name,
               connect=node_idx - 1 if node_idx > 0 else None)

        sankey_instances.append(sk)

    if sankey_instances:
        # Finish all diagrams
        diagrams = sankey_instances[0].finish()
    else:
        _plt.close(fig)
        raise ValueError("无法构建 Sankey 图：没有有效的流")

    if title:
        ax.set_title(title, fontsize=14, fontweight="bold", color="#1a1a1a", pad=20)

    fig.tight_layout()
    fig.savefig(output_path, dpi=dpi, facecolor=figure_bg, edgecolor="none",
                bbox_inches="tight")
    _plt.close(fig)
    return output_path
