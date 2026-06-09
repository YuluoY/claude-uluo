"""pytest fixtures: 共享的测试环境初始化"""
import sys, os, pytest
from pathlib import Path

# 确保 memex/scripts 在 Python path 中
SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS))

from db_schema import init_db, GLOBAL_DB
from db_ops import insert_knowledge_node, insert_incident, insert_edge


@pytest.fixture(scope="session")
def db():
    """创建独立测试 DB，预设 5 条经验和 3 个 Incident"""
    db_path = '/tmp/memex-pytest.db'
    os.system(f'rm -f {db_path}')
    init_db(db_path)

    seeds = [
        {"title": "SVG viewBox 必须在 CSS transform 时显式设置",
         "scope": "framework", "category_path": "rendering/coordinate",
         "root_cause": "CSS transform 缩放改变坐标映射",
         "solution_text": "在 SVG 容器上显式设置 viewBox",
         "key_takeaway": "使用 SVG+CSS transform 时必须显式控制坐标映射"},
        {"title": "React useEffect 清理函数必须返回函数",
         "scope": "framework", "category_path": "data/state/race",
         "root_cause": "组件卸载后异步回调仍尝试 setState",
         "solution_text": "useEffect 中返回清理函数",
         "key_takeaway": "所有副作用必须有对应的清理逻辑"},
        {"title": "组件统一使用 wb- 前缀的 BEM 命名",
         "scope": "team", "category_path": "methodology/workflow",
         "key_takeaway": "wb-block__element--modifier 是团队标准"},
        {"title": "个人偏好使用 lucide-react 图标库",
         "scope": "personal", "category_path": "rendering/layout",
         "key_takeaway": "新项目默认选 lucide-react"},
        {"title": "跨框架通用：异步操作必须处理竞态",
         "scope": "universal", "category_path": "data/state/race",
         "root_cause": "多个异步操作完成顺序不确定",
         "key_takeaway": "使用 AbortController 或请求 ID 去重"},
    ]
    ids = []
    for s in seeds:
        ids.append(insert_knowledge_node(db_path, s))

    incidents = [
        ("ReactFlow 边线在缩放平移时消失", "rendering/coordinate"),
        ("组件卸载后 React 报内存泄漏警告", "data/state/race"),
        ("多人协作时 API 返回数据被旧请求覆盖", "data/state/race"),
    ]
    for title, cat in incidents:
        insert_incident(db_path, {
            "problem_statement": title,
            "context_project": "diagram-editor",
            "verification_type": "strong_confirm",
            "sentiment_score": 0.9,
            "category_path": cat,
        })

    # 预设关系边
    insert_edge(db_path, 'knowledge_node', ids[0], 'knowledge_node', ids[4], 'RELATED_TO')
    insert_edge(db_path, 'knowledge_node', ids[1], 'knowledge_node', ids[4], 'DERIVED_FROM')

    yield db_path
    os.system(f'rm -f {db_path}')


@pytest.fixture(scope="session")
def seed_ids(db):
    """返回预设经验的 ID 列表"""
    import sqlite3
    conn = sqlite3.connect(db)
    ids = [r[0] for r in conn.execute("SELECT id FROM knowledge_nodes ORDER BY id").fetchall()]
    conn.close()
    return ids
