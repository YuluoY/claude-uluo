"""Mermaid Sequence Diagram 时序图脚本。

强制规则：
  - 必须以 sequenceDiagram 开头
  - participant 的 ID 必须用 ASCII（中文放 alias: participant U as 用户）
  - 箭头类型要正确：->> 同步，-->> 异步返回
  - 禁止裸箭头（必须指定参与方）
"""

import re
from _shared import core


def template() -> str:
    return """sequenceDiagram
    participant U as 用户
    participant S as 服务端
    participant DB as 数据库
    U->>S: 发送请求
    S->>DB: 查询数据
    DB-->>S: 返回结果
    S-->>U: 响应数据"""


def validate(diagram: str) -> list[dict]:
    """Sequence 专属校验规则。"""
    problems = []

    problems.extend(core.assert_starts_with(diagram, "sequenceDiagram"))

    # participant ID 必须 ASCII
    problems.extend(_check_participant_ids(diagram))

    # 箭头必须有源和目标
    problems.extend(_check_arrow_targets(diagram))

    return problems


def enforce(diagram: str) -> tuple[str, list[dict]]:
    """强制 Sequence 规范。"""
    changes = []

    diagram, style_changes = core.enforce_default_style(diagram)
    changes.extend(style_changes)

    diagram, id_changes = _fix_participant_ids(diagram)
    changes.extend(id_changes)

    return diagram, changes


def _check_participant_ids(diagram: str) -> list[dict]:
    """participant 的 ID 不能包含中文字符。"""
    problems = []
    for i, line in enumerate(diagram.split("\n"), 1):
        m = re.match(r'\s*participant\s+(\S+)', line)
        if m:
            pid = m.group(1)
            if re.search(r'[\u4e00-\u9fff]', pid):
                problems.append({
                    "type": "error",
                    "line": i,
                    "message": f"participant ID '{pid}' 包含中文，Mermaid 不支持中文 ID",
                    "fix": "改用 ASCII ID + 中文别名: participant U as 用户"
                })
    return problems


def _check_arrow_targets(diagram: str) -> list[dict]:
    """检查箭头是否有合法的源和目标。"""
    problems = []
    # 收集已声明的 participant
    participants = set()
    for line in diagram.split("\n"):
        m = re.match(r'\s*participant\s+(\S+)', line)
        if m:
            pid = m.group(1)
            # 去掉 alias
            if ' as ' not in line:
                participants.add(pid)

        # 重新解析，取 'as' 前面的 ID
        m2 = re.match(r'\s*participant\s+(\S+)\s+as\s+', line)
        if m2:
            participants.add(m2.group(1))
        else:
            m3 = re.match(r'\s*participant\s+(\S+)', line)
            if m3 and ' as ' not in line:
                participants.add(m3.group(1))

    # 重新收集（更准确）
    participants.clear()
    for line in diagram.split("\n"):
        if line.strip().startswith("participant "):
            parts = line.strip().split()
            if len(parts) >= 2:
                pid = parts[1]
                participants.add(pid)

    # 检查箭头
    for i, line in enumerate(diagram.split("\n"), 1):
        m = re.match(r'\s*(\S+)\s*(->>|-->>|->|-->|-\)>>|--x)\s*(\S+)\s*:', line)
        if m:
            src, arrow, dst = m.group(1), m.group(2), m.group(3)
            if src not in participants and src != "Note":
                problems.append({
                    "type": "warning",
                    "line": i,
                    "message": f"箭头源 '{src}' 未声明为 participant",
                    "fix": f"添加 participant {src} 声明"
                })
            if dst not in participants and dst != "Note":
                problems.append({
                    "type": "warning",
                    "line": i,
                    "message": f"箭头目标 '{dst}' 未声明为 participant",
                    "fix": f"添加 participant {dst} 声明"
                })

    return problems


def _fix_participant_ids(diagram: str) -> tuple[str, list[dict]]:
    """修正包含中文的 participant ID，同时更新连线中的引用。"""
    changes = []
    lines = diagram.split("\n")

    # 第一遍：收集需要修正的 ID 映射
    id_map = {}  # old_id -> new_id
    for i, line in enumerate(lines):
        m = re.match(r'(\s*participant\s+)(\S+)(.*)', line)
        if m:
            prefix, pid, rest = m.group(1), m.group(2), m.group(3)
            if re.search(r'[\u4e00-\u9fff]', pid):
                new_id = "P" + str(i)
                id_map[pid] = new_id
                new_line = f"{prefix}{new_id} as {pid}"
                lines[i] = new_line
                changes.append({
                    "type": "error",
                    "action": "fixed",
                    "line": i + 1,
                    "message": f"已修正 participant ID '{pid}' -> '{new_id} as {pid}'"
                })

    # 第二遍：更新连线中的引用
    if id_map:
        for i, line in enumerate(lines):
            if re.match(r'\s*\S+\s*[-=]+>>?\s*\S+', line):
                for old_id, new_id in id_map.items():
                    # 只替换匹配 participant 位置的部分（箭头两侧）
                    line = re.sub(
                        rf'\b{re.escape(old_id)}\b',
                        new_id,
                        line
                    )
                lines[i] = line

    return "\n".join(lines), changes
