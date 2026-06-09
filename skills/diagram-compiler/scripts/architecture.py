#!/usr/bin/env python3
"""N-Tier Layered Architecture Diagram Renderer (Matplotlib + PIL).

Renders a vertical layered architecture diagram with:
- Colored layer backgrounds with dashed borders
- Left label column per layer
- White module boxes with black text
- Arrows between layers showing data flow
- Full CJK text support via PIL measurement + matplotlib font registration

All coordinates in pixels. PIL measures real CJK text, matplotlib renders.
Figure size = canvas size exactly (no extra padding).
"""

from __future__ import annotations

import sys
from copy import deepcopy
from pathlib import Path

import matplotlib
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.font_manager as fm
from PIL import Image, ImageDraw, ImageFont

import logging
logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)

# ── CJK Font Registration ─────────────────────────────────────────────────────
from _shared.fonts import setup_cjk_fonts
setup_cjk_fonts()

matplotlib.rcParams["axes.unicode_minus"] = False

# Cross-platform CJK font paths (for PIL text measurement)
_CJK_FONT_PATHS = [
    # macOS
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
    # Linux
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    # Windows
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/simsun.ttc",
]

# ── PIL Font Cache (for accurate CJK text measurement) ────────────────────────
_PIL_FONT_CACHE: dict[int, ImageFont.FreeTypeFont] = {}


def _pil_font(size: int) -> ImageFont.FreeTypeFont:
    if size not in _PIL_FONT_CACHE:
        for fp in _CJK_FONT_PATHS:
            try:
                _PIL_FONT_CACHE[size] = ImageFont.truetype(fp, size)
                break
            except Exception:
                continue
        else:
            _PIL_FONT_CACHE[size] = ImageFont.load_default()
    return _PIL_FONT_CACHE[size]


def _measure(text: str, size: int) -> tuple[int, int]:
    """(width, height) in matplotlib pixels, scaled from PIL's 72 DPI."""
    font = _pil_font(size)
    img = Image.new("RGB", (1, 1), "white")
    draw = ImageDraw.Draw(img)
    bbox = draw.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    return int(w * DPI / 72), int(h * DPI / 72)


# ── Theme ──────────────────────────────────────────────────────────────────────
THEME = {
    "canvasBg": "#ffffff",
    "layer_colors": [
        "#eef5ef", "#f3f7f2", "#eef4f8", "#edf5fb",
        "#f3f7f2", "#eef4f8", "#f7f3ea",
    ],
    "module_bg": "#ffffff",
    "module_border": "#5f666d",
    "module_text": "#1a1a1a",
    "label_text": "#3e464d",
    "arrow_color": "#3f464c",
    "dash_color": "#aeb7b0",
    "highlight_yellow": "#fff9c4",
    "highlight_red": "#e53935",
    "highlight_blue": "#1e88e5",
}
BASE_THEME = deepcopy(THEME)

# ── Constants (pixels) ─────────────────────────────────────────────────────────
PAD = 22
GAP = 12
LABEL_W = 154
ARROW_H = 30
TITLE_H = 92
DPI = 150
CANVAS_W = 1580


# ── Drawing Helpers ────────────────────────────────────────────────────────────

def _darken(hex_color: str, factor: float = 0.82) -> str:
    c = hex_color.lstrip("#")
    r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
    return (f"#{min(255, int(r * factor)):02x}"
            f"{min(255, int(g * factor)):02x}"
            f"{min(255, int(b * factor)):02x}")


def _rect(ax, x: float, y_top: float, w: float, h: float,
          face: str, edge: str, lw: float = 1.5, zorder: int = 4):
    """Rounded rect. (x, y_top) is top-left, h extends downward."""
    rect = mpatches.FancyBboxPatch(
        (x, y_top - h), w, h,
        boxstyle="round,pad=1.5,rounding_size=3",
        facecolor=face, edgecolor=edge, linewidth=lw, zorder=zorder,
    )
    ax.add_patch(rect)


def _centered(ax, x: float, y: float, text: str,
              fs: float, fw: str = "normal", color: str = "#1a1a1a", z: int = 5):
    ax.text(x, y, text, ha="center", va="center",
            fontsize=fs, fontweight=fw, color=color, zorder=z)


