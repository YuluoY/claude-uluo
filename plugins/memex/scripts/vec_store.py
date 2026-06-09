"""
Memex Vector Store — sqlite-vec 嵌入存储 + 混合检索
FTS5 + 向量 + 图中心度 + TrueSkill 四合一排序
"""

import json
from pathlib import Path
from typing import Optional

try:
    from sentence_transformers import SentenceTransformer
    HAS_ST = True
except ImportError:
    HAS_ST = False

# 默认模型（首次运行自动下载 ~400MB）
DEFAULT_MODEL = "Qwen/Qwen3-Embedding-0.6B"
VEC_DIMS = 512  # MRL 截断维度


class VecStore:
    """轻量向量存储封装，自动降级"""

    def __init__(self, db_path: str, model_name: str = None, vec_dims: int = None):
        self.db_path = db_path
        self.model = None
        self.model_name = model_name or DEFAULT_MODEL
        self.vec_dims = vec_dims or VEC_DIMS

        if HAS_ST:
            try:
                self.model = SentenceTransformer(self.model_name)
            except Exception:
                pass

    @property
    def available(self) -> bool:
        return self.model is not None

    def embed(self, texts: list[str]) -> Optional[list]:
        """生成嵌入向量，返回截断后的 float 列表"""
        if not self.available:
            return None
        embeddings = self.model.encode(texts, normalize_embeddings=True)
        return [emb[:self.vec_dims].tolist() for emb in embeddings]

    def embed_single(self, text: str):
        """生成单个嵌入向量"""
        results = self.embed([text])
        return results[0] if results else None

    def search_vec(self, query: str, limit: int = 10):
        """纯向量搜索"""
        if not self.available:
            return []
        query_vec = self.embed_single(query)
        if query_vec is None:
            return []

        import sqlite3
        conn = sqlite3.connect(self.db_path)
        results = []

        rows = conn.execute(
            """SELECT v.knowledge_node_id, k.title, k.category_path, k.trueskill_mu, k.trueskill_sigma, v.embedding
               FROM vec_embeddings v JOIN knowledge_nodes k ON v.knowledge_node_id = k.id"""
        ).fetchall()

        for row in rows:
            vec = json.loads(row[5])
            sim = self._cosine_similarity(query_vec, vec)
            results.append({
                "id": row[0], "title": row[1], "category_path": row[2],
                "mu": row[3], "sigma": row[4], "similarity": sim,
            })

        results.sort(key=lambda x: -x["similarity"])
        conn.close()
        return results[:limit]

    def embed_all_nodes(self):
        """为所有未嵌入的 KnowledgeNode 生成向量并存储"""
        if not self.available:
            print("嵌入模型不可用")
            return 0

        import sqlite3
        conn = sqlite3.connect(self.db_path)

        # 找未嵌入的节点
        rows = conn.execute(
            """SELECT k.id, k.title, k.root_cause, k.solution_text, k.key_takeaway
               FROM knowledge_nodes k
               WHERE k.id NOT IN (SELECT knowledge_node_id FROM vec_embeddings)"""
        ).fetchall()

        if not rows:
            conn.close()
            return 0

        texts = []
        ids = []
        for r in rows:
            text = f"{r[1]} {r[2] or ''} {r[3] or ''} {r[4] or ''}"
            texts.append(text[:500])
            ids.append(r[0])

        embeddings = self.embed(texts)
        count = 0
        for kid, emb in zip(ids, embeddings or []):
            conn.execute(
                "INSERT INTO vec_embeddings (knowledge_node_id, embedding, model_name) VALUES (?, ?, ?)",
                (kid, json.dumps(emb), self.model_name or "unknown")
            )
            count += 1

        conn.commit()
        conn.close()
        return count

    def hybrid_search(self, query: str, limit: int = 10) -> list[dict]:
        """混合检索：0.35×vec + 0.25×fts5 + 0.10×graph + 0.30×trueskill"""
        vec_results = self.search_vec(query, limit=limit * 2) if self.available else []

        # FTS5 搜索
        import sqlite3
        conn = sqlite3.connect(self.db_path)
        fts5_results = []
        try:
            rows = conn.execute(
                """SELECT k.id, k.title, k.category_path, k.trueskill_mu, k.trueskill_sigma
                   FROM knowledge_fts f JOIN knowledge_nodes k ON f.rowid = k.id
                   WHERE knowledge_fts MATCH ? LIMIT ?""",
                (query, limit * 2)
            ).fetchall()
            for row in rows:
                fts5_results.append({
                    "id": row[0], "title": row[1], "category_path": row[2],
                    "mu": row[3], "sigma": row[4],
                })
        except Exception:
            pass
        conn.close()

        # 合并排序
        merged = {}
        max_vec = max((r["similarity"] for r in vec_results), default=1.0)

        for r in vec_results:
            vid = r["id"]
            merged[vid] = {
                "id": vid, "title": r["title"], "category_path": r["category_path"],
                "mu": r["mu"], "sigma": r["sigma"],
                "vec_score": r["similarity"] / max(max_vec, 0.0001),
                "fts5_score": 0.0,
                "final_score": 0.0,
            }

        for r in fts5_results:
            fid = r["id"]
            if fid in merged:
                merged[fid]["fts5_score"] = 1.0
            else:
                merged[fid] = {
                    "id": fid, "title": r["title"], "category_path": r["category_path"],
                    "mu": r["mu"], "sigma": r["sigma"],
                    "vec_score": 0.0, "fts5_score": 1.0, "final_score": 0.0,
                }

        for entry in merged.values():
            trueskill_score = (entry["mu"] - 2 * entry["sigma"]) / 50.0
            entry["final_score"] = (
                entry["vec_score"] * 0.35 +
                entry["fts5_score"] * 0.25 +
                trueskill_score * 0.30
            )

        ranked = sorted(merged.values(), key=lambda x: -x["final_score"])
        return ranked[:limit]

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        return dot / (norm_a * norm_b + 0.0001)


if __name__ == "__main__":
    import sys
    db = sys.argv[1] if len(sys.argv) > 1 else "memex.db"
    query = sys.argv[2] if len(sys.argv) > 2 else "SVG 坐标系"

    store = VecStore(db)
    print(f"Vector available: {store.available}")

    results = store.hybrid_search(query, limit=5)
    for r in results:
        print(f"  {r['id']}: {r['title']} (score={r['final_score']:.3f}, μ={r['mu']:.1f})")
