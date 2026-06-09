"""
Memex Knowledge Hierarchy — 四层知识提取管道 + 层级分类
Layer 0→1→2→3: Raw Evidence → Structured Incident → Root Cause → Knowledge Node
"""

import json
from pathlib import Path
from typing import Optional

from scripts.transcript_indexer import parse_transcript, extract_turns, detect_signals_in_turns, extract_tool_usage


def build_layer0(transcript_path: str, git_diff: str = "", tool_usage: list[dict] = None) -> dict:
    """Layer 0: Raw Evidence — 自动从 transcript 提取原始证据"""
    messages = parse_transcript(transcript_path)
    turns = extract_turns(messages)
    signals = detect_signals_in_turns(turns)
    if tool_usage is None:
        tool_usage = extract_tool_usage(turns)

    return {
        "message_count": len(messages),
        "turn_count": len(turns),
        "signals": signals,
        "tool_usage": tool_usage,
        "git_diff_summary": git_diff[:500] if git_diff else "",
    }


def build_layer1(raw: dict) -> dict:
    """Layer 1: Structured Incident — 从原始证据提取结构化事件（需 LLM agent 填充具体字段）"""
    return {
        "problem_statement": "",
        "context_project": "",
        "context_framework": "",
        "context_files": "[]",
        "symptoms": "[]",
        "attempts": "[]",
        "solution_description": "",
        "solution_code_snippet": "",
        "verification_type": "",
        "verification_evidence": "",
        "sentiment_score": raw.get("signals", [{}])[-1].get("sentiment_score", 0.5) if raw.get("signals") else 0.5,
        "category_path": "",
        "tags": "",
        "_raw_signals": raw.get("signals", []),
        "_raw_tools": raw.get("tool_usage", []),
    }


def build_layer2(layer1: dict) -> dict:
    """Layer 2: Root Cause Analysis — 根因和分类（需 LLM agent 深度分析）"""
    return {
        "root_cause": "",
        "causal_chain": "[]",
        "category_path": layer1.get("category_path", ""),
        "generalizable_pattern": "",
        "preconditions": "[]",
        "related_concepts": "[]",
    }


def build_layer3(layer2: dict, source_incidents: list[tuple] = None) -> dict:
    """Layer 3: Knowledge Node — 抽象知识模式"""
    return {
        "title": "",
        "scope": "personal",
        "abstraction_level": "pattern",
        "problem_statement": "",
        "root_cause": layer2.get("root_cause", ""),
        "solution_text": "",
        "key_takeaway": "",
        "causal_chain": layer2.get("causal_chain", "[]"),
        "preconditions": layer2.get("preconditions", "[]"),
        "source_incidents": json.dumps(source_incidents or []),
        "source_projects": "[]",
    }


def classify_auto(incident_text: str, keywords: list[str] = None) -> str:
    """根据文本内容自动推荐分类路径"""
    mapping = [
        # (keywords_in_text, path)
        (["graph", "edge", "zoom", "viewbox", "svg", "reactflow", "d3"], "rendering/coordinate"),
        (["flex", "grid", "layout", "css", "布局"], "rendering/layout"),
        (["animation", "transition", "animate", "动画"], "rendering/animation"),
        (["state", "race condition", "竞态", "时序", "useEffect cleanup"], "data/state/race"),
        (["api", "contract", "endpoint", "route", "路由"], "architecture/dependency"),
        (["build", "config", "webpack", "vite", "构建"], "tooling/build"),
        (["error", "exception", "crash", "错误"], "architecture/boundary"),
        (["debug", "trace", "root cause", "memory leak", "根因"], "methodology/debugging"),
        (["decision", "architecture", "choice", "决策"], "methodology/decision"),
        (["node", "edge", "graph"], "domain/graph/edge"),
    ]

    text = incident_text.lower()
    kw_text = " ".join(k.lower() for k in (keywords or []))

    for words, path in mapping:
        for word in words:
            if word.lower() in text or word.lower() in kw_text:
                return path

    return "methodology/workflow"


def full_pipeline(transcript_path: str, git_diff: str = "") -> dict:
    """完整提取管道：Layer 0 → Layer 1 → Layer 2 → Layer 3"""
    l0 = build_layer0(transcript_path, git_diff)
    l1 = build_layer1(l0)
    l2 = build_layer2(l1)
    l3 = build_layer3(l2)

    return {
        "layer0": {"message_count": l0["message_count"], "turn_count": l0["turn_count"], "signal_count": len(l0["signals"])},
        "layer1": {k: v for k, v in l1.items() if not k.startswith("_raw")},
        "layer2": l2,
        "layer3": l3,
    }


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        result = full_pipeline(sys.argv[1])
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("Usage: python hierarchy.py <transcript.jsonl>")
