#!/usr/bin/env python3
"""PreCompact: 压缩前保留高价值知识（项目库 + 全局库）"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scripts'))
from pathlib import Path
from lib import read_stdin, system_message, MEMEX_HOME, GLOBAL_DB, get_db_path
from context_injector import format_survival

event = read_stdin()
cwd = event.get('cwd', '')
global_db = str(GLOBAL_DB)

surv_parts = []

# 项目库
if cwd:
    project_db = get_db_path(cwd)
    if Path(project_db).exists():
        try:
            surv_parts.append(format_survival(project_db, label="项目"))
        except Exception:
            pass

# 全局库
if Path(global_db).exists():
    try:
        surv_parts.append(format_survival(global_db, label="全局"))
    except Exception:
        pass

combined = "\n\n".join(filter(None, surv_parts))
system_message(combined if combined.strip() else "")
