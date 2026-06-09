"""
Memex Sentiment Detector — SnowNLP + jieba + pysentimiento
三层信号检测：情感分数 → 情绪分类 → 信号归类
"""

import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SKILL_DIR))

# 可选依赖的延迟导入
_SNOW = None
_JIEBA = None
_PYSENT = None


def _get_snownlp():
    global _SNOW
    if _SNOW is None:
        try:
            from snownlp import SnowNLP
            _SNOW = SnowNLP
        except ImportError:
            return None
    return _SNOW


def _get_jieba():
    global _JIEBA
    if _JIEBA is None:
        try:
            import jieba.analyse
            _JIEBA = jieba.analyse
        except ImportError:
            return None
    return _JIEBA


def _get_pysentimiento():
    global _PYSENT
    if _PYSENT is None:
        try:
            from pysentimiento import create_analyzer
            _PYSENT = create_analyzer
        except ImportError:
            return None
    return _PYSENT


def detect(text: str) -> dict:
    """
    分析用户输入文本，返回结构化信号。

    Returns:
        {
            "sentiment_score": float,   # 0.0-1.0 SnowNLP 连续情感
            "polarity": str,            # positive / negative / neutral
            "intensity": float,         # 0.0-1.0 情感强度
            "signal_type": str,         # confirm / negative / correction / neutral
            "emotion": str,             # joy/anger/surprise/sadness...
            "keywords": [str],          # jieba 关键词
            "llm_trigger": bool,        # 是否需要 LLM 归因分析
            "llm_reason": str,          # 触发原因
        }
    """
    result = {
        "sentiment_score": 0.5,
        "polarity": "neutral",
        "intensity": 0.0,
        "signal_type": "neutral",
        "emotion": "",
        "keywords": [],
        "llm_trigger": False,
        "llm_reason": "",
    }

    if not text or not text.strip():
        return result

    # 规则增强：SnowNLP 对短中文情绪识别不稳定，用规则补偿
    _rule_boost = 0.0
    _strong_pos = ["完美", "解决了", "太好了", "真棒", "就是这样", "牛", "exactly", "perfect", "great"]
    _pos = ["好了", "可以了", "能用", "works", "good", "nice", "fixed", "correct"]
    _strong_neg = ["还是不行", "完全不对", "又错了", "一塌糊涂", "彻底错了", "搞错了", "still broken"]
    _neg = ["不行", "没用", "失败", "wrong", "doesn't work", "incorrect"]
    _correction = ["应该是", "要先", "不是这样", "改成", "换成", "以后要", "应该是先", "不对，"]

    # 优先检测纠正信号（"不对，应该是X" 这个模式优先于普通否定）
    _is_correction = False
    for kw in _correction:
        if kw in text:
            _is_correction = True
            break
    # 额外检测："不对" 后面跟 "应该" → 纠正而非单纯否定
    if "不对" in text and ("应该" in text or "要先" in text or "改成" in text):
        _is_correction = True

    if _is_correction:
        result["signal_type"] = "correction"
        result["polarity"] = "neutral"
        result["sentiment_score"] = 0.5
        result["intensity"] = 0.0
        JA = _get_jieba()
        if JA:
            try:
                result["keywords"] = JA.textrank(text, topK=5)
            except Exception:
                pass
        return result

    # 正向/负向规则增强
    for kw in _strong_pos:
        if kw in text:
            _rule_boost = 0.4
            break
    if _rule_boost == 0.0:
        for kw in _pos:
            if kw in text:
                _rule_boost = 0.2
                break
    for kw in _strong_neg:
        if kw in text:
            _rule_boost = -0.4
            break
    if _rule_boost == 0.0:
        for kw in _neg:
            if kw in text:
                _rule_boost = -0.2
                break

    # Layer 1: jieba 关键词（先提取，不受后续影响）
    JA = _get_jieba()
    if JA and text.strip():
        try:
            result["keywords"] = JA.textrank(text, topK=5)
        except Exception:
            pass

    # Layer 1: SnowNLP 情感分数（可能不可用，兜底用规则）
    raw_score = 0.5  # 默认中性
    SN = _get_snownlp()
    if SN:
        try:
            s = SN(text)
            raw_score = s.sentiments
        except Exception:
            pass

    # 规则增强后的分数
    adjusted = max(0.0, min(1.0, raw_score + _rule_boost))
    result["sentiment_score"] = round(adjusted, 6)
    intensity = abs(adjusted - 0.5) * 2
    result["intensity"] = round(intensity, 6)

    # 阈值分类（无论 SnowNLP 是否可用）
    if adjusted > 0.85:
        result["polarity"] = "positive"
        result["signal_type"] = "strong_confirm"
    elif adjusted > 0.65:
        result["polarity"] = "positive"
        result["signal_type"] = "confirm"
    elif adjusted > 0.55:
        result["polarity"] = "positive"
        result["signal_type"] = "weak_confirm"
    elif adjusted < 0.15:
        result["polarity"] = "negative"
    elif adjusted < 0.35:
        result["polarity"] = "negative"
    elif adjusted < 0.45:
        result["polarity"] = "neutral"

    # Layer 1.5: pysentimiento 情绪分类（仅负向文本）
    if result["polarity"] == "negative":
        PS = _get_pysentimiento()
        if PS:
            try:
                analyzer = PS(task="emotion", lang="zh")
                emotion = analyzer.predict(text)
                result["emotion"] = emotion.output

                # 关键区分：surprise → teaching, anger → failure
                if emotion.output == "surprise" and emotion.probas.get("surprise", 0) > 0.35:
                    result["signal_type"] = "correction"
                    result["polarity"] = "neutral"  # 纠正不是失败
                elif emotion.output == "anger" and emotion.probas.get("anger", 0) > 0.3:
                    result["signal_type"] = "failure"
                    # 强负向信号 → 检查是否需要 LLM 归因
                    if result["intensity"] > 0.8:
                        result["llm_trigger"] = True
                        result["llm_reason"] = "high_intensity_failure"
                else:
                    result["signal_type"] = "negative"

            except Exception:
                # pysentimiento 不可用时保持 SnowNLP 判定
                if result["polarity"] == "negative":
                    result["signal_type"] = "negative"
        else:
            result["signal_type"] = "negative"

    return result


def detect_keywords_keep(text: str) -> bool:
    """检测「明确留存」关键词"""
    keywords = ["记住这个", "以后都这样", "keep this", "remember this", "以后就按这个来"]
    return any(kw in text.lower() for kw in keywords)


if __name__ == "__main__":
    tests = [
        "完美！！解决了！就是这样！",
        "好了，可以了，能用就行",
        "还行吧，勉强凑合",
        "还是不行，一样的问题又出现了",
        "不对，应该是先改A再改B才行",
        "不对，我说的不是这个意思",
        "记住这个：useEffect 清理函数必须返回函数",
    ]
    for t in tests:
        r = detect(t)
        print(f"\n{t}")
        print(f"  score={r['sentiment_score']} type={r['signal_type']} emotion={r['emotion']} trigger_llm={r['llm_trigger']}")