def _fit_lines(text: str, size: int, max_width: float, max_lines: int = 2) -> list[str]:
    """Wrap CJK and Latin labels so boxes do not overflow their bounds."""
    if not text:
        return []
    if _measure(text, size)[0] <= max_width:
        return [text]

    tokens = text.split()
    if len(tokens) == 1:
        tokens = list(text)

    lines: list[str] = []
    current = ""
    truncated = False
    separator = " " if text.split() and len(text.split()) > 1 else ""
    for token in tokens:
        candidate = token if not current else f"{current}{separator}{token}"
        if _measure(candidate, size)[0] <= max_width:
            current = candidate
            continue
        if current:
            lines.append(current)
        current = token
        if len(lines) == max_lines:
            truncated = True
            break
    if current and len(lines) < max_lines:
        lines.append(current)

    if not lines:
        return [text]
    if truncated and len(lines) == max_lines:
        while _measure(lines[-1] + "...", size)[0] > max_width and len(lines[-1]) > 1:
            lines[-1] = lines[-1][:-1]
        lines[-1] = lines[-1] + "..."
    return lines


def _centered_lines(ax, x: float, y: float, lines: list[str],
                    fs: float, fw: str = "normal", color: str = "#1a1a1a", z: int = 5):
    if not lines:
        return
    line_h = max(_measure("Ag", int(fs))[1], fs * DPI / 72) * 1.25
    top_y = y + (len(lines) - 1) * line_h / 2
    for i, line in enumerate(lines):
        _centered(ax, x, top_y - i * line_h, line, fs, fw, color, z)


# ── Block Height Calculation ───────────────────────────────────────────────────

def _bh_module(text: str, style: str) -> int:
    fs = 12 if style == "large" else 10
    return max(50 if style == "large" else 42, _measure(text, fs)[1] + 20)


def _bh_device(icon: str, text: str) -> int:
    return max(52, _measure(icon, 12)[1] + 6 + _measure(text, 8)[1])


def _bh_ajax(verbs: list, fw: float) -> int:
    title_h = _measure("Ajax", 12)[1]
    max_vh = max(_measure(v, 10)[1] for v in verbs)
    return max(58, title_h + 8 + (max_vh + 10) + 6)


def _bh_group(columns: list, fw: float) -> int:
    if not columns:
        return 40
    title_h = _measure("SpringBoot", 13)[1]
    max_ct = max((_measure(c.get("title", ""), 8)[1] for c in columns), default=0)
    max_items = max((len(c.get("items", [])) for c in columns), default=0)
    max_ih = max((_measure(item, 10)[1] for c in columns for item in c.get("items", [])), default=20)
    return max(132, title_h + 10 + (max_ct + 10) + max_items * (max_ih + 6) + 12)


def _bh_side_modules(items: list) -> int:
    if not items:
        return 20
    max_ih = max(_measure(item, 10)[1] for item in items)
    return max(76, len(items) * (max_ih + 8) + 12)


def _bh_modular_block(modules: list, fw: float) -> int:
    if not modules:
        return 60
    title_h = _measure("MyBatis", 13)[1]
    max_mh = max(_measure(m, 10)[1] for m in modules)
    return max(76, title_h + 10 + max_mh + 18)


def _block_height(block: dict, fw: float) -> int:
    bt = block.get("type", "module")
    if bt == "device":
        return _bh_device(block.get("icon", ""), block.get("text", ""))
    if bt == "ajax-block":
        return _bh_ajax(block.get("verbs", ["POST", "GET"]), fw)
    if bt == "group":
        return _bh_group(block.get("columns", []), fw)
    if bt == "side-modules":
        return _bh_side_modules(block.get("items", []))
    if bt == "modular-block":
        return _bh_modular_block(block.get("modules", []), fw)
    return _bh_module(block.get("text", ""), block.get("style", ""))


def _layout_blocks(blocks: list, body_w: float) -> tuple[list[float], float]:
    """Compute flex widths that adaptively fill the whole layer body."""
    if not blocks:
        return [], 0

    total_flex = sum(b.get("width", 1) for b in blocks)
    total_gap = (len(blocks) - 1) * GAP
    avail_w = body_w - total_gap
    widths = [
        b.get("width", 1) / total_flex * avail_w
        for b in blocks
    ]

    return widths, 0


