"""
Memex Knowledge Graph Builder — networkx 有向加权图
12 种关系边 + PageRank + Louvain 社区检测 + 逻辑链遍历
"""

import json
import sqlite3
from typing import Any, Optional

try:
    import networkx as nx
    HAS_NETWORKX = True
except ImportError:
    HAS_NETWORKX = False


# 12 种关系类型
RELATION_TYPES = [
    "CAUSED_BY",       # Incident → RootCause
    "SOLVED_BY",       # Incident → KnowledgeNode
    "ATTEMPTED_WITH",  # Incident → KnowledgeNode (failed attempts)
    "DERIVED_FROM",    # KnowledgeNode → Incident (归纳)
    "PRECEDES",        # Incident → Incident (时间先后)
    "REQUIRES",        # KnowledgeNode → Concept (前置条件)
    "CONTRADICTS",     # KnowledgeNode → KnowledgeNode (矛盾)
    "ALTERNATIVE_TO",  # KnowledgeNode → KnowledgeNode (替代)
    "COMPOSES",        # KnowledgeNode → KnowledgeNode (组合)
    "REFERENCES",      # 任意 → ProjectFile/Tool/Concept
    "SUPERSEDES",      # KnowledgeNode → KnowledgeNode (替代旧方案)
    "VERIFIED_BY",     # KnowledgeNode → Signal (验证证据)
]


def build_graph(db_path: str) -> Any:
    """从 DB 构建 networkx 有向加权图"""
    if not HAS_NETWORKX:
        return None

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")

    G = nx.DiGraph()

    # 节点：KnowledgeNodes
    kn_rows = conn.execute(
        "SELECT id, title, trueskill_mu, trueskill_sigma, scope, category_path FROM knowledge_nodes"
    ).fetchall()
    for r in kn_rows:
        G.add_node(f"KN_{r[0]}", type="KnowledgeNode", title=r[1], mu=r[2], sigma=r[3], scope=r[4], category=r[5])

    # 节点：Incidents
    inc_rows = conn.execute("SELECT id, problem_statement, category_path FROM incidents").fetchall()
    for r in inc_rows:
        G.add_node(f"INC_{r[0]}", type="Incident", title=r[1], category=r[2])

    # 节点：RootCauses
    rc_rows = conn.execute("SELECT id, statement FROM root_causes").fetchall()
    for r in rc_rows:
        G.add_node(f"RC_{r[0]}", type="RootCause", title=r[1])

    # 节点：Concepts
    c_rows = conn.execute("SELECT id, name, domain FROM concepts").fetchall()
    for r in c_rows:
        G.add_node(f"CON_{r[0]}", type="Concept", title=r[1], domain=r[2])

    # 节点：Signals (只读最近 100 条)
    s_rows = conn.execute("SELECT id, signal_type, intensity FROM signals ORDER BY created_at DESC LIMIT 100").fetchall()
    for r in s_rows:
        G.add_node(f"SIG_{r[0]}", type="Signal", signal_type=r[1], intensity=r[2])

    # 边
    edge_rows = conn.execute(
        "SELECT source_type, source_id, target_type, target_id, relation, weight FROM edges"
    ).fetchall()
    for src_type, src_id, tgt_type, tgt_id, rel, weight in edge_rows:
        src = f"{_node_prefix(src_type)}_{src_id}"
        tgt = f"{_node_prefix(tgt_type)}_{tgt_id}"
        if G.has_node(src) and G.has_node(tgt):
            G.add_edge(src, tgt, relation=rel, weight=weight)

    conn.close()
    return G if G.number_of_nodes() > 0 else None


def _node_prefix(node_type: str) -> str:
    mapping = {
        "knowledge_node": "KN", "incident": "INC", "root_cause": "RC",
        "concept": "CON", "signal": "SIG", "file": "FILE",
    }
    return mapping.get(node_type, node_type[:3].upper())


def pagerank_rank(db_path: str, limit: int = 15) -> list[dict]:
    """PageRank 排序 KnowledgeNodes"""
    G = build_graph(db_path)
    if G is None:
        return []

    pr = nx.pagerank(G, weight="weight")
    kn_nodes = [(n, pr[n]) for n in G.nodes() if G.nodes[n].get("type") == "KnowledgeNode"]
    kn_nodes.sort(key=lambda x: -x[1])

    results = []
    for node, score in kn_nodes[:limit]:
        attrs = G.nodes[node]
        results.append({
            "id": int(node.split("_")[1]),
            "title": attrs.get("title", ""),
            "pagerank": round(score, 6),
            "mu": attrs.get("mu", 0),
            "sigma": attrs.get("sigma", 8.3),
        })
    return results


