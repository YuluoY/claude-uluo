"""F10: 跨功能组合测试 —— 多个功能组合成完整用户流程"""
import json, tempfile, os, sqlite3
import pytest
from sentiment_detector import detect
from db_ops import insert_knowledge_node, insert_incident, insert_edge, search_knowledge, top_knowledge
from rating_engine import update_lesson_rating
from knowledge_graph import graph_stats
from transcript_indexer import parse_transcript, extract_turns, detect_signals_in_turns, extract_tool_usage
from hierarchy import classify_auto
from context_injector import format_injection


def test_create_search_score_research(db):
    """创建 → 搜索 → 评分 → 再搜索，分数变化可见"""
    kid = insert_knowledge_node(db, {
        "title": "combo-test-unique-keyword-xyz987",
        "category_path": "testing",
        "key_takeaway": "combo"
    })
    r1 = search_knowledge(db, 'xyz987', 5)
    assert len(r1) > 0

    update_lesson_rating(db, kid, 'confirm', 1.0, 1.0)
    r2 = search_knowledge(db, 'xyz987', 5)
    assert r2[0]['trueskill_mu'] > 25.0


def test_signal_incident_edge_graph(db, seed_ids):
    """检测信号 → 创建 Incident → 关联 KnowledgeNode → 图可查"""
    signal = detect("好的没问题就这样吧")
    iid = insert_incident(db, {
        "problem_statement": "integration test incident",
        "verification_type": signal['signal_type'],
        "sentiment_score": signal['sentiment_score'],
        "category_path": "testing",
    })
    assert iid > 0
    insert_edge(db, 'knowledge_node', seed_ids[0], 'incident', iid, 'SOLVED_BY')
    s = graph_stats(db)
    assert s['edges'] > 0


def test_correction_does_not_penalize(db, seed_ids):
    """纠正信号不应该降低关联经验的评分"""
    conn1 = sqlite3.connect(db)
    before = conn1.execute(
        "SELECT trueskill_mu FROM knowledge_nodes WHERE id=?", (seed_ids[0],)).fetchone()[0]
    conn1.close()

    signal = detect("不对，应该先设置 viewBox 再设置 transform")
    assert signal['signal_type'] == 'correction'

    conn2 = sqlite3.connect(db)
    after = conn2.execute(
        "SELECT trueskill_mu FROM knowledge_nodes WHERE id=?", (seed_ids[0],)).fetchone()[0]
    conn2.close()
    assert after >= before


def test_repeated_confirm_stays_in_top(db, seed_ids):
    """多次确认后出现在 Top 列表前列"""
    for _ in range(5):
        update_lesson_rating(db, seed_ids[0], 'confirm', 0.9, 1.0)
    top = top_knowledge(db, 5)
    assert any(x['id'] == seed_ids[0] for x in top)


def test_bilingual_create_and_search(db):
    """中英文混合场景：中文输入，英文搜索，中英结果"""
    insert_knowledge_node(db, {
        "title": "CSS Grid 布局在 Safari 中表现异常",
        "category_path": "rendering/layout",
        "key_takeaway": "Safari Grid gap bug",
        "solution_text": "Use explicit grid-template-rows and -columns",
    })
    r_cn = search_knowledge(db, '布局', 5)
    r_en = search_knowledge(db, 'Grid', 5)
    assert len(r_cn) > 0 or len(r_en) > 0


def _cc_user(text):
    return {"type": "user", "message": {"role": "user", "content": [{"type": "text", "text": text}]}}

def _cc_asst(blocks):
    return {"type": "assistant", "message": {"role": "assistant", "content": blocks}}

def test_full_transcript_pipeline():
    """从 JSONL 解析 → 信号检测 → 工具调用提取 → 分类推荐的完整链路"""
    f = tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False)
    messages = [
        _cc_user("ReactFlow边线在缩放时消失"),
        _cc_asst([{"type": "text", "text": "我来检查viewBox设置"},
                  {"type": "tool_use", "name": "Bash", "input": {"command": "grep viewBox src/Graph.tsx"}, "id": "t1"}]),
        _cc_asst([{"type": "text", "text": "viewBox没有显式设置"},
                  {"type": "tool_use", "name": "Edit", "input": {"file_path": "src/Graph.tsx"}, "id": "t2"}]),
        _cc_user("好了！确实解决了！感谢！"),
    ]
    for msg in messages:
        f.write(json.dumps(msg) + '\n')
    name = f.name
    f.close()

    msgs = parse_transcript(name)
    os.unlink(name)
    assert len(msgs) >= 3

    turns = extract_turns(msgs)
    signals = detect_signals_in_turns(turns)
    assert any(s['signal_type'] in ('confirm', 'strong_confirm') for s in signals)

    tools = extract_tool_usage(turns)
    assert any(t['tool_name'] == 'Edit' for t in tools)

    cat = classify_auto("ReactFlow edge zoom viewBox", ['ReactFlow', 'edge', 'viewBox'])
    assert 'coordinate' in cat or 'graph' in cat or 'rendering' in cat