def _layer_height(blocks: list) -> int:
    if not blocks:
        return 70
    body_w = CANVAS_W - LABEL_W - PAD * 2
    widths, _offset = _layout_blocks(blocks, body_w)
    max_bh = max(
        _block_height(b, widths[i])
        for i, b in enumerate(blocks)
    )
    return max_bh + PAD * 2


# ── Block Drawing Functions ────────────────────────────────────────────────────

def _draw_module(ax, x, y_top, w, h, text, style="",
                 bg=None, border=None, fg=None, fs=None):
    face = bg or THEME["module_bg"]
    edge = border or THEME["module_border"]
    fcolor = fg or THEME["module_text"]
    font_size = fs if fs else (10.8 if style == "large" else 9.4)
    fw_ = "bold" if style == "large" else "normal"
    _rect(ax, x, y_top, w, h, face, edge)
    if text:
        lines = _fit_lines(text, int(font_size), max(24, w - 22), max_lines=2)
        _centered_lines(ax, x + w / 2, y_top - h / 2, lines, font_size, fw_, fcolor)


def _draw_device(ax, x, y_top, w, h, icon, text):
    _rect(ax, x, y_top, w, h, THEME["module_bg"], "#bbb")
    center_y = y_top - h / 2
    _centered(ax, x + w / 2, center_y + 11, icon, 12.4, "bold", "#1a1a1a")
    if text:
        lines = _fit_lines(text, 8, max(24, w - 16), max_lines=2)
        _centered_lines(ax, x + w / 2, center_y - 11, lines, 8.2, color="#555")


def _draw_ajax(ax, x, y_top, w, h, verbs):
    _rect(ax, x, y_top, w, h, THEME["module_bg"], THEME["module_border"])
    th = _measure("Ajax", 12)[1]
    _centered(ax, x + w / 2, y_top - th / 2, "Ajax", 12, "bold", "#1a1a1a")
    vw = min(50, (w - 16) / len(verbs))
    max_vh = max(_measure(v, 10)[1] for v in verbs)
    ph = max_vh + 6
    total_vw = len(verbs) * vw + (len(verbs) - 1) * 4
    vx0 = x + w / 2 - total_vw / 2
    pill_top = y_top - th - 6 - ph
    for vi, verb in enumerate(verbs):
        _draw_module(ax, vx0 + vi * (vw + 4), pill_top + ph, vw, ph,
                     verb, border="#888", fs=10)


def _draw_group(ax, x, y_top, w, h, title, columns):
    """Group block: title at top, columns fill remaining space with minimal margins."""
    _rect(ax, x, y_top, w, h, THEME["module_bg"], "#555")
    title_h = _measure(title, 12)[1]
    _centered(ax, x + w / 2, y_top - title_h / 2 - 1, title, 11.6, "bold", "#1a1a1a")
    ncols = len(columns)
    if ncols == 0:
        return
    # Compact internal margins so grouped content reads as a coherent table.
    mg = 8
    cw = (w - mg * 2 - (ncols - 1) * mg) / ncols
    # Content area below title
    content_top = y_top - title_h - mg
    content_h = h - title_h - mg * 2
    # Column title height
    max_ct = max((_measure(c.get("title", ""), 8)[1] for c in columns), default=0)
    ct_h = max_ct + 4 if max_ct > 0 else 0
    # Items area — fill remaining height
    items_area_top = content_top - ct_h
    items_area_h = content_h - ct_h
    for ci, col in enumerate(columns):
        cx = x + mg + ci * (cw + mg)
        if ct_h > 0:
            ct_center = content_top - ct_h / 2 + 2
            _centered(ax, cx + cw / 2, ct_center, col.get("title", ""), 7.8, color="#8a8f94")
        items = col.get("items", [])
        n_items = len(items)
        if n_items == 0:
            continue
        # Each item fills its share of the items area
        item_gap = 3
        ih = (items_area_h - (n_items - 1) * item_gap) / n_items
        for ii, item in enumerate(items):
            iy = items_area_top - ii * (ih + item_gap)
            _draw_module(ax, cx, iy, cw, ih, item, border="#9aa0a6", fs=8.8)


