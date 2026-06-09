#!/usr/bin/env python3
"""
Generate a layered technical architecture diagram for AI Intelligent Customer Service System.
Outputs: architecture.png (high-res), layout.yaml (structural definition)
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.font_manager as fm
import numpy as np
import yaml
import os
from pathlib import Path

# ── Font setup: register PingFang.ttc directly for CJK rendering ───────
_PINGFANG_TTC = (
    "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/"
    "86ba2c91f017a3749571a82f2c6d890ac7ffb2fb.asset/AssetData/PingFang.ttc"
)
if os.path.exists(_PINGFANG_TTC):
    fm.fontManager.addfont(_PINGFANG_TTC)
    # After adding, the TTC faces become known by names like "PingFang SC"
    # Rebuild the font list so the family name resolves
    fm._load_fontmanager(try_read_cache=False)

# Use a known-good CJK family; fall back to STHeiti if PingFang not resolved
_CJK_CANDIDATES = ["PingFang SC", "Heiti SC", "STHeiti", "Heiti TC"]
_available = {f.name for f in fm.fontManager.ttflist}
_CJK_FAMILY = next((n for n in _CJK_CANDIDATES if n in _available), "sans-serif")
print(f"[font] Selected CJK font family: {_CJK_FAMILY}")

plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.sans-serif"] = [_CJK_FAMILY, "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

OUTPUT_DIR = Path("/Users/huyongle/Desktop/workspace/skills/.skill-workspaces/diagram-studio/iteration-1/eval-3-layered-architecture/without-skill/outputs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Global style constants ──────────────────────────────────────────────
DPI = 200
FIG_W, FIG_H = 28, 18

# Color palette (professional, muted)
COLORS = {
    "client_bg":       "#E3F2FD",  # light blue
    "client_border":   "#1565C0",
    "client_text":     "#0D47A1",
    "access_bg":       "#E8F5E9",  # light green
    "access_border":   "#2E7D32",
    "access_text":     "#1B5E20",
    "ai_bg":           "#FFF3E0",  # light orange
    "ai_border":       "#E65100",
    "ai_text":         "#BF360C",
    "data_bg":         "#F3E5F5",  # light purple
    "data_border":     "#6A1B9A",
    "data_text":       "#4A148C",
    "layer_label_bg":  "#37474F",  # dark grey
    "layer_label_fg":  "#FFFFFF",
    "arrow_color":     "#78909C",
    "arrow_highlight": "#FF6F00",
    "bg":              "#FAFAFA",
}

# ── Architecture definition (also used for layout.yaml) ─────────────────
ARCHITECTURE = {
    "title": "AI 智能客服系统 - 分层技术架构图",
    "subtitle": "AI Intelligent Customer Service System - Layered Technical Architecture",
    "layers": [
        {
            "id": "client",
            "label_en": "Client Layer",
            "label_zh": "客户端层",
            "y": 0.82,
            "height": 0.14,
            "components": [
                {"id": "web_chat",   "label_zh": "Web Chat",          "label_en": "网页在线客服",  "marker": "W"},
                {"id": "mobile_app", "label_zh": "Mobile App",        "label_en": "移动端 APP",    "marker": "M"},
                {"id": "wechat_work","label_zh": "企业微信",           "label_en": "WeChat Work",   "marker": "Q"},
            ],
        },
        {
            "id": "access",
            "label_en": "Access Layer",
            "label_zh": "接入层",
            "y": 0.59,
            "height": 0.18,
            "components": [
                {"id": "api_gateway", "label_zh": "API Gateway",     "label_en": "API 网关 (Kong/APISIX)", "marker": "G"},
                {"id": "websocket",   "label_zh": "WebSocket",       "label_en": "长连接推送服务",         "marker": "W"},
                {"id": "auth",        "label_zh": "鉴权",             "label_en": "JWT/OAuth2 身份认证",    "marker": "A"},
            ],
        },
        {
            "id": "ai_service",
            "label_en": "AI Service Layer",
            "label_zh": "AI 服务层",
            "y": 0.30,
            "height": 0.24,
            "components": [
                {"id": "nlu",          "label_zh": "NLU 意图识别",    "label_en": "NLU Intent Recognition",  "marker": "N"},
                {"id": "rag",          "label_zh": "知识检索 RAG",    "label_en": "RAG Knowledge Retrieval", "marker": "R"},
                {"id": "llm",          "label_zh": "大模型调用",       "label_en": "LLM Invocation",          "marker": "L"},
                {"id": "dialog_mgr",   "label_zh": "多轮对话管理",    "label_en": "Multi-turn Dialog Mgr",   "marker": "D"},
            ],
        },
        {
            "id": "data",
            "label_en": "Data Layer",
            "label_zh": "数据层",
            "y": 0.06,
            "height": 0.19,
            "components": [
                {"id": "milvus",       "label_zh": "向量数据库 Milvus", "label_en": "Milvus Vector DB",       "marker": "V"},
                {"id": "mysql",        "label_zh": "MySQL",             "label_en": "Relational Database",   "marker": "S"},
                {"id": "redis",        "label_zh": "Redis 缓存",         "label_en": "Redis Cache",            "marker": "C"},
                {"id": "elasticsearch","label_zh": "Elasticsearch 日志","label_en": "ES Log & Search",        "marker": "E"},
            ],
        },
    ],
    "connections": [
        # Client -> Access (downward)
        {"from": "client",   "to": "access",     "label": "HTTPS / WSS"},
        # Access -> AI Service
        {"from": "access",   "to": "ai_service", "label": "gRPC / REST"},
        # AI Service -> Data
        {"from": "ai_service", "to": "data",     "label": "SDK / SQL / API"},
        # AI Service -> Access (response back)
        {"from": "ai_service", "to": "access",   "label": "流式响应 (SSE)", "style": "dashed"},
    ],
}

# ── Drawing helpers ─────────────────────────────────────────────────────

def draw_rounded_box(ax, x, y, w, h, fc, ec, lw=2.0, radius=0.012):
    """Draw a single rounded rectangle."""
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0,rounding_size={radius*FIG_W:.1f}",
        facecolor=fc, edgecolor=ec, linewidth=lw, zorder=3,
    )
    ax.add_patch(box)


def draw_layer_band(ax, layer, idx):
    """Draw a full layer background band and label."""
    y0 = layer["y"]
    h  = layer["height"]
    x0 = 0.03
    w  = 0.94

    # Semi-transparent band
    color_id_map = {
        "client": COLORS["client_bg"],
        "access": COLORS["access_bg"],
        "ai_service": COLORS["ai_bg"],
        "data": COLORS["data_bg"],
    }
    border_map = {
        "client": COLORS["client_border"],
        "access": COLORS["access_border"],
        "ai_service": COLORS["ai_border"],
        "data": COLORS["data_border"],
    }
    fc = color_id_map.get(layer["id"], "#EEEEEE")
    ec = border_map.get(layer["id"], "#999999")

    band = FancyBboxPatch(
        (x0, y0), w, h,
        boxstyle="round,pad=0.003",
        facecolor=fc, edgecolor=ec, linewidth=2.5,
        alpha=0.35, zorder=1,
    )
    ax.add_patch(band)

    # Layer label (left side vertical strip)
    label_w = 0.10
    label_box = FancyBboxPatch(
        (x0, y0 + h - 0.038), label_w, 0.038,
        boxstyle="round,pad=0.002",
        facecolor=COLORS["layer_label_bg"],
        edgecolor="none", zorder=5,
    )
    ax.add_patch(label_box)
    ax.text(
        x0 + label_w/2, y0 + h - 0.019,
        f"{layer['label_zh']}\n{layer['label_en']}",
        ha="center", va="center", fontsize=8.5, fontweight="bold",
        color=COLORS["layer_label_fg"], zorder=6,
    )


def draw_component(ax, comp, layer):
    """Draw a single component box within a layer."""
    # Calculate x position based on number of components
    n = len(layer["components"])
    idx = layer["components"].index(comp)
    spacing = 0.82 / n
    gap = 0.03
    comp_w = spacing - gap
    x_start = 0.15 + idx * spacing
    y_center = layer["y"] + layer["height"] / 2

    color_id_map = {
        "client":     (COLORS["client_bg"], COLORS["client_border"], COLORS["client_text"]),
        "access":     (COLORS["access_bg"], COLORS["access_border"], COLORS["access_text"]),
        "ai_service": (COLORS["ai_bg"],     COLORS["ai_border"],     COLORS["ai_text"]),
        "data":       (COLORS["data_bg"],   COLORS["data_border"],   COLORS["data_text"]),
    }
    fc, ec, tc = color_id_map.get(layer["id"], ("#EEE", "#999", "#333"))

    comp_h = layer["height"] * 0.55
    y_bottom = y_center - comp_h / 2

    draw_rounded_box(ax, x_start, y_bottom, comp_w, comp_h, fc, ec, lw=2.2)

    # Marker badge (colored circle with letter)
    marker = comp.get("marker", "?")
    marker_cx = x_start + comp_w / 2
    marker_cy = y_bottom + comp_h * 0.68
    marker_r = comp_h * 0.16
    marker_circle = plt.Circle(
        (marker_cx, marker_cy), marker_r,
        facecolor=ec, edgecolor="white", linewidth=1.5, zorder=4,
    )
    ax.add_patch(marker_circle)
    ax.text(
        marker_cx, marker_cy,
        marker,
        ha="center", va="center", fontsize=9, fontweight="bold",
        color="white", zorder=5,
    )

    # Labels
    ax.text(
        x_start + comp_w/2, y_bottom + comp_h * 0.38,
        comp["label_zh"],
        ha="center", va="center", fontsize=8.5, fontweight="bold",
        color=tc, zorder=4,
    )
    ax.text(
        x_start + comp_w/2, y_bottom + comp_h * 0.15,
        comp["label_en"],
        ha="center", va="center", fontsize=6.0,
        color=tc, alpha=0.75, zorder=4,
    )


def draw_arrow(ax, x1, y1, x2, y2, label="", style="solid", color=None):
    """Draw an arrow between two points."""
    c = color or COLORS["arrow_color"]
    ls = "dashed" if style == "dashed" else "solid"
    lw = 1.5 if style == "dashed" else 2.2

    ax.annotate(
        "", xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(
            arrowstyle="->", color=c, lw=lw, ls=ls,
            connectionstyle="arc3,rad=0.05",
        ),
        zorder=2,
    )
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        # Offset to the right for readability
        ax.text(
            mx + 0.03, my + 0.005,
            label, fontsize=6, color=c, style="italic",
            ha="left", va="center", zorder=3,
            bbox=dict(boxstyle="round,pad=0.15", facecolor="white", edgecolor="none", alpha=0.7),
        )


def draw_inter_layer_connectors(ax, conns):
    """Draw arrows between layers."""
    right_x = 0.97
    for conn in conns:
        from_layer = next(l for l in ARCHITECTURE["layers"] if l["id"] == conn["from"])
        to_layer   = next(l for l in ARCHITECTURE["layers"] if l["id"] == conn["to"])
        y_from = from_layer["y"] + from_layer["height"] / 2
        y_to   = to_layer["y"]   + to_layer["height"] / 2

        is_highlight = conn.get("style") == "dashed"
        draw_arrow(
            ax, right_x, y_from, right_x, y_to,
            label=conn["label"],
            style=conn.get("style", "solid"),
            color=COLORS["arrow_highlight"] if is_highlight else COLORS["arrow_color"],
        )


def draw_data_flow_detail(ax):
    """Draw detailed internal data flow within and between layers."""
    # We'll annotate the internal connections in the AI service layer specifically

    # NLU -> Dialog Mgr
    nlu_cx = 0.15 + 0 * (0.82/4) + (0.82/4 - 0.03)/2
    dm_cx  = 0.15 + 3 * (0.82/4) + (0.82/4 - 0.03)/2
    ai_y_mid = 0.30 + 0.24/2

    # Draw flow arrows between AI components
    comp_centers = []
    for i in range(4):
        spacing = 0.82 / 4
        cx = 0.15 + i * spacing + (spacing - 0.03) / 2
        comp_centers.append(cx)

    # NLU(0) -> RAG(1) -> LLM(2) -> Dialog Mgr(3) pipeline inside AI layer
    ai_y_top = 0.30 + 0.24 * 0.78
    for i in range(3):
        x1 = comp_centers[i] + (0.82/4 - 0.03)/2 + 0.005
        x2 = comp_centers[i+1] - (0.82/4 - 0.03)/2 - 0.005
        ax.annotate(
            "", xy=(x2, ai_y_top), xytext=(x1, ai_y_top),
            arrowprops=dict(arrowstyle="->", color=COLORS["arrow_highlight"], lw=1.8),
            zorder=2,
        )

    # Label the pipeline
    ax.text(
        (comp_centers[0] + comp_centers[3])/2, ai_y_top + 0.008,
        "意图 → 检索 → 生成 → 对话编排",
        ha="center", va="bottom", fontsize=7, fontweight="bold",
        color=COLORS["ai_border"], style="italic", zorder=3,
    )


# ── Main drawing function ───────────────────────────────────────────────

def generate_diagram():
    fig, ax = plt.subplots(figsize=(FIG_W, FIG_H), dpi=DPI, facecolor=COLORS["bg"])
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    # ── Title ───────────────────────────────────────────────────────────
    ax.text(
        0.5, 0.97, ARCHITECTURE["title"],
        ha="center", va="center", fontsize=22, fontweight="bold",
        color="#263238",
    )
    ax.text(
        0.5, 0.935, ARCHITECTURE["subtitle"],
        ha="center", va="center", fontsize=12,
        color="#546E7A", style="italic",
    )

    # Subtle separator line
    ax.plot([0.15, 0.85], [0.925, 0.925], color="#B0BEC5", lw=1, zorder=1)

    # ── Draw layers ─────────────────────────────────────────────────────
    for idx, layer in enumerate(ARCHITECTURE["layers"]):
        draw_layer_band(ax, layer, idx)
        for comp in layer["components"]:
            draw_component(ax, comp, layer)

    # ── Draw inter-layer connectors ─────────────────────────────────────
    draw_inter_layer_connectors(ax, ARCHITECTURE["connections"])

    # ── Draw internal AI pipeline ───────────────────────────────────────
    draw_data_flow_detail(ax)

    # ── Legend / Footer ─────────────────────────────────────────────────
    legend_y = 0.015
    ax.text(
        0.5, legend_y + 0.008,
        "实线: 请求流   虚线: 响应流   →  AI 服务内部编排管线",
        ha="center", va="center", fontsize=8,
        color="#78909C",
    )

    # ── Save ────────────────────────────────────────────────────────────
    png_path = OUTPUT_DIR / "architecture.png"
    fig.savefig(png_path, dpi=DPI, bbox_inches="tight", facecolor=COLORS["bg"], edgecolor="none")
    plt.close(fig)
    print(f"[OK] PNG saved to {png_path}")
    return png_path


def generate_layout_yaml():
    """Export architecture definition as YAML for reproducibility."""
    layout_path = OUTPUT_DIR / "layout.yaml"
    with open(layout_path, "w", encoding="utf-8") as f:
        yaml.dump(ARCHITECTURE, f, allow_unicode=True, default_flow_style=False, sort_keys=False, width=120)
    print(f"[OK] layout.yaml saved to {layout_path}")
    return layout_path


def generate_summary():
    """Generate a process summary."""
    summary_path = OUTPUT_DIR / "summary.md"
    lines = [
        "# AI 智能客服系统 - 分层技术架构图生成报告",
        "",
        "## 生成方式",
        "",
        "- **工具**: Python 3 + Matplotlib 3.10.9 (纯程序化绘制)",
        "- **输入**: 手工编码的架构定义 (嵌套 dict)",
        "- **输出格式**: PNG (200 DPI, 28x18 inches) + YAML 结构定义",
        "",
        "## 架构清单",
        "",
        "| 层级 | 组件 | 说明 |",
        "|------|------|------|",
        "| 客户端层 | Web Chat | 网页在线客服入口 |",
        "| 客户端层 | Mobile App | 移动端 APP 接入 |",
        "| 客户端层 | 企业微信 | 企业微信渠道接入 |",
        "| 接入层 | API Gateway | Kong/APISIX 统一网关 |",
        "| 接入层 | WebSocket | 长连接推送服务 |",
        "| 接入层 | 鉴权 | JWT/OAuth2 身份认证 |",
        "| AI 服务层 | NLU 意图识别 | 自然语言理解与意图分类 |",
        "| AI 服务层 | 知识检索 RAG | 检索增强生成 |",
        "| AI 服务层 | 大模型调用 | LLM 推理调用 |",
        "| AI 服务层 | 多轮对话管理 | 上下文管理与对话编排 |",
        "| 数据层 | 向量数据库 Milvus | 向量存储与相似度检索 |",
        "| 数据层 | MySQL | 关系型业务数据存储 |",
        "| 数据层 | Redis 缓存 | 热点数据缓存与会话状态 |",
        "| 数据层 | Elasticsearch 日志 | 日志采集与全文检索 |",
        "",
        "## 数据流",
        "",
        "1. 客户端 → 接入层: HTTPS / WSS 加密传输",
        "2. 接入层 → AI 服务层: gRPC / REST 内部调用",
        "3. AI 服务层 → 数据层: SDK / SQL / API",
        "4. AI 服务层 → 接入层: SSE 流式响应回传",
        "",
        "## AI 服务内部管线",
        "",
        "`意图识别 → 知识检索 → 大模型生成 → 对话编排`",
        "",
        "## 配色方案",
        "",
        "- 客户端层: 浅蓝 (#E3F2FD)",
        "- 接入层: 浅绿 (#E8F5E9)",
        "- AI 服务层: 浅橙 (#FFF3E0)",
        "- 数据层: 浅紫 (#F3E5F5)",
        "",
        "## 文件产出",
        "",
        f"- `layout.yaml` — 架构结构定义",
        f"- `architecture.png` — 高清架构图 ({DPI} DPI)",
        f"- `summary.md` — 本报告",
    ]
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"[OK] summary.md saved to {summary_path}")
    return summary_path


# ── Entry point ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    generate_layout_yaml()
    generate_diagram()
    generate_summary()
    print("\nAll outputs generated successfully.")
