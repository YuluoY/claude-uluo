#!/usr/bin/env python3
"""Stop: 每轮结束后的信号广播 + 强正向信号自动提取知识节点"""
import sys, os, glob, json as _json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scripts'))
from pathlib import Path
from lib import read_stdin, system_message, read_transcript, MEMEX_HOME, GLOBAL_DB, get_db_path

event = read_stdin()
transcript_path = event.get('transcript_path', '')
cwd = event.get('cwd', '')

# ---- transcript 回退策略：若传入路径无效，自动搜索项目目录 ----
if not transcript_path or not Path(transcript_path).exists():
    project_name = Path(cwd).resolve().name if cwd else ''
    for base in [Path.home() / '.claude' / 'projects']:
        if base.exists():
            for d in base.iterdir():
                if d.is_dir() and project_name in d.name:
                    for f in sorted(d.glob('*.jsonl'), key=lambda p: p.stat().st_mtime, reverse=True):
                        if 'subagents' not in str(f):
                            transcript_path = str(f)
                            break
                    if transcript_path:
                        break
        if transcript_path:
            break

if not transcript_path or not Path(transcript_path).exists():
    system_message("")
    sys.exit(0)

try:
    from transcript_indexer import parse_transcript, extract_turns, detect_signals_in_turns
    from sentiment_detector import detect
    from db_ops import search_knowledge, insert_signal, insert_knowledge_node
    from rating_engine import update_lesson_rating

    msgs = parse_transcript(transcript_path)
    if not msgs:
        system_message("")
        sys.exit(0)

    turns = extract_turns(msgs)
    signals = detect_signals_in_turns(turns)

    latest_signal = signals[-1] if signals else None
    if not latest_signal:
        system_message("")
        sys.exit(0)

    if latest_signal.get('signal_type') != 'neutral':
        keywords = latest_signal.get('text', '')
        signal_type = latest_signal['signal_type']
        intensity = latest_signal.get('intensity', 0.5)
        confidence = 0.7

        dbs_to_search = []
        if cwd:
            project_db = get_db_path(cwd)
            if Path(project_db).exists():
                dbs_to_search.append(project_db)
        global_db = str(GLOBAL_DB)
        if Path(global_db).exists():
            dbs_to_search.append(global_db)
        signal_db = dbs_to_search[0] if dbs_to_search else global_db

        # ---- 搜索匹配知识节点并更新评分 ----
        matched_any = False
        for db_path in dbs_to_search:
            try:
                results = search_knowledge(db_path, keywords, 3)
                for r in results:
                    matched_any = True
                    update_lesson_rating(db_path, r['id'], signal_type, intensity, confidence)
                    insert_signal(db_path, {
                        'incident_id': None,
                        'knowledge_node_id': r['id'],
                        'signal_type': signal_type,
                        'intensity': intensity,
                        'sentiment_score': latest_signal.get('sentiment_score', 0.5),
                        'emotion_type': latest_signal.get('emotion', ''),
                        'source_text': latest_signal.get('text', '')[:200],
                    })
            except Exception:
                pass

        # ---- 强正向信号 + 无匹配 → 自动创建知识节点 ----
        is_strong_positive = signal_type in ('strong_confirm', 'confirm') and intensity >= 0.7
        if is_strong_positive and not matched_any and dbs_to_search:
            try:
                # 从 transcript 提取 assistant 最后一轮文本回复
                assistant_text = ''
                for turn in reversed(turns):
                    assistant = turn.get('assistant')
                    if not isinstance(assistant, dict):
                        continue
                    blocks = assistant.get('content_blocks', [])
                    texts = [
                        b.get('text', '')
                        for b in blocks
                        if isinstance(b, dict) and b.get('type') == 'text'
                    ]
                    combined = ' '.join(texts).strip()
                    if combined and len(combined) > 50:
                        assistant_text = combined[:2000]
                        break

                user_text = latest_signal.get('text', '')[:300]

                # 标题：用户信号文本摘要
                title = '正向确认: ' + (user_text[:120] if user_text else '方案正确')

                # 摘要：优先用 assistant 回复，否则用用户文本
                summary = (assistant_text or user_text)[:300]

                knowledge_data = {
                    'title': title[:200],
                    'scope': 'project',
                    'abstraction_level': 'affirmation',
                    'category_path': 'methodology/feedback',
                    'problem_statement': '',
                    'root_cause': '',
                    'solution_text': summary,
                    'key_takeaway': summary[:150],
                    'causal_chain': '[]',
                    'preconditions': '[]',
                    'trueskill_mu': 30.0,
                    'trueskill_sigma': 8.333,
                    'source_projects': _json.dumps([str(Path(cwd).resolve())]) if cwd else '[]',
                    'source_incidents': '[]',
                }

                node_id = insert_knowledge_node(signal_db, knowledge_data, dedup=True)
                if node_id:
                    update_lesson_rating(signal_db, node_id, signal_type, intensity, 0.9)
                    insert_signal(signal_db, {
                        'incident_id': None,
                        'knowledge_node_id': node_id,
                        'signal_type': signal_type,
                        'intensity': intensity,
                        'sentiment_score': latest_signal.get('sentiment_score', 0.5),
                        'emotion_type': latest_signal.get('emotion', ''),
                        'source_text': user_text[:200],
                    })
                    system_message(f'📚 Memex: +1 知识节点 #{node_id} (从正向反馈自动提取)')
            except Exception:
                pass

        # ---- 无匹配节点时记录裸信号 ----
        if not matched_any and not is_strong_positive:
            try:
                insert_signal(signal_db, {
                    'incident_id': None,
                    'knowledge_node_id': None,
                    'signal_type': signal_type,
                    'intensity': intensity,
                    'sentiment_score': latest_signal.get('sentiment_score', 0.5),
                    'emotion_type': latest_signal.get('emotion', ''),
                    'source_text': latest_signal.get('text', '')[:200],
                })
            except Exception:
                pass

    system_message("")
except Exception:
    system_message("")