def _draw_side_modules(ax, x, y_top, w, h, items):
    """Side modules: stacked vertically, filling parent height."""
    if not items:
        return
    n = len(items)
    mg = 8
    smw = w - mg * 2
    smx = x + mg
    item_gap = 5
    ih = (h - mg * 2 - (n - 1) * item_gap) / n
    for ii, item in enumerate(items):
        iy = y_top - mg - ii * (ih + item_gap)
        _draw_module(ax, smx, iy, smw, ih, item, fs=8.8)


def _draw_modular(ax, x, y_top, w, h, title, modules):
    """Modular block: title at top, sub-modules fill remaining space."""
    _rect(ax, x, y_top, w, h, THEME["module_bg"], "#555")
    mg = 8
    title_h = _measure(title, 12)[1] if title else 0
    if title:
        _centered(ax, x + w / 2, y_top - title_h / 2 - 1, title, 11.6, "bold", "#1a1a1a")
    if not modules:
        return
    n = len(modules)
    content_top = y_top - title_h - mg if title else y_top - mg
    content_h = h - title_h - mg * 2 if title else h - mg * 2
    mod_gap = mg
    mw = (w - mg * 2 - (n - 1) * mod_gap) / n
    for mi, mod in enumerate(modules):
        mx = x + mg + mi * (mw + mod_gap)
        _draw_module(ax, mx, content_top, mw, content_h, mod, fs=8.8)


# ── Layout Definition ──────────────────────────────────────────────────────────

def _default_layout() -> dict:
    return {
        "title": "Java Web N-Tier 技术架构图",
        "subtitle": "Client -> Web -> Business -> Persistence -> Data",
        "arrows": True,
        "layers": [
            {"label": "客户端层", "blocks": [
                {"type": "device", "icon": "Web", "text": "浏览器", "width": 2},
                {"type": "device", "icon": "Mobile", "text": "移动端", "width": 2},
                {"type": "device", "icon": "Admin", "text": "管理后台", "width": 2},
            ]},
            {"label": "边界接入层", "blocks": [
                {"type": "module", "text": "DNS / CDN", "style": "large"},
                {"type": "module", "text": "WAF / TLS", "style": "large"},
                {"type": "module", "text": "Nginx / Load Balancer", "width": 2, "style": "large"},
            ]},
            {"label": "Web 表示层", "blocks": [
                {"type": "module", "text": "Spring MVC Controller", "width": 2, "style": "large"},
                {"type": "module", "text": "REST API / JSON", "width": 2},
                {"type": "module", "text": "Auth Filter", "width": 1},
                {"type": "module", "text": "Static Assets", "width": 1},
            ]},
            {"label": "应用业务层", "blocks": [
                {"type": "group", "title": "Spring Boot Application", "width": 5, "columns": [
                    {"title": "接口编排", "items": ["请求校验", "DTO 转换", "异常处理"]},
                    {"title": "领域服务", "items": ["业务规则", "流程编排", "权限判断"]},
                    {"title": "事务事件", "items": ["事务边界", "领域事件", "异步任务"]},
                ]},
                {"type": "side-modules", "items": ["日志", "配置", "监控"], "width": 1},
            ]},
            {"label": "数据访问层", "blocks": [
                {"type": "modular-block", "title": "Persistence Adapters", "width": 5,
                 "modules": ["Repository", "MyBatis Mapper", "JPA Entity", "Cache Adapter"]},
                {"type": "module", "text": "Connection Pool", "width": 1, "style": "large"},
            ]},
            {"label": "数据与集成层", "blocks": [
                {"type": "highlight", "text": "MySQL", "width": 2, "color": "blue", "style": "large"},
                {"type": "highlight", "text": "Redis", "width": 2, "color": "red", "style": "large"},
                {"type": "module", "text": "Message Queue", "width": 2, "style": "large"},
                {"type": "module", "text": "External APIs", "width": 2},
            ]},
            {"label": "运行支撑层", "blocks": [
                {"type": "module", "text": "JVM / Tomcat", "style": "large"},
                {"type": "module", "text": "Linux / Container", "style": "large"},
                {"type": "module", "text": "CI/CD", "style": "large"},
                {"type": "module", "text": "Metrics / Logs / Tracing", "width": 2, "style": "large"},
            ]},
        ]
    }


