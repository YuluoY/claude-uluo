#!/usr/bin/env python3
"""Generate Sankey and Radar diagrams for eval-4."""

import sys
from pathlib import Path

# Ensure the diagram-studio root is on sys.path
ROOT_DIR = Path("/Users/huyongle/Desktop/workspace/skills/diagram-studio")
sys.path.insert(0, str(ROOT_DIR))

from scripts.sankey import render as sankey_render
from scripts.radar import render as radar_render

OUTPUT_DIR = Path("/Users/huyongle/Desktop/workspace/skills/.skill-workspaces/diagram-studio/iteration-1/eval-4-sankey-radar/with-skill/outputs")

# ---- Sankey: SaaS User Conversion Funnel ----
sankey_data = {
    "title": "SaaS 产品用户转化漏斗",
    "flows": [
        {"source": "网站访问", "target": "注册账号", "value": 10000},
        {"source": "注册账号", "target": "激活试用", "value": 2500},
        {"source": "激活试用", "target": "首次付费", "value": 1200},
        {"source": "首次付费", "target": "续费",      "value": 400},
    ],
}

print("Generating Sankey diagram...")
sankey_render(sankey_data, OUTPUT_DIR / "sankey.png", figure_bg="#ffffff")
print(f"  -> {OUTPUT_DIR / 'sankey.png'}")

# ---- Radar: Three Tech Solutions Comparison ----
radar_data = {
    "title": "技术方案多维对比分析",
    "axes": ["性能", "可维护性", "开发效率", "社区生态", "学习成本", "扩展性"],
    "items": [
        {"label": "方案A: 微服务",        "values": [8, 7, 5, 9, 4, 9]},
        {"label": "方案B: 模块化单体",    "values": [6, 8, 9, 7, 8, 6]},
        {"label": "方案C: Serverless",    "values": [9, 6, 8, 5, 7, 8]},
    ],
    "max_value": 10,
}

print("Generating Radar chart...")
radar_render(radar_data, OUTPUT_DIR / "radar.png", figure_bg="#ffffff")
print(f"  -> {OUTPUT_DIR / 'radar.png'}")

print("Done.")
