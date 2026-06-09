#!/usr/bin/env python3
"""UserPromptSubmit: 检测用户消息中的情感信号 + 自动搜索"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scripts'))
from pathlib import Path
from lib import read_stdin, system_message, MEMEX_HOME, GLOBAL_DB

event = read_stdin()
text = event.get('user_prompt', '')
if not text or not text.strip():
    system_message("")
    sys.exit(0)

# 情感信号检测
try:
    from sentiment_detector import detect, detect_keywords_keep
    signal = detect(text)

    # 自动搜索（如果信号强烈）
    if signal['signal_type'] in ('strong_confirm', 'confirm', 'failure', 'correction'):
        global_db = str(GLOBAL_DB)
        if Path(global_db).exists():
            from db_ops import search_knowledge
            keywords = signal.get('keywords', []) or text.split()[:5]
            query = ' '.join(keywords) if keywords else text[:100]
            results = search_knowledge(global_db, query, 3)
            if results:
                lines = [f"[Memex 检测到 {signal['signal_type']} 信号, 自动搜索命中:]"]
                for r in results:
                    lines.append(
                        f"  #{r['id']} [{r.get('category_path','')}] {r['title']}"
                        f" (μ={r.get('trueskill_mu',25):.1f})"
                    )
                system_message('\n'.join(lines))
                sys.exit(0)

    system_message("")
except Exception:
    system_message("")
