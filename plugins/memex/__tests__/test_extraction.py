"""F5: 知识提取管道 —— transcript 到结构化知识"""
import json, tempfile, os, pytest
from transcript_indexer import parse_transcript, extract_turns, detect_signals_in_turns, extract_tool_usage, extract_user_text


# Claude Code v2.x transcript format helpers
def _cc_msg(msg_type, text_or_blocks):
    """构建 Claude Code 格式的消息"""
    if msg_type == "user":
        return {"type": "user", "message": {"role": "user", "content": [{"type": "text", "text": text_or_blocks}]}}
    elif msg_type == "assistant":
        blocks = text_or_blocks if isinstance(text_or_blocks, list) else [{"type": "text", "text": text_or_blocks}]
        return {"type": "assistant", "message": {"role": "assistant", "content": blocks}}


@pytest.fixture
def sample_transcript():
    """创建含多轮对话 + 工具调用的 Claude Code 格式 transcript"""
    f = tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False)
    messages = [
        _cc_msg("user", "帮我看看这个bug"),
        _cc_msg("assistant", [{"type": "text", "text": "好的我来分析"}, {"type": "tool_use", "name": "Bash", "input": {"command": "git log"}, "id": "t1"}]),
        _cc_msg("user", "完美！！解决了！"),
        _cc_msg("assistant", "不客气！"),
    ]
    for msg in messages:
        f.write(json.dumps(msg) + '\n')
    name = f.name
    f.close()
    yield name
    os.unlink(name)


def test_parse_valid_transcript(sample_transcript):
    msgs = parse_transcript(sample_transcript)
    assert len(msgs) == 4


def test_parse_empty_transcript():
    f = tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False)
    name = f.name
    f.close()
    msgs = parse_transcript(name)
    os.unlink(name)
    assert msgs == []


def test_parse_nonexistent_file():
    msgs = parse_transcript('/tmp/nonexistent_xyz_12345.jsonl')
    assert msgs == []


def test_extract_user_text():
    msg = _cc_msg("user", "hello world")
    assert extract_user_text(msg) == "hello world"


def test_extract_turns_groups_correctly():
    msgs = [
        _cc_msg("user", "q1"),
        _cc_msg("assistant", "a1"),
        _cc_msg("user", "q2"),
        _cc_msg("assistant", "a2"),
    ]
    turns = extract_turns(msgs)
    assert len(turns) == 2
    assert turns[0]["user"]["text"] == "q1"
    assert turns[1]["user"]["text"] == "q2"


def test_detect_signals_in_turns():
    turns = [
        {"user": {"text": "完美！解决了！", "raw": _cc_msg("user", "完美！解决了！")},
         "assistant": {"content_blocks": [], "tool_uses": []}},
        {"user": {"text": "还是不行", "raw": _cc_msg("user", "还是不行")},
         "assistant": {"content_blocks": [], "tool_uses": []}},
    ]
    signals = detect_signals_in_turns(turns)
    assert len(signals) >= 1


def test_extract_tool_usage():
    turns = [{
        "user": {"text": "", "raw": {}},
        "assistant": {
            "content_blocks": [],
            "tool_uses": [
                {"name": "Edit", "input": {"file_path": "/src/a.ts"}, "id": "t1"},
                {"name": "Bash", "input": {"command": "npm test"}, "id": "t2"},
            ]
        }
    }]
    usage = extract_tool_usage(turns)
    assert len(usage) == 2
    tool_names = [u['tool_name'] for u in usage]
    assert 'Edit' in tool_names
    assert 'Bash' in tool_names
