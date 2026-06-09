"""F3: 评分系统 —— TrueSkill 贝叶斯连续评分"""
import pytest, sqlite3
from rating_engine import LessonRating, update_lesson_rating


class TestLessonRating:
    """独立的 TrueSkill 数学验证"""

    def test_initial_rating(self):
        r = LessonRating()
        assert r.mu == 25.0 and r.sigma == 8.333

    def test_confirm_increases_mu_decreases_sigma(self):
        r = LessonRating()
        r.apply_signal('confirm', 0.9)
        assert r.mu > 25.0 and r.sigma < 8.333

    def test_failure_decreases_mu(self):
        r = LessonRating()
        r.apply_signal('confirm', 0.9)
        mu_before = r.mu
        r.apply_signal('failure', 0.8, 0.7)
        assert r.mu < mu_before

    def test_correction_preserves_mu(self):
        r = LessonRating()
        mu0, sig0 = r.mu, r.sigma
        r.apply_signal('correction', 0.0)
        assert r.mu == mu0

    def test_ten_confirmations_better_than_one(self):
        r10, r1 = LessonRating(), LessonRating()
        [r10.apply_signal('confirm', 1.0) for _ in range(10)]
        r1.apply_signal('confirm', 1.0)
        assert r10.mu > r1.mu
        assert r10.sigma < r1.sigma - 2.0  # 10 次显著更确定

    def test_weak_signal_less_impact_than_strong(self):
        rs, rw = LessonRating(), LessonRating()
        rs.apply_signal('confirm', 1.0)
        rw.apply_signal('confirm', 0.1)
        assert rs.mu > rw.mu

    def test_low_confidence_less_impact_than_high(self):
        rh, rl = LessonRating(), LessonRating()
        rh.apply_signal('confirm', 0.9, 1.0)
        rl.apply_signal('confirm', 0.9, 0.3)
        assert rh.mu > rl.mu

    def test_mixed_signals_converge(self):
        """12 次交互（含 2 次失败）后分数收敛到合理区间"""
        r = LessonRating()
        signals = [('confirm',0.8),('confirm',0.9),('failure',0.6,0.7),
                   ('confirm',1.0),('confirm',0.7),('confirm',0.9),
                   ('failure',0.5,0.5),('confirm',1.0),('confirm',0.8),
                   ('confirm',0.9),('confirm',1.0),('confirm',0.8)]
        for s in signals:
            r.apply_signal(*s)
        assert r.mu > 30.0, f"mostly positive should give μ>30, got {r.mu:.1f}"

    def test_volatility_score_non_monotonic(self):
        """分数应该波动收敛而不是单调递增"""
        r = LessonRating()
        r.apply_signal('confirm', 0.9)
        mu1 = r.mu
        r.apply_signal('confirm', 0.8)
        mu2 = r.mu
        r.apply_signal('failure', 0.7, 0.7)
        mu3 = r.mu
        r.apply_signal('confirm', 1.0)
        mu4 = r.mu
        assert mu1 < mu2  # 确认上升
        assert mu3 < mu2  # 失败下降
        assert mu4 > mu3  # 恢复上升


class TestScoringPersistence:
    """评分能正确持久化到数据库"""

    def test_update_writes_to_db(self, db, seed_ids):
        r = update_lesson_rating(db, seed_ids[0], 'confirm', 0.9, 1.0)
        assert r and r['mu'] > 25.0

    def test_read_back_matches_write(self, db, seed_ids):
        conn = sqlite3.connect(db)
        row = conn.execute(
            "SELECT trueskill_mu, trueskill_sigma FROM knowledge_nodes WHERE id=?",
            (seed_ids[0],)).fetchone()
        conn.close()
        assert row and row[0] > 25.0

    def test_repeated_confirmation_keeps_knowledge_in_top_list(self, db, seed_ids):
        # 给一条经验多次确认
        for _ in range(5):
            update_lesson_rating(db, seed_ids[0], 'confirm', 0.9, 1.0)
        from db_ops import top_knowledge
        top = top_knowledge(db, 5)
        assert any(x['id'] == seed_ids[0] for x in top)
