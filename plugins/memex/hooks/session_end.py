#!/usr/bin/env python3
"""SessionEnd: 会话归档 + 信号提取 + 通知 Claude 进行 LLM 知识提取"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scripts'))
from pathlib import Path
from lib import read_stdin, write_stdout, MEMEX_HOME, GLOBAL_DB, ensure_memex_dirs

event = read_stdin()
transcript_path = event.get('transcript_path', '')
session_id = event.get('session_id', '')
cwd = event.get('cwd', '')

if not transcript_path or not Path(transcript_path).exists():
    write_stdout({})
    sys.exit(0)

try:
    from transcript_indexer import index_session
    from db_ops import stats

    summary = index_session(transcript_path)
    signal_count = summary.get('signal_count', 0)

    # 记录 session
    ensure_memex_dirs(cwd)
    global_db = str(GLOBAL_DB)
    if Path(global_db).exists():
        import sqlite3
        conn = sqlite3.connect(global_db)
        conn.execute(
            "INSERT OR IGNORE INTO sessions (session_id, cwd, transcript_path, incident_count, signal_count) VALUES (?,?,?,?,?)",
            (session_id, cwd, transcript_path, 0, signal_count)
        )
        conn.commit()
        conn.close()

    # 如果有强信号，通知 Claude 进行 LLM 知识提取
    # 导出团队 patches
    try:
        from sync_engine import export_team_patches
        patches = export_team_patches(global_db, cwd)
    except Exception:
        patches = []

    if signal_count > 0 and summary.get('signals'):
        # 提取前 5 个信号摘要
        signal_summaries = []
        for s in summary['signals'][:5]:
            signal_summaries.append({
                'type': s['signal_type'],
                'text': s['text'][:120],
                'intensity': s['intensity'],
                'is_explicit_keep': s.get('is_explicit_keep', False),
            })

        extraction_prompt = f"""[Memex] 会话归档完成: {signal_count} 个信号, {summary['tool_count']} 次工具调用。

请分析以下信号并提取结构化经验:

{json.dumps(signal_summaries, indent=2, ensure_ascii=False)}

提取方法: 对每个信号，确定是否包含有价值的问题解决经验。如果有，用 Python 写入 Memex DB:
  PYTHONPATH={Path(__file__).resolve().parent.parent}/scripts python3 -c "
  from db_ops import insert_knowledge_node; from rating_engine import update_lesson_rating;
  kid = insert_knowledge_node('{global_db}', {{'title':'...', 'category_path':'...', 'root_cause':'...', 'key_takeaway':'...', 'source_projects': [{json.dumps(cwd)}]}});
  update_lesson_rating('{global_db}', kid, 'confirm', 0.9, 1.0)
  "
"""

        write_stdout({"systemMessage": extraction_prompt})
    else:
        write_stdout({})

except Exception as e:
    write_stdout({})
