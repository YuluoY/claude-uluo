#!/usr/bin/env python3
"""SessionStart: 注入高价值经验 + 项目逻辑链到 Claude 上下文"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scripts'))
from pathlib import Path
from lib import read_stdin, system_message, ensure_memex_dirs, get_db_path, MEMEX_HOME, GLOBAL_DB
from context_injector import format_injection

event = read_stdin()
cwd = event.get('cwd', str(Path.cwd()))

ensure_memex_dirs(cwd)
project_db = get_db_path(cwd)
global_db = str(GLOBAL_DB)

# 检查 DB 是否存在，不存在则初始化
for db_path in [global_db, project_db]:
    if not Path(db_path).exists():
        from db_schema import init_db
        init_db(db_path)

# 导入团队 patches
try:
    from sync_engine import import_team_patches
    result = import_team_patches(global_db, cwd)
except Exception:
    result = {"imported": 0, "merged": 0}

# 生成上下文注入
try:
    team_dir = (Path(cwd) / '.claude' / 'memex' / 'team') if cwd else None
    ctx = format_injection(global_db, cwd=cwd, project_db_path=project_db, team_dir=str(team_dir) if team_dir and team_dir.exists() else None)
    if result.get("imported", 0) > 0 or result.get("merged", 0) > 0:
        ctx = f"[Memex] 已同步团队经验: 新 {result['imported']} 条, 合并 {result['merged']} 条\n\n{ctx}"
    if ctx.strip():
        system_message(ctx)
    else:
        system_message("")
except Exception:
    system_message("")
