"""
Memex Hook 共享工具库
- 读取 stdin JSON（orjson 快速解析）
- 写入 stdout JSON（systemMessage / hookSpecificOutput）
- 读取 transcript JSONL 文件
- 获取 plugin 根目录
"""

import os
import sys
from pathlib import Path

try:
    import orjson as json
except ImportError:
    import json

PLUGIN_ROOT = Path(os.environ.get("CLAUDE_PLUGIN_ROOT", Path(__file__).resolve().parent.parent))
MEMEX_HOME = Path.home() / ".claude" / "memex"
GLOBAL_DB = MEMEX_HOME / "global.db"


def read_stdin():
    """从 stdin 读取 Hook 事件 JSON。始终返回 dict。"""
    try:
        raw = sys.stdin.buffer.read()
        if not raw:
            return {}
        return json.loads(raw)
    except Exception:
        return {}


def write_stdout(data: dict):
    """向 stdout 写入 JSON（供 Claude Code 处理）。"""
    try:
        output = json.dumps(data, option=json.OPT_INDENT_2)
    except (AttributeError, TypeError):
        output = json.dumps(data, indent=2, ensure_ascii=False)
    if isinstance(output, bytes):
        output = output.decode("utf-8")
    sys.stdout.write(output)
    sys.stdout.flush()


def system_message(text: str):
    """输出 systemMessage 给 Claude Code。"""
    write_stdout({"systemMessage": text})


def read_transcript(path: str):
    """读取 transcript JSONL 文件，返回消息列表。"""
    if not path or not Path(path).exists():
        return []
    messages = []
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                messages.append(json.loads(line))
            except Exception:
                continue
    return messages


def get_db_path(cwd: str = None) -> str:
    """获取数据目录路径，并确保存在。"""
    if cwd:
        project_name = Path(cwd).resolve().name
        project_dir = MEMEX_HOME / "projects" / project_name
        project_dir.mkdir(parents=True, exist_ok=True)
        return str(project_dir / "project.db")
    MEMEX_HOME.mkdir(parents=True, exist_ok=True)
    return str(GLOBAL_DB)


def ensure_memex_dirs(cwd: str = None):
    """确保 memex 目录结构存在。"""
    MEMEX_HOME.mkdir(parents=True, exist_ok=True)
    (MEMEX_HOME / "embeddings").mkdir(exist_ok=True)
    if cwd:
        project_dir = Path(cwd).resolve() / ".claude" / "memex"
        project_dir.mkdir(parents=True, exist_ok=True)
        (project_dir / "team" / "patches").mkdir(parents=True, exist_ok=True)
