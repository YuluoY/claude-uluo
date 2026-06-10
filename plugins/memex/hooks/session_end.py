#!/usr/bin/env python3
"""SessionEnd: 会话归档 + 信号提取 + 通知 Claude 进行 LLM 知识提取"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scripts'))
from pathlib import Path
from lib import read_stdin, write_stdout, MEMEX_HOME, GLOBAL_DB, ensure_memex_dirs, get_db_path

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

    ensure_memex_dirs(cwd)
    global_db = str(GLOBAL_DB)
    project_db = get_db_path(cwd) if cwd else None
    project_db_exists = project_db and Path(project_db).exists()

    # Session 记录写入项目库（有项目上下文时）
    target_db = project_db if project_db_exists else global_db
    if Path(target_db).exists():
        import sqlite3
        conn = sqlite3.connect(target_db)
        conn.execute(
            "INSERT OR IGNORE INTO sessions (session_id, cwd, transcript_path, incident_count, signal_count) VALUES (?,?,?,?,?)",
            (session_id, cwd, transcript_path, 0, signal_count)
        )
        conn.commit()
        conn.close()

    if signal_count > 0 and summary.get('signals'):
        # 持久化所有信号到 DB
        try:
            from db_ops import insert_signal
            for s in summary['signals']:
                insert_signal(target_db, {
                    'incident_id': None,
                    'knowledge_node_id': None,
                    'signal_type': s.get('signal_type', 'neutral'),
                    'intensity': s.get('intensity', 0.5),
                    'sentiment_score': s.get('sentiment_score', 0.5),
                    'emotion_type': s.get('emotion', ''),
                    'source_text': s.get('text', '')[:200],
                })
        except Exception:
            pass

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

目标库: {target_db}

请分析以下信号并提取结构化经验:

{json.dumps(signal_summaries, indent=2, ensure_ascii=False)}

提取方法（两步，务必执行）:
1. 先写入 incident（问题事件）获取 incident_id:
  PYTHONPATH={Path(__file__).resolve().parent.parent}/scripts python3 -c "
  from db_ops import insert_incident;
  iid = insert_incident('{target_db}', {{'problem_statement':'...', 'context_project':'{Path(cwd).name if cwd else \"\"}', 'context_files':'[]', 'symptoms':'[]', 'solution_description':'...', 'verification_type':'user_confirmed', 'sentiment_score':0.9}});
  print(f'incident_id={{iid}}')
  "
2. 再写入 knowledge_node 并关联 incident:
  PYTHONPATH={Path(__file__).resolve().parent.parent}/scripts python3 -c "
  from db_ops import insert_knowledge_node, insert_edge; from rating_engine import update_lesson_rating;
  kid = insert_knowledge_node('{target_db}', {{'title':'...', 'category_path':'...', 'root_cause':'...', 'key_takeaway':'...', 'scope':'project', 'source_projects': [{json.dumps(cwd)}], 'source_incidents': ['<incident_id>']}});
  insert_edge('{target_db}', 'knowledge_node', kid, 'incident', '<incident_id>', 'DERIVED_FROM', 1.0);
  update_lesson_rating('{target_db}', kid, 'confirm', 0.9, 1.0)
  "
"""

        write_stdout({"systemMessage": extraction_prompt})
    else:
        write_stdout({})

except Exception as e:
    write_stdout({})
