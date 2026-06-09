"""
Memex Transcript Indexer — Claude Code JSONL 解析
适配真实 Claude Code transcript 格式（v2.x）
"""

import json
from pathlib import Path
from typing import Optional


def parse_transcript(path: str) -> list[dict]:
    """读取 Claude Code JSONL transcript 文件"""
    if not path or not Path(path).exists():
        return []
    messages = []
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
                if msg.get("type") in ("user", "assistant"):
                    messages.append(msg)
            except json.JSONDecodeError:
                continue
    return messages


def extract_user_text(msg: dict) -> str:
    """从 Claude Code user 消息中提取文本"""
    message = msg.get("message", {})
    content = message.get("content", [])
    if isinstance(content, list):
        texts = []
        for c in content:
            if isinstance(c, dict) and c.get("type") == "text":
                texts.append(c.get("text", ""))
        return " ".join(texts).strip()
    if isinstance(content, str):
        return content.strip()
    return ""


def extract_turns(messages: list[dict]) -> list[dict]:
    """从 Claude Code transcript 提取 user-assistant 对话轮次"""
    turns = []
    current = {"user": None, "assistant": {"content_blocks": [], "tool_uses": []}}

    for msg in messages:
        t = msg.get("type", "")

        if t == "user":
            if current["user"] is not None:
                turns.append(current)
            text = extract_user_text(msg)
            current = {
                "user": {"raw": msg, "text": text},
                "assistant": {"content_blocks": [], "tool_uses": []}
            }
        elif t == "assistant":
            message = msg.get("message", {})
            content = message.get("content", [])
            if isinstance(content, list):
                for c in content:
                    current["assistant"]["content_blocks"].append(c)
                    if isinstance(c, dict) and c.get("type") == "tool_use":
                        current["assistant"]["tool_uses"].append({
                            "name": c.get("name", ""),
                            "input": c.get("input", {}),
                            "id": c.get("id", ""),
                        })
            current["assistant"]["stop_reason"] = message.get("stop_reason", "")

    if current["user"] is not None:
        turns.append(current)

    return turns


def detect_signals_in_turns(turns: list[dict]) -> list[dict]:
    """在对话轮次中检测情感信号"""
    signals = []
    for i, turn in enumerate(turns):
        user = turn.get("user", {})
        text = user.get("text", "")
        if not text:
            continue

        from sentiment_detector import detect, detect_keywords_keep
        sentiment = detect(text)

        if sentiment.get("signal_type", "neutral") != "neutral" or detect_keywords_keep(text):
            signals.append({
                "turn_index": i,
                "text": text[:200],
                "signal_type": sentiment.get("signal_type", "neutral"),
                "intensity": sentiment.get("intensity", 0.0),
                "sentiment_score": sentiment.get("sentiment_score", 0.5),
                "emotion": sentiment.get("emotion", ""),
                "trigger_llm": sentiment.get("llm_trigger", False),
                "is_explicit_keep": detect_keywords_keep(text),
            })

    return signals


def extract_tool_usage(turns: list[dict]) -> list[dict]:
    """提取工具使用模式"""
    usage = []
    for i, turn in enumerate(turns):
        assistant = turn.get("assistant", {})
        for tool in assistant.get("tool_uses", []):
            usage.append({
                "turn_index": i,
                "tool_name": tool.get("name", ""),
                "tool_input_summary": _summarize_input(tool.get("name", ""), tool.get("input", {})),
            })
    return usage


def _summarize_input(tool_name: str, tool_input: dict) -> str:
    if not tool_input:
        return ""
    if tool_name in ("Bash",):
        return tool_input.get("command", "")[:100]
    elif tool_name in ("Edit", "Write", "Read"):
        return f"file={tool_input.get('file_path','')}"
    elif tool_name == "Skill":
        return f"skill={tool_input.get('skill','')}"
    elif tool_name == "Agent":
        return tool_input.get("description", "")[:80]
    return str(tool_input)[:80]


def index_session(transcript_path: str) -> dict:
    """完整索引一个 session 的 transcript"""
    messages = parse_transcript(transcript_path)
    turns = extract_turns(messages)
    signals = detect_signals_in_turns(turns)
    tools = extract_tool_usage(turns)

    return {
        "message_count": len(messages),
        "turn_count": len(turns),
        "signal_count": len(signals),
        "tool_count": len(tools),
        "signals": signals,
        "tool_usage": tools,
    }


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        result = index_session(sys.argv[1])
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("Usage: python transcript_indexer.py <transcript.jsonl>")
