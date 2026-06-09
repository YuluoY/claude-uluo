#!/usr/bin/env python3
"""Stop: 每轮结束后的信号广播 + 逻辑链追溯"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scripts'))
from pathlib import Path
from lib import read_stdin, system_message, read_transcript, MEMEX_HOME, GLOBAL_DB

event = read_stdin()
transcript_path = event.get('transcript_path', '')

if not transcript_path or not Path(transcript_path).exists():
    system_message("")
    sys.exit(0)

try:
    from transcript_indexer import parse_transcript, extract_turns, detect_signals_in_turns
    from sentiment_detector import detect, detect_keywords_keep

    msgs = parse_transcript(transcript_path)
    if not msgs:
        system_message("")
        sys.exit(0)

    turns = extract_turns(msgs)
    signals = detect_signals_in_turns(turns)

    # 取最新一轮信号
    latest_signal = signals[-1] if signals else None
    if not latest_signal:
        system_message("")
        sys.exit(0)

    # 如果有强信号且全局 DB 存在，更新评分
    global_db = str(GLOBAL_DB)
    if Path(global_db).exists() and latest_signal.get('signal_type') != 'neutral':
        from rating_engine import update_lesson_rating
        from db_ops import search_knowledge

        keywords = latest_signal.get('text', '')
        results = search_knowledge(global_db, keywords, 3)
        for r in results:
            try:
                update_lesson_rating(
                    global_db, r['id'],
                    latest_signal['signal_type'],
                    latest_signal.get('intensity', 0.5),
                    0.7  # 自动信号置信度低于手动
                )
            except Exception:
                pass

    system_message("")
except Exception:
    system_message("")
