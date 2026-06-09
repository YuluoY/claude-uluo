"""F6: 上下文注入"""
from context_injector import format_injection, format_survival


def test_format_injection_nonempty_with_data(db):
    ctx = format_injection(db)
    assert len(ctx) > 50


def test_format_injection_contains_seed_knowledge(db):
    ctx = format_injection(db)
    assert any(word in ctx for word in ['SVG', 'viewBox', 'useEffect'])


def test_format_survival_nonempty_with_data(db):
    surv = format_survival(db)
    assert len(surv) > 20


def test_format_injection_empty_db_does_not_crash():
    import os
    empty_db = '/tmp/memex-empty-test.db'
    os.system(f'rm -f {empty_db}')
    from db_schema import init_db
    init_db(empty_db)
    ctx = format_injection(empty_db)
    assert isinstance(ctx, str)
    os.system(f'rm -f {empty_db}')
