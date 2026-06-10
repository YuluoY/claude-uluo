#!/usr/bin/env python3
"""Stop: 每轮结束后的信号广播 + 逻辑链追溯（项目库 + 全局库双写）"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scripts'))
from pathlib import Path
from lib import read_stdin, system_message, read_transcript, MEMEX_HOME, GLOBAL_DB, get_db_path

event = read_stdin()
transcript_path = event.get('transcript_path', '')
cwd = event.get('cwd', '')

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

    if latest_signal.get('signal_type') != 'neutral':
        from rating_engine import update_lesson_rating
        from db_ops import search_knowledge

        keywords = latest_signal.get('text', '')
        signal_type = latest_signal['signal_type']
        intensity = latest_signal.get('intensity', 0.5)
        confidence = 0.7  # 自动信号置信度低于手动

        # 搜索并更新所有 DB（项目库 + 全局库）
        dbs_to_search = []

        # 项目库
        if cwd:
            project_db = get_db_path(cwd)
            if Path(project_db).exists():
                dbs_to_search.append(project_db)

        # 全局库
        global_db = str(GLOBAL_DB)
        if Path(global_db).exists():
            dbs_to_search.append(global_db)

        for db_path in dbs_to_search:
            try:
                results = search_knowledge(db_path, keywords, 3)
                for r in results:
                    update_lesson_rating(db_path, r['id'], signal_type, intensity, confidence)
            except Exception:
                pass

    system_message("")
except Exception:
    system_message("")
