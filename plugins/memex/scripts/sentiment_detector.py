"""
Memex Sentiment Detector — SnowNLP + jieba + pysentimiento + 情感词典
四层信号检测：词典规则 → 情感分数 → 情绪分类 → 信号归类
"""
import sys
from pathlib import Path

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PLUGIN_ROOT))

# 可选依赖的延迟导入
_SNOW = None
_JIEBA = None
_PYSENT = None
_POS_LEXICON = None
_NEG_LEXICON = None


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


def _load_lexicon(path: str):
    """加载情感词典文件（每行一个词），返回 set"""
    lexicon = set()
    filepath = PLUGIN_ROOT / "scripts" / "lexicons" / path
    if filepath.exists():
        with open(filepath, "r") as f:
            for line in f:
                word = line.strip()
                if word and not word.startswith("#"):
                    lexicon.add(word)
    return lexicon


def _get_pos_lexicon():
    """中文正向情感词集合"""
    global _POS_LEXICON
    if _POS_LEXICON is None:
        _POS_LEXICON = _load_lexicon("positive.txt")
    return _POS_LEXICON


def _get_neg_lexicon():
    """中文负向情感词集合"""
    global _NEG_LEXICON
    if _NEG_LEXICON is None:
        _NEG_LEXICON = _load_lexicon("negative.txt")
    return _NEG_LEXICON


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

    # 规则增强：词典匹配做 soft boost（补偿 SnowNLP 对短文本的不稳定性）
    _rule_boost = 0.0
    _correction_patterns = ["应该是", "要先", "不是这样", "改成", "换成", "以后要", "应该是先", "不对，",
                           "不能直接", "需要先", "缺了", "漏了", "忘了", "没考虑到", "应该先"]

    # 优先检测纠正信号
    _is_correction = False
    for kw in _correction_patterns:
        if kw in text:
            _is_correction = True
            break
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

    # 词典规则增强（正向/负向 soft boost，双向匹配取优势方）
    pos_lex = _get_pos_lexicon()
    neg_lex = _get_neg_lexicon()

    pos_boost = 0.0
    neg_boost = 0.0

    if pos_lex or neg_lex:
        # 字符集预过滤：只检查首字在文本中的词（大幅减少匹配次数）
        text_chars = set(text)
        text_len = len(text)

    if pos_lex:
        pos_matches = [
            w for w in pos_lex
            if len(w) >= 2 and len(w) <= text_len and w[0] in text_chars and w in text
        ]
        if pos_matches:
            max_len = max(len(w) for w in pos_matches)
            pos_boost = 0.4 if max_len >= 3 else 0.2

    if neg_lex:
        neg_matches = [
            w for w in neg_lex
            if len(w) >= 2 and len(w) <= text_len and w[0] in text_chars and w in text
        ]
        if neg_matches:
            max_len = max(len(w) for w in neg_matches)
            neg_boost = -0.4 if max_len >= 3 else -0.2

    # 取绝对值更大的方向。等长时偏向负向（技术对话中假阴性代价更高）
    if abs(pos_boost) > abs(neg_boost):
        _rule_boost = pos_boost
    elif abs(neg_boost) > abs(pos_boost):
        _rule_boost = neg_boost
    else:
        # 同强度时：负向优先（漏掉负面反馈比多给正向boost更危险）
        _rule_boost = neg_boost if neg_boost != 0.0 else pos_boost

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