def communities(db_path: str, min_size: int = 3) -> list[dict]:
    """Louvain 社区检测"""
    G = build_graph(db_path)
    if G is None:
        return []

    try:
        from networkx.algorithms.community import louvain_communities
        comms = louvain_communities(G.to_undirected(), weight="weight")
    except Exception:
        comms = list(nx.connected_components(G.to_undirected()))

    results = []
    for i, comm in enumerate(comms):
        if len(comm) < min_size:
            continue
        members = []
        for node in sorted(comm, key=lambda n: G.nodes[n].get("mu", 0) or 0, reverse=True)[:10]:
            members.append({
                "id": node,
                "title": G.nodes[node].get("title", ""),
                "type": G.nodes[node].get("type", ""),
                "mu": G.nodes[node].get("mu", 0),
            })
        results.append({"community_id": i, "size": len(comm), "members": members})

    results.sort(key=lambda x: -x["size"])
    return results[:15]


def shortest_path(db_path: str, source_kn: int, target_kn: int) -> Optional[list[dict]]:
    """查找两个 KnowledgeNode 之间的最短路径"""
    G = build_graph(db_path)
    if G is None:
        return None

    src = f"KN_{source_kn}"
    tgt = f"KN_{target_kn}"

    if not G.has_node(src) or not G.has_node(tgt):
        return None

    try:
        path = nx.shortest_path(G, source=src, target=tgt, weight="weight")
    except nx.NetworkXNoPath:
        return None

    steps = []
    for node in path:
        attrs = G.nodes[node]
        steps.append({
            "id": node,
            "title": attrs.get("title", ""),
            "type": attrs.get("type", ""),
        })

    # 标注边的类型
    for j in range(len(steps) - 1):
        edge = G.get_edge_data(steps[j]["id"], steps[j+1]["id"])
        if edge:
            steps[j]["relation"] = edge.get("relation", "")

    return steps


def get_incident_chain(db_path: str, incident_id: int) -> Optional[dict]:
    """获取一个 Incident 的完整逻辑链"""
    G = build_graph(db_path)
    if G is None:
        return None

    node = f"INC_{incident_id}"
    if not G.has_node(node):
        return None

    chain = {
        "incident": G.nodes[node],
        "caused_by": [],      # → RootCause
        "attempted_with": [], # → 尝试方案
        "solved_by": [],      # → 成功方案
        "verified_by": [],    # → 验证信号
        "precedes": [],       # → 后续事件
    }

    for _, tgt, data in G.out_edges(node, data=True):
        rel = data.get("relation", "")
        target = G.nodes[tgt]
        entry = {"id": tgt, "title": target.get("title", ""), "type": target.get("type", "")}

        if rel == "CAUSED_BY":
            chain["caused_by"].append(entry)
        elif rel == "ATTEMPTED_WITH":
            entry["result"] = data.get("metadata", "{}")
            chain["attempted_with"].append(entry)
        elif rel == "SOLVED_BY":
            chain["solved_by"].append(entry)
        elif rel == "PRECEDES":
            chain["precedes"].append(entry)
        elif rel == "VERIFIED_BY":
            chain["verified_by"].append(entry)

    return chain


def graph_stats(db_path: str) -> dict:
    """图统计信息"""
    G = build_graph(db_path)
    if G is None:
        return {"nodes": 0, "edges": 0}

    kn_count = sum(1 for n in G.nodes() if G.nodes[n].get("type") == "KnowledgeNode")
    inc_count = sum(1 for n in G.nodes() if G.nodes[n].get("type") == "Incident")

    return {
        "nodes": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "knowledge_nodes": kn_count,
        "incidents": inc_count,
    }


if __name__ == "__main__":
    import sys
    db = sys.argv[1] if len(sys.argv) > 1 else "memex.db"

    s = graph_stats(db)
    print(f"Graph: {s}")

    pr = pagerank_rank(db, limit=5)
    print(f"Top PageRank: {pr}")
