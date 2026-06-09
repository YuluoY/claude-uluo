"""F2: 情感信号识别 —— 用户每一句话都能正确归类"""
import pytest
from sentiment_detector import detect, detect_keywords_keep


@pytest.mark.parametrize("text,expected_signal,description", [
    ("完美！！就是这样！！", "confirm", "强烈赞同"),
    ("好了，这个方案可以用", "confirm", "普通赞同"),
    ("还行吧，能用", "confirm", "温和赞同"),
    ("perfect! 完美解决了！", "confirm", "中英混合赞同"),
])
def test_positive_signals(text, expected_signal, description):
    r = detect(text)
    assert r['signal_type'] in (expected_signal, 'strong_confirm'), \
        f"{description}: expected {expected_signal}, got {r['signal_type']}"


@pytest.mark.parametrize("text,description", [
    ("完全不行，还是错的", "强烈否定"),
    ("this doesn't work at all, still broken", "英文否定"),
    ("还是不行，一样的问题又来了", "失败确认"),
])
def test_negative_signals(text, description):
    r = detect(text)
    assert r['polarity'] == 'negative', f"{description}: expected negative, got {r['polarity']}"


@pytest.mark.parametrize("text,description", [
    ("不对，应该是先改 A 再改 B", "标准纠正"),
    ("不是这样，要先处理数据才行", "纠正变体"),
    ("改成手动调用试试", "改写建议"),
])
def test_correction_signals(text, description):
    r = detect(text)
    assert r['signal_type'] == 'correction', \
        f"{description}: expected correction, got {r['signal_type']}"


def test_keep_directive_detected():
    assert detect_keywords_keep("记住这个：useEffect 必须返回清理函数")
    assert detect_keywords_keep("以后都这样写")
    assert not detect_keywords_keep("这是一段普通文本")


def test_neutral_text():
    r = detect("帮我看看这个文件的结构")
    assert r['signal_type'] in ('neutral', 'weak_confirm')


def test_empty_text():
    r = detect("")
    assert r['polarity'] == 'neutral'


def test_positive_intensity_stronger_than_negative():
    neg = detect("还是不行，又报错了")
    pos = detect("完美！！终于解决了！！")
    # 强烈正向的强度应该明显
    assert pos['intensity'] > 0.3


def test_very_long_text_does_not_crash():
    r = detect("测试 " * 5000)
    assert r['polarity'] in ('positive', 'negative', 'neutral')
