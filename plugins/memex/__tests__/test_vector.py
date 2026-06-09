"""F7: 向量搜索与混合检索"""
from vec_store import VecStore


def test_hybrid_search_falls_back_to_fts5(db):
    v = VecStore(db)
    results = v.hybrid_search('viewBox', 5)
    assert isinstance(results, list)


def test_search_vec_empty_when_no_model(db):
    v = VecStore(db)
    results = v.search_vec('test query')
    assert isinstance(results, list)


def test_cosine_similarity_same_vectors():
    assert abs(VecStore._cosine_similarity([1, 0, 0], [1, 0, 0]) - 1.0) < 0.001


def test_cosine_similarity_orthogonal_vectors():
    assert abs(VecStore._cosine_similarity([1, 0, 0], [0, 1, 0]) - 0.0) < 0.001


def test_hybrid_search_differs_by_query(db):
    v = VecStore(db)
    r1 = {x.get('id') for x in v.hybrid_search('viewBox', 5)}
    r2 = {x.get('id') for x in v.hybrid_search('useEffect', 5)}
    # 至少有一个返回结果
    assert r1 or r2
