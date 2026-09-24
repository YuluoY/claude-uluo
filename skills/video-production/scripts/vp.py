#!/usr/bin/env python3
"""video-production 命令行入口。用法：python3 <skill>/scripts/vp.py <命令> [参数]；vp.py -h 查看全部命令。"""
from __future__ import annotations

import sys
from pathlib import Path

if sys.version_info < (3, 9):
    sys.exit("video-production 需要 Python 3.9 或更新版本")

sys.path.insert(0, str(Path(__file__).resolve().parent))

from vp.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
