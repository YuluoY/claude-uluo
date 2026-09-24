"""文本工具：字符分类、显示宽度、朗读替换、显示文本与朗读文本的逐字对齐。"""
from __future__ import annotations

import difflib
import unicodedata

STRONG_END = set("。！？!?；;…")
WEAK_BREAK = set("，、,：:")
OPENERS = set("（([【「『“‘《〈{")
CLOSERS = set("）)]】」』”’》〉}")
# 字幕块结尾要去掉的标点（问号、叹号、省略号、引号括号保留）
TRIM_CHARS = set("，。、；：,.;:")
# subtitle 模式下块内换成全角空格的中文标点
CJK_SOFT = set("，。、；：")
FULLWIDTH_SPACE = "　"


def is_space(ch: str) -> bool:
    return ch.isspace() or unicodedata.category(ch) == "Zs"


def is_punct(ch: str) -> bool:
    return unicodedata.category(ch).startswith("P")


def is_word_char(ch: str) -> bool:
    """会被读出来的字符：字母、数字（含汉字）。用于覆盖率统计。"""
    cat = unicodedata.category(ch)
    return cat.startswith("L") or cat.startswith("N")


def is_token_char(ch: str) -> bool:
    """属于词元的字符：非空白、非标点、非控制字符（符号如 + → ² 也算）。"""
    if is_space(ch) or is_punct(ch):
        return False
    return not unicodedata.category(ch).startswith("C")


def is_cjk(ch: str) -> bool:
    return unicodedata.east_asian_width(ch) in ("W", "F")


def char_width(ch: str) -> float:
    if ch == "\n":
        return 0.0
    return 1.0 if is_cjk(ch) else 0.5


def display_width(text: str) -> float:
    return sum(char_width(ch) for ch in text)


def strip_for_compare(text: str) -> str:
    """去掉标点和空白，用于校验字幕与原文是否一致。"""
    return "".join(ch for ch in text if not is_space(ch) and not is_punct(ch))


def has_spoken_content(text: str) -> bool:
    return any(is_word_char(ch) for ch in text)


def apply_pronunciations(text: str, table: dict[str, str]) -> str:
    """按替换表把显示文本转成朗读文本：从左到右扫描，同一位置长键优先，替换结果不再参与匹配。"""
    if not table:
        return text
    keys = sorted((k for k in table if k), key=len, reverse=True)
    out: list[str] = []
    i = 0
    while i < len(text):
        for k in keys:
            if text.startswith(k, i):
                out.append(table[k])
                i += len(k)
                break
        else:
            out.append(text[i])
            i += 1
    return "".join(out)


def normalize_with_map(text: str) -> tuple[str, list[int]]:
    """NFKC + 小写，逐字符处理并记录规范化字符串每一位对应的原字符下标。"""
    chars: list[str] = []
    index: list[int] = []
    for i, ch in enumerate(text):
        norm = unicodedata.normalize("NFKC", ch).lower()
        for c in norm:
            chars.append(c)
            index.append(i)
    return "".join(chars), index


def align_display_to_say(display: str, say: str) -> list[list[int]]:
    """返回 display 每个字符对应的 say 下标列表。

    equal 段一一对应；replace 段整块对应（块内每个显示字符都对应整段朗读字符）；
    display 独有的字符（delete）对应空列表。
    """
    result: list[list[int]] = [[] for _ in display]
    if display == say:
        return [[i] for i in range(len(display))]
    sm = difflib.SequenceMatcher(None, display, say, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                result[i1 + k] = [j1 + k]
        elif tag == "replace":
            block = list(range(j1, j2))
            for i in range(i1, i2):
                result[i] = block
    return result


def split_separator(sep: str) -> tuple[str, str]:
    """把两个词元之间的分隔串拆成（归前一个词的部分, 归后一个词的部分）。

    前半部分是开括号之前的所有字符（逗号、句号、闭括号、空白），后半部分从第一个开括号起。
    """
    for i, ch in enumerate(sep):
        if ch in OPENERS:
            return sep[:i], sep[i:]
    return sep, ""


def break_quality(sep: str) -> str:
    """分隔串的断行质量：strong / weak / space / none。"""
    if any(ch in STRONG_END for ch in sep):
        return "strong"
    if any(ch in WEAK_BREAK for ch in sep):
        return "weak"
    if any(ch in CLOSERS for ch in sep):
        return "weak"
    if any(is_space(ch) for ch in sep):
        return "space"
    return "none"


def process_trailing(text: str, mode: str) -> str:
    """字幕块结尾部分的标点处理。"""
    if mode == "keep":
        return text.rstrip()
    return "".join(ch for ch in text if ch not in TRIM_CHARS).rstrip()


def process_inner(text: str, mode: str) -> str:
    """字幕块内部分隔串的标点处理。"""
    if mode != "subtitle":
        return text
    out: list[str] = []
    for ch in text:
        out.append(FULLWIDTH_SPACE if ch in CJK_SOFT else ch)
    s = "".join(out)
    # 连续空白（含全角空格）压成一个；有全角空格时保留全角
    collapsed: list[str] = []
    run: list[str] = []
    for ch in s:
        if is_space(ch):
            run.append(ch)
            continue
        if run:
            collapsed.append(FULLWIDTH_SPACE if FULLWIDTH_SPACE in run else " ")
            run = []
        collapsed.append(ch)
    if run:
        collapsed.append(FULLWIDTH_SPACE if FULLWIDTH_SPACE in run else " ")
    return "".join(collapsed)
