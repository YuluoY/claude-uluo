"""Diagram Studio — 图表类型注册表。

此模块支持两种使用场景：
1. 作为包导入: from scripts import REGISTRY, TYPE_ALIASES
2. 脚本直接导入: import flowchart, sequence, ... 然后手动构建注册表
"""

import sys
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

import flowchart
import sequence
import er
import class_diagram
import state
import gantt
import pie
import git_graph
import mindmap
import timeline
import quadrant
import sankey
import c4
import radar
import journey
import swimlane

REGISTRY: dict[str, object] = {
    "flowchart": flowchart,
    "architecture": flowchart,
    "layered": flowchart,
    "sequence": sequence,
    "er": er,
    "class": class_diagram,
    "state": state,
    "gantt": gantt,
    "pie": pie,
    "git_graph": git_graph,
    "git": git_graph,
    "mindmap": mindmap,
    "timeline": timeline,
    "quadrant": quadrant,
    "sankey": sankey,
    "c4": c4,
    "radar": radar,
    "journey": journey,
    "swimlane": swimlane,
}

TYPE_ALIASES = {
    "flowchart": "flowchart",
    "流程图": "flowchart",
    "graph": "flowchart",
    "architecture": "flowchart",
    "架构图": "flowchart",
    "layered": "flowchart",
    "分层图": "flowchart",
    "模块图": "flowchart",
    "sequence": "sequence",
    "时序图": "sequence",
    "sequenceDiagram": "sequence",
    "er": "er",
    "ER": "er",
    "erDiagram": "er",
    "class": "class",
    "class_diagram": "class",
    "classDiagram": "class",
    "类图": "class",
    "state": "state",
    "stateDiagram": "state",
    "状态图": "state",
    "gantt": "gantt",
    "甘特图": "gantt",
    "pie": "pie",
    "饼图": "pie",
    "git_graph": "git",
    "gitGraph": "git",
    "git": "git",
    "mindmap": "mindmap",
    "思维导图": "mindmap",
    "timeline": "timeline",
    "时间线": "timeline",
    "quadrant": "quadrant",
    "quadrantChart": "quadrant",
    "象限图": "quadrant",
    "sankey": "sankey",
    "sankey-beta": "sankey",
    "桑基图": "sankey",
    "c4": "c4",
    "C4Context": "c4",
    "C4Container": "c4",
    "C4架构图": "c4",
    "radar": "radar",
    "雷达图": "radar",
    "journey": "journey",
    "用户旅程": "journey",
    "用户旅程图": "journey",
    "swimlane": "swimlane",
    "泳道图": "swimlane",
}