def _normalize_layout(layout: dict | list[dict]) -> tuple[str, str, list[dict], bool]:
    """Accept both the legacy list layout and the current YAML-shaped layout."""
    if isinstance(layout, dict):
        return (
            layout.get("title", "Java Web N-Tier 技术架构图"),
            layout.get("subtitle", ""),
            layout.get("layers", []),
            layout.get("arrows", True) is not False,
        )
    return "Java Web N-Tier 技术架构图", "", layout, True


def _apply_theme(theme: dict | None) -> dict:
    resolved = deepcopy(BASE_THEME)
    if theme:
        resolved.update(theme)
    return resolved


# ── Main Render Function ───────────────────────────────────────────────────────

def render_architecture(layout: dict | list[dict], theme_or_output_path=None,
                        output_path: Path | None = None, dpi: int = DPI,
                        transparent: bool = False) -> Path:
    global THEME

    if output_path is None:
        theme = None
        output_path = Path(theme_or_output_path)
    else:
        theme = theme_or_output_path if isinstance(theme_or_output_path, dict) else None
        output_path = Path(output_path)

    THEME = _apply_theme(theme)
    canvas_bg = THEME.get("canvasBg", "#ffffff")
    title, subtitle, layers, show_arrows = _normalize_layout(layout)
    n = len(layers)

    # Pass 1: compute per-layer heights and max block heights
    l_heights = []
    l_max_bh = []
    for layer in layers:
        blocks = layer.get("blocks", [])
        lh = _layer_height(blocks)
        l_heights.append(lh)
        if blocks:
            body_w = CANVAS_W - LABEL_W - PAD * 2
            widths, _offset = _layout_blocks(blocks, body_w)
            max_bh = max(
                _block_height(b, widths[i])
                for i, b in enumerate(blocks)
            )
            l_max_bh.append(max_bh)
        else:
            l_max_bh.append(lh - PAD * 2)

    arrow_total = (n - 1) * ARROW_H if show_arrows else 0
    total_h = TITLE_H + sum(l_heights) + arrow_total + PAD

    # Create figure — exact canvas size, no extra padding
    fig_w_in = CANVAS_W / dpi
    fig_h_in = total_h / dpi
    fig_face = "none" if transparent else canvas_bg
    ax_face = "none" if transparent else canvas_bg
    fig, ax = plt.subplots(figsize=(fig_w_in, fig_h_in), dpi=dpi, facecolor=fig_face)
    ax.set_facecolor(ax_face)
    ax.set_xlim(0, CANVAS_W)
    ax.set_ylim(0, total_h)
    ax.set_aspect("equal")
    ax.axis("off")
    fig.subplots_adjust(left=0, right=1, top=1, bottom=0)

    # Title area — background rect only when not transparent
    title_mid_y = total_h - TITLE_H / 2
    # Title text color adapts to background: light text on dark canvas, dark on light
    title_text_color = "#eceff1" if canvas_bg.startswith("#1") or canvas_bg.startswith("#2") else "#16202a"
    subtitle_text_color = "#90a4ae" if canvas_bg.startswith("#1") or canvas_bg.startswith("#2") else "#5f6b76"
    if not transparent:
        ax.add_patch(mpatches.Rectangle(
            (0, total_h - TITLE_H), CANVAS_W, TITLE_H,
            facecolor=canvas_bg, edgecolor="none", zorder=0))
    _centered(ax, CANVAS_W / 2, title_mid_y + 10, title, 18, "bold", title_text_color, 6)
    if subtitle:
        _centered(ax, CANVAS_W / 2, title_mid_y - 20, subtitle, 8.8, "normal", subtitle_text_color, 6)

    # Pass 2: draw layers top → bottom
    y_cursor = total_h - TITLE_H
    colors = THEME["layer_colors"]

    for li, layer in enumerate(layers):
        lh = l_heights[li]
        layer_bot = y_cursor - lh
        layer_top = y_cursor
        bg = colors[li % len(colors)]
        label_bg = _darken(bg)

        ax.add_patch(mpatches.Rectangle(
            (0, layer_bot), CANVAS_W, lh,
            facecolor=bg, edgecolor="none", zorder=1))
        ax.add_patch(mpatches.Rectangle(
            (0, layer_bot), CANVAS_W, lh,
            facecolor="none", edgecolor=THEME["dash_color"],
            linewidth=0.9, linestyle=(0, (4, 5)), zorder=2))

        ax.add_patch(mpatches.Rectangle(
            (0, layer_bot), LABEL_W, lh,
            facecolor=label_bg, edgecolor="none", zorder=3))
        _centered(ax, LABEL_W / 2, layer_bot + lh / 2,
              layer.get("label", ""), 11.2, "bold", THEME["label_text"])

        # Blocks — all at uniform height (max_bh), flush to body area top
        blocks = layer.get("blocks", [])
        if blocks:
            body_top = layer_top - PAD
            body_w = CANVAS_W - LABEL_W - PAD * 2
            widths, offset = _layout_blocks(blocks, body_w)
            bx = LABEL_W + PAD + offset
            bh = l_max_bh[li]

            for bi, block in enumerate(blocks):
                bt = block.get("type", "module")
                fw = widths[bi]

                if bt == "module":
                    _draw_module(ax, bx, body_top, fw, bh,
                                 block.get("text", ""), block.get("style", ""))
                elif bt == "highlight":
                    hl_colors = {
                        "yellow": THEME["highlight_yellow"],
                        "red": THEME["highlight_red"],
                        "blue": THEME["highlight_blue"],
                    }
                    color = block.get("color", "yellow")
                    _draw_module(ax, bx, body_top, fw, bh,
                                 block.get("text", ""), block.get("style", ""),
                                 bg=hl_colors.get(color, THEME["highlight_yellow"]),
                                 border="#bbb",
                                 fg="#fff" if color in ("red", "blue") else "#1a1a1a")
                elif bt == "device":
                    _draw_device(ax, bx, body_top, fw, bh,
                                 block.get("icon", ""), block.get("text", ""))
                elif bt == "ajax-block":
                    _draw_ajax(ax, bx, body_top, fw, bh,
                               block.get("verbs", ["POST", "GET"]))
                elif bt == "group":
                    _draw_group(ax, bx, body_top, fw, bh,
                                block.get("title", ""), block.get("columns", []))
                elif bt == "side-modules":
                    _draw_side_modules(ax, bx, body_top, fw, bh,
                                       block.get("items", []))
                elif bt == "modular-block":
                    _draw_modular(ax, bx, body_top, fw, bh,
                                  block.get("title", ""),
                                  block.get("modules", []))

                bx += fw + GAP

        # Arrow between layers
        if show_arrows and li < n - 1:
            arrow_cx = CANVAS_W / 2
            ax.annotate("",
                        xy=(arrow_cx, layer_bot - ARROW_H + 4),
                        xytext=(arrow_cx, layer_bot),
                        arrowprops=dict(arrowstyle="->",
                                        color=THEME["arrow_color"],
                                        lw=2, connectionstyle="arc3"),
                        zorder=6)

        y_cursor = layer_bot
        if show_arrows and li < n - 1:
            y_cursor -= ARROW_H

    # Save
    save_kwargs = dict(dpi=dpi, edgecolor="none", bbox_inches=None)
    if transparent:
        save_kwargs["transparent"] = True
    else:
        save_kwargs["facecolor"] = canvas_bg
    fig.savefig(output_path, **save_kwargs)
    plt.close(fig)
    return output_path


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ROOT = Path(__file__).resolve().parent.parent
    OUTPUT_DIR = ROOT / "output"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    out = Path(sys.argv[1]) if len(sys.argv) > 1 else OUTPUT_DIR / "java-web-architecture.png"
    layers = _default_layout()

    render_architecture(layers, out, dpi=DPI)

    img = Image.open(out)
    print(f"OK  {img.size[0]}x{img.size[1]} px  {out.stat().st_size // 1024} KB")
    print(f"Output: {out}")
