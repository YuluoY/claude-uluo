#!/usr/bin/env python3
"""PostToolUse: 工具调用模式记录 — 错误检测 + 文件引用"""
import sys, os, json, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scripts'))
from pathlib import Path
from lib import read_stdin, write_stdout, MEMEX_HOME, GLOBAL_DB, get_db_path

event = read_stdin()
tool_name = event.get('tool_name', '')
tool_input = event.get('tool_input', {})
tool_response = event.get('tool_response', event.get('tool_output', ''))

cwd = event.get('cwd', '')
session_id = event.get('session_id', '')

if not tool_name:
    write_stdout({})
    sys.exit(0)

# 确定目标库
global_db = str(GLOBAL_DB)
project_db = get_db_path(cwd) if cwd else None
target_db = project_db if (project_db and Path(project_db).exists()) else global_db

if not Path(target_db).exists():
    write_stdout({})
    sys.exit(0)

try:
    from db_ops import insert_signal, insert_edge
    import sqlite3

    # === 1. 错误检测 ===
    ERROR_PATTERNS = [
        (r'(?:Error|error|错误|失败|异常)', 'tool_error'),
        (r'(?:exit code [1-9]|exit status [1-9])', 'tool_error'),
        (r'(?:Permission denied|permission denied|权限不足|拒绝访问)', 'tool_error'),
        (r'(?:not found|No such file|cannot find|找不到|不存在)', 'tool_not_found'),
        (r'(?:Traceback|Exception|Stack trace)', 'tool_exception'),
        (r'(?:syntax error|SyntaxError|语法错误)', 'tool_syntax_error'),
        (r'(?:timeout|timed out|超时)', 'tool_timeout'),
        (r'(?:cannot resolve|connection refused|network|网络)', 'tool_network_error'),
    ]

    resp_str = str(tool_response) if tool_response else ''
    if isinstance(tool_response, dict):
        resp_str = json.dumps(tool_response)
    elif isinstance(tool_response, list):
        resp_str = ' '.join(str(x) for x in tool_response)

    for pattern, error_type in ERROR_PATTERNS:
        if re.search(pattern, resp_str):
            # 提取错误摘要（前 200 字符）
            match = re.search(pattern, resp_str)
            excerpt_start = max(0, match.start() - 40)
            excerpt = resp_str[excerpt_start:excerpt_start + 200]

            insert_signal(target_db, {
                'incident_id': None,
                'knowledge_node_id': None,
                'signal_type': error_type,
                'intensity': 0.7,
                'sentiment_score': 0.2,
                'emotion_type': '',
                'source_text': f"[{tool_name}] {excerpt}",
            })

            # 同时在全局库记录（用于跨项目错误模式分析）
            if target_db != global_db and Path(global_db).exists():
                insert_signal(global_db, {
                    'incident_id': None,
                    'knowledge_node_id': None,
                    'signal_type': error_type,
                    'intensity': 0.7,
                    'sentiment_score': 0.2,
                    'emotion_type': '',
                    'source_text': f"[{tool_name}][{cwd or 'unknown'}] {excerpt}",
                })
            break  # 只记录第一个匹配的错误类型

    # === 2. 文件引用 ===
    FILE_TOOLS = {'Read', 'Edit', 'Write', 'Grep', 'Glob'}
    if tool_name in FILE_TOOLS:
        file_path = tool_input.get('file_path', '') or tool_input.get('path', '')
        if file_path:
            conn = sqlite3.connect(target_db)
            conn.execute(
                "INSERT INTO file_references (file_path, change_type, created_at) VALUES (?, 'referenced', datetime('now'))",
                (str(file_path),)
            )
            conn.commit()
            conn.close()

    write_stdout({})

except Exception:
    write_stdout({})
