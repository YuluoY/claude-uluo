"""
Memex Rating Engine — TrueSkill 贝叶斯连续评分
每条经验是一个 "player"，用户反馈是 "game result"
"""

import json
from datetime import datetime, timezone
from trueskill import Rating, rate_1vs1


class LessonRating:
    """每条经验对应一个 TrueSkill Rating"""

    def __init__(self, mu: float = 25.0, sigma: float = 8.333):
        self.rating = Rating(mu=mu, sigma=sigma)

    def apply_signal(self, signal_type: str, intensity: float, confidence: float = 1.0):
        """
        intensity: 信号强度 (0.0-1.0, SnowNLP sentiments 连续值)
        confidence: 归因置信度 (0.0-1.0)
        quality = intensity × confidence 缩放更新幅度
        """
        q = min(intensity * confidence, 1.0)

        if signal_type in ("confirm", "strong_confirm", "weak_confirm", "explicit_keep"):
            new, _ = rate_1vs1(self.rating, Rating())
            self._blend(new, q)
        elif signal_type in ("failure", "failure_confirm", "repeat_failure"):
            _, new = rate_1vs1(Rating(), self.rating)
            self._blend(new, q)
        elif signal_type == "correction":
            # 纠正：不扣分，但增大不确定性（知识可能不完整）
            self.rating = Rating(
                mu=self.rating.mu,
                sigma=min(self.rating.sigma * 1.1, 8.333)
            )

    def _blend(self, new_rating, quality: float):
        """按 quality 缩放 TrueSkill 更新幅度"""
        self.rating = Rating(
            mu=self.rating.mu + (new_rating.mu - self.rating.mu) * quality,
            sigma=self.rating.sigma + (new_rating.sigma - self.rating.sigma) * quality,
        )

    @property
    def mu(self) -> float:
        return self.rating.mu

    @property
    def sigma(self) -> float:
        return self.rating.sigma

    @property
    def conservative_score(self) -> float:
        """保守估计 μ - 2σ，至少 97.5% 概率不低于此值"""
        return self.rating.mu - 2 * self.rating.sigma

    def to_dict(self) -> dict:
        return {"mu": self.mu, "sigma": self.sigma, "conservative_score": self.conservative_score}

    def __repr__(self):
        return f"LessonRating(μ={self.mu:.2f}, σ={self.sigma:.2f}, conservative={self.conservative_score:.2f})"


def update_lesson_rating(db_path: str, lesson_id: int, signal_type: str, intensity: float, confidence: float = 1.0):
    """更新 DB 中指定经验节点的 TrueSkill"""
    import sqlite3
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")

    row = conn.execute(
        "SELECT trueskill_mu, trueskill_sigma FROM knowledge_nodes WHERE id = ?",
        (lesson_id,)
    ).fetchone()

    if not row:
        conn.close()
        return None

    rating = LessonRating(mu=row[0], sigma=row[1])
    rating.apply_signal(signal_type, intensity, confidence)

    # 更新 DB
    conn.execute(
        "UPDATE knowledge_nodes SET trueskill_mu = ?, trueskill_sigma = ?, updated_at = ? WHERE id = ?",
        (rating.mu, rating.sigma, datetime.now(timezone.utc).isoformat(), lesson_id)
    )

    # 追加信号历史
    signal_entry = json.dumps({
        "type": signal_type, "intensity": intensity, "confidence": confidence,
        "mu_after": rating.mu, "sigma_after": rating.sigma,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    conn.execute(
        "UPDATE knowledge_nodes SET signal_history = json_insert(COALESCE(signal_history, '[]'), '$[#]', json(?)) WHERE id = ?",
        (signal_entry, lesson_id)
    )

    # 更新信号计数
    if signal_type in ("confirm", "strong_confirm", "weak_confirm", "explicit_keep"):
        conn.execute("UPDATE knowledge_nodes SET positive_signals = positive_signals + 1 WHERE id = ?", (lesson_id,))
    elif signal_type in ("failure", "failure_confirm", "repeat_failure"):
        conn.execute("UPDATE knowledge_nodes SET negative_signals = negative_signals + 1 WHERE id = ?", (lesson_id,))

    conn.commit()
    conn.close()
    return rating.to_dict()


def apply_decay(db_path: str, days_threshold: int = 30, sigma_increment: float = 0.5):
    """
    知识衰减：长时间未被验证的经验，不确定性（sigma）逐渐增大。

    每 days_threshold 天未更新的节点，sigma += sigma_increment。
    conservative_score (mu - 2*sigma) 自然降低，在检索排序中下沉。
    不删除节点——被再次验证后 sigma 会下降。

    Args:
        db_path: 数据库路径
        days_threshold: 衰减触发阈值（天）
        sigma_increment: 每次衰减增加的 sigma 值

    Returns:
        受影响的节点数量
    """
    import sqlite3
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")

    cutoff = f"datetime('now', '-{days_threshold} days')"

    updated = conn.execute(
        f"""UPDATE knowledge_nodes
            SET trueskill_sigma = MIN(trueskill_sigma + ?, 8.333),
                updated_at = datetime('now')
            WHERE updated_at < {cutoff}
              AND scope != 'deleted'
              AND trueskill_sigma < 8.333""",
        (sigma_increment,)
    ).rowcount

    conn.commit()
    conn.close()
    return updated


if __name__ == "__main__":
    # 验证 TrueSkill 连续颗粒度
    r = LessonRating()
    print(f"初始: {r}")

    # 模拟连续信号
    for i in range(10):
        intensity = 0.5 + i * 0.05
        r.apply_signal("confirm", intensity)
        print(f"  第{i+1}次 confirm (i={intensity:.2f}): {r}")

    # 模拟失败
    r.apply_signal("failure", 0.8, 0.7)
    print(f"  失败后: {r}")

    # 模拟纠正（不扣分但 σ 增大）
    r.apply_signal("correction", 0.0)  # 纠正不影响 μ
    print(f"  纠正后: {r}")
