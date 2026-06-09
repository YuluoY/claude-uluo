#!/usr/bin/env python3
"""PreCompact: 压缩前保留高价值知识"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scripts'))
from pathlib import Path
from lib import read_stdin, system_message, MEMEX_HOME, GLOBAL_DB
from context_injector import format_survival

event = read_stdin()
global_db = str(GLOBAL_DB)

if not Path(global_db).exists():
    system_message("")
    sys.exit(0)

try:
    surv = format_survival(global_db)
    if surv.strip():
        system_message(surv)
    else:
        system_message("")
except Exception:
    system_message("")
