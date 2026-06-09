#!/usr/bin/env python3
"""PostToolUse Hook: 记录工具调用模式和结果。"""
import sys
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.dirname(__file__)))
from hooks.lib import read_stdin, system_message

# Stub: MVP 阶段不做工具记录，后续对接 DB 日志
event = read_stdin()
system_message("")
