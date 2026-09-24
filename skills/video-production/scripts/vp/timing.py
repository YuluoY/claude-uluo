"""把词级时间（TTS 词边界或 ASR 词时间戳）落到显示文本上，切成带时间的词元。

词元（Token）是字幕切分与画面 cue 的最小单位：一个词元内部不会被拆开。
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .textproc import (
    CJK_SOFT,
    STRONG_END,
    WEAK_BREAK,
    align_display_to_say,
    is_cjk,
    is_punct,
    is_space,
    is_token_char,
    is_word_char,
    normalize_with_map,
)

# 在朗读文本里向后查找一个词时，最多允许跳过的可读字符数；超过就判为没对上，防止整体错位
MAX_SKIP_WORD_CHARS = 8
MIN_WORD_COVERAGE = 0.6


@dataclass
class Word:
    text: str
    start: float
    end: float


@dataclass
class Token:
    text: str
    a: int
    b: int
    start: float
    end: float

    def to_json(self) -> dict:
        return {"text": self.text, "span": [self.a, self.b], "start": round(self.start, 4), "end": round(self.end, 4)}

    @staticmethod
    def from_json(d: dict) -> "Token":
        return Token(d["text"], d["span"][0], d["span"][1], float(d["start"]), float(d["end"]))


@dataclass
class SayMapping:
    times: list[Optional[tuple[float, float]]]
    wid: list[Optional[int]]
    matched_words: int
    unmatched_words: list[str]


def map_words_to_text(say: str, words: list[Word]) -> SayMapping:
    """按顺序把词在朗读文本中定位，得到朗读文本每个字符的时间与所属词编号。"""
    norm, index = normalize_with_map(say)
    times: list[Optional[tuple[float, float]]] = [None] * len(say)
    wid: list[Optional[int]] = [None] * len(say)
    cursor = 0
    matched = 0
    unmatched: list[str] = []
    for k, w in enumerate(words):
        wn, _ = normalize_with_map(w.text)
        wn = "".join(c for c in wn if not c.isspace())
        if not wn:
            continue
        pos = norm.find(wn, cursor)
        if pos < 0 or sum(1 for c in norm[cursor:pos] if is_word_char(c)) > MAX_SKIP_WORD_CHARS:
            unmatched.append(w.text)
            continue
        covered = sorted(set(index[pos:pos + len(wn)]))
        dur = max(0.0, w.end - w.start)
        m = len(covered)
        for j, oi in enumerate(covered):
            times[oi] = (w.start + dur * j / m, w.start + dur * (j + 1) / m)
            wid[oi] = k
        matched += 1
        cursor = pos + len(wn)
    return SayMapping(times, wid, matched, unmatched)


def build_tokens(display: str, say: str, mapping: SayMapping, span: tuple[float, float]) -> tuple[list[Token], float]:
    """显示文本 → 词元。返回（词元列表, 可读字符的时间覆盖率）。"""
    amap = align_display_to_say(display, say)
    n = len(display)
    times: list[Optional[tuple[float, float]]] = [None] * n
    groups: list[Optional[frozenset]] = [None] * n
    word_chars = 0
    covered = 0
    for i, ch in enumerate(display):
        if not is_token_char(ch):
            continue
        js = amap[i]
        ts = [mapping.times[j] for j in js if mapping.times[j] is not None]
        if ts:
            times[i] = (min(t[0] for t in ts), max(t[1] for t in ts))
        ws = {mapping.wid[j] for j in js if mapping.wid[j] is not None}
        groups[i] = frozenset(ws) if ws else None
        if is_word_char(ch):
            word_chars += 1
            if times[i] is not None:
                covered += 1
    coverage = covered / word_chars if word_chars else 0.0
    _interpolate(display, times, span)

    tokens: list[Token] = []
    cur: Optional[list] = None
    last_group: Optional[frozenset] = None
    for i, ch in enumerate(display):
        if not is_token_char(ch):
            if cur is not None:
                tokens.append(_mk(display, cur))
                cur, last_group = None, None
            continue
        g = groups[i]
        if cur is not None and g is not None and last_group is not None and g.isdisjoint(last_group):
            tokens.append(_mk(display, cur))
            cur, last_group = None, None
        t = times[i]
        assert t is not None
        if cur is None:
            cur = [i, i + 1, t[0], t[1]]
        else:
            cur[1] = i + 1
            cur[2] = min(cur[2], t[0])
            cur[3] = max(cur[3], t[1])
        if g is not None:
            last_group = g
    if cur is not None:
        tokens.append(_mk(display, cur))
    return _monotonic(tokens, span), coverage


def estimate_tokens(display: str, span: tuple[float, float]) -> list[Token]:
    """没有词级时间时，按字数（含标点停顿权重）把时间摊到字上。汉字一字一词元，西文连续串为一个词元。"""
    weights = [_estimate_weight(ch) for ch in display]
    total = sum(weights)
    start, end = span
    if total <= 0:
        total = 1.0
    cum = [0.0]
    for w in weights:
        cum.append(cum[-1] + w)

    def t_at(i: int) -> float:
        return start + (end - start) * cum[i] / total

    tokens: list[Token] = []
    i = 0
    n = len(display)
    while i < n:
        ch = display[i]
        if not is_token_char(ch):
            i += 1
            continue
        if is_cjk(ch):
            tokens.append(Token(ch, i, i + 1, t_at(i), t_at(i + 1)))
            i += 1
            continue
        j = i
        while j < n and is_token_char(display[j]) and not is_cjk(display[j]):
            j += 1
        tokens.append(Token(display[i:j], i, j, t_at(i), t_at(j)))
        i = j
    return _monotonic(tokens, span)


def tokens_for_sentence(
    display: str,
    say: str,
    words: Optional[list[Word]],
    span: tuple[float, float],
    kind_when_matched: str = "word",
) -> tuple[list[Token], str, dict]:
    """词时间可用且覆盖率达标就用，否则退回按字数估算。返回（词元, 时间来源, 诊断信息）。"""
    info: dict = {}
    if words:
        mapping = map_words_to_text(say, words)
        tokens, coverage = build_tokens(display, say, mapping, span)
        info = {"coverage": round(coverage, 3), "unmatchedWords": mapping.unmatched_words}
        if coverage >= MIN_WORD_COVERAGE and tokens:
            return tokens, kind_when_matched, info
    return estimate_tokens(display, span), "estimated", info


def shift_tokens(tokens: list[Token], dt: float) -> list[Token]:
    return [Token(t.text, t.a, t.b, t.start + dt, t.end + dt) for t in tokens]


def _mk(display: str, cur: list) -> Token:
    a, b, s, e = cur
    return Token(display[a:b], a, b, s, e)


def _interpolate(display: str, times: list[Optional[tuple[float, float]]], span: tuple[float, float]) -> None:
    """词元字符里没拿到时间的，按前后已知时间均分。"""
    idx = [i for i, ch in enumerate(display) if is_token_char(ch)]
    k = 0
    while k < len(idx):
        if times[idx[k]] is not None:
            k += 1
            continue
        run_start = k
        while k < len(idx) and times[idx[k]] is None:
            k += 1
        prev_t = times[idx[run_start - 1]] if run_start > 0 else None
        next_t = times[idx[k]] if k < len(idx) else None
        left = prev_t[1] if prev_t is not None else span[0]
        right = next_t[0] if next_t is not None else span[1]
        if right < left:
            right = left
        m = k - run_start
        for r in range(m):
            times[idx[run_start + r]] = (left + (right - left) * r / m, left + (right - left) * (r + 1) / m)


def _monotonic(tokens: list[Token], span: tuple[float, float]) -> list[Token]:
    """把时间夹到 span 内，并保证起点单调不减、终点不早于起点。"""
    lo, hi = span
    out: list[Token] = []
    prev_start = lo
    for t in tokens:
        s = min(max(t.start, lo, prev_start), hi)
        e = min(max(t.end, s), hi)
        out.append(Token(t.text, t.a, t.b, s, e))
        prev_start = s
    return out


def _estimate_weight(ch: str) -> float:
    if is_space(ch):
        return 0.15
    if ch in STRONG_END:
        return 1.0
    if ch in WEAK_BREAK or ch in CJK_SOFT:
        return 0.6
    if is_punct(ch):
        return 0.1
    if is_cjk(ch):
        return 1.0
    return 0.45
