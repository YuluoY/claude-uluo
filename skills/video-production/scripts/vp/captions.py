"""字幕切分：按意群把每句切成短块，时间对齐到词。

规则
- 块不跨句；一块是一个短意群，宽度不超过 maxCharsPerLine × maxLines（汉字计 1，西文字母/数字计 0.5）。
- 只在词元边界断开；优先在句号问号处断，其次逗号顿号冒号，再次空格，最后才是词与词之间。
  词元来自 TTS 的词边界时，词与词之间就是词边界；词元是按字估算的单字时，装了 jieba 就用它判断
  哪里是词边界（不会把“左手”拆成“左 / 手”），没装就只能当作不确定。
- 一个分句（逗号之间）尽量自成一块；长分句拆开时两块长度尽量均衡。
- 每块从第一个词开始念时出现，到最后一个词念完时消失；一句的最后一块多停 lingerSec。
- 相邻两块之间至少留 gapSec 空隙；块短于 minDurationSec 时在不压到下一块的前提下延长。
- 句间停顿里不显示字幕（上一句的块在念完后很快结束）。
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .textproc import (
    break_quality,
    display_width,
    is_space,
    process_inner,
    process_trailing,
    split_separator,
    strip_for_compare,
)
from .timing import Token

# 断在某处的代价（越小越好）：句末 < 冒号 < 逗号 < 右括号/引号 < 顿号（列举）≈ 空格 < 词间 < 不确定 < 词中间
BREAK_COST = {
    "strong": 0.0, "colon": 0.2, "comma": 0.5, "closer": 0.8, "enum": 1.5, "space": 1.5,
    "word": 3.0, "unknown": 5.0, "inside": 8.0,
}
# 一块里夹着这些分隔的代价：一个分句尽量自成一块；列举（顿号）尽量不拆开
INTERNAL_COST = {"strong": 4.0, "colon": 3.0, "comma": 2.5, "closer": 1.0, "enum": 0.3}
BLOCK_COST = 1.0
SHORT_COST = 3.0
SHORT_DURATION_COST = 2.0
OVERWIDE_COST = 5.0
FILL_COST = 1.0


@dataclass
class CapSentence:
    id: str
    text: str
    tokens: list[Token]
    # 词元是否来自 TTS 的词边界（是则词元之间就是词边界）
    word_tokens: bool = False
    # 显示文本中的词边界位置（jieba 分词得到；None 表示不知道）
    boundaries: Optional[set[int]] = None


@dataclass
class Piece:
    text: str
    start: Optional[float] = None
    end: Optional[float] = None


@dataclass
class Block:
    sentence_id: str
    lines: list[list[Piece]]
    start: float
    end: float
    last_in_sentence: bool

    @property
    def text(self) -> str:
        return "\n".join("".join(p.text for p in line) for line in self.lines)


def _seps(text: str, tokens: list[Token]) -> tuple[str, list[str], str]:
    lead = text[: tokens[0].a]
    mids = [text[tokens[k].b: tokens[k + 1].a] for k in range(len(tokens) - 1)]
    trail = text[tokens[-1].b:]
    return lead, mids, trail


def _clean_lead(s: str) -> str:
    return "".join(ch for ch in s if not is_space(ch))


def _line_pieces(tokens: list[Token], i: int, j: int, lead: str, mids: list[str], trail: str, mode: str) -> list[Piece]:
    """tokens[i:j] 组成的一行：开头的开括号 + 词元与块内分隔 + 结尾标点。"""
    pieces: list[Piece] = []
    head = _clean_lead(lead)
    if head:
        pieces.append(Piece(head))
    for k in range(i, j):
        pieces.append(Piece(tokens[k].text, tokens[k].start, tokens[k].end))
        if k < j - 1:
            inner = process_inner(mids[k], mode)
            if inner:
                pieces.append(Piece(inner))
    tail = process_trailing(trail, mode)
    if tail:
        pieces.append(Piece(tail))
    return pieces


def _segment_parts(tokens: list[Token], mids: list[str], lead_all: str, trail_all: str, i: int, j: int) -> tuple[str, str]:
    """tokens[i:j] 作为一段时，它前面归它的开括号部分、后面归它的结尾部分。"""
    lead = lead_all if i == 0 else split_separator(mids[i - 1])[1]
    trail = trail_all if j == len(tokens) else split_separator(mids[j - 1])[0]
    return lead, trail


def _width(pieces: list[Piece]) -> float:
    return display_width("".join(p.text for p in pieces))


def _sep_kind(sep: str) -> str:
    q = break_quality(sep)
    if q == "strong":
        return "strong"
    if q == "weak":
        if any(ch in "：:" for ch in sep):
            return "colon"
        if any(ch in "，," for ch in sep):
            return "comma"
        if any(ch in "、" for ch in sep):
            return "enum"
        return "closer"
    return q


def _break_kind(s: CapSentence, mids: list[str], k: int) -> str:
    """tokens[k] 与 tokens[k+1] 之间断开的类别。"""
    q = _sep_kind(mids[k])
    if q != "none":
        return q
    if s.word_tokens:
        return "word"
    if s.boundaries is not None:
        return "word" if s.tokens[k].b in s.boundaries else "inside"
    return "unknown"


def _best_two_lines(s: CapSentence, mids, lead_all, trail_all, i, j, mode, maxw) -> Optional[tuple[float, list[list[Piece]]]]:
    tokens = s.tokens
    best: Optional[tuple[float, list[list[Piece]]]] = None
    for k in range(i + 1, j):
        l1_lead, l1_trail = _segment_parts(tokens, mids, lead_all, trail_all, i, k)
        l2_lead, l2_trail = _segment_parts(tokens, mids, lead_all, trail_all, k, j)
        a = _line_pieces(tokens, i, k, l1_lead, mids, l1_trail, mode)
        b = _line_pieces(tokens, k, j, l2_lead, mids, l2_trail, mode)
        wa, wb = _width(a), _width(b)
        if wa > maxw or wb > maxw:
            continue
        cost = BREAK_COST[_break_kind(s, mids, k - 1)] + abs(wa - wb) / maxw
        if best is None or cost < best[0]:
            best = (cost, [a, b])
    return best


def segment_sentence(s: CapSentence, cfg_captions: dict) -> list[Block]:
    tokens = s.tokens
    if not tokens:
        return []
    mode = cfg_captions["punctuation"]
    maxw = float(cfg_captions["maxCharsPerLine"])
    max_lines = int(cfg_captions["maxLines"])
    min_chars = float(cfg_captions["minChars"])
    min_dur = float(cfg_captions["minDurationSec"])
    lead_all, mids, trail_all = _seps(s.text, tokens)
    n = len(tokens)
    kinds = [_break_kind(s, mids, k) for k in range(n - 1)]
    capacity = maxw * max_lines

    INF = float("inf")
    dp = [INF] * (n + 1)
    choice: list[Optional[tuple[int, list[list[Piece]]]]] = [None] * (n + 1)
    dp[0] = 0.0
    for j in range(1, n + 1):
        for i in range(j - 1, -1, -1):
            if dp[i] == INF:
                continue
            lead, trail = _segment_parts(tokens, mids, lead_all, trail_all, i, j)
            one = _line_pieces(tokens, i, j, lead, mids, trail, mode)
            w = _width(one)
            lines: Optional[list[list[Piece]]] = None
            extra = 0.0
            if w <= maxw:
                lines = [one]
            elif max_lines == 2 and j - i >= 2:
                two = _best_two_lines(s, mids, lead_all, trail_all, i, j, mode, maxw)
                if two is not None:
                    extra = two[0] * 0.5
                    lines = two[1]
            if lines is None:
                if j - i == 1:
                    lines = [one]
                    extra = OVERWIDE_COST
                else:
                    # 更长的区间只会更宽，继续往左没有意义
                    if w > capacity:
                        break
                    continue
            whole = i == 0 and j == n
            cost = BLOCK_COST + extra
            if j < n:
                cost += BREAK_COST[kinds[j - 1]]
            for k in range(i, j - 1):
                cost += INTERNAL_COST.get(kinds[k], 0.0)
            if not whole:
                cost += FILL_COST * ((capacity - min(w, capacity)) / capacity) ** 2
                if w < min_chars:
                    cost += SHORT_COST
                if tokens[j - 1].end - tokens[i].start < min_dur:
                    cost += SHORT_DURATION_COST
            total = dp[i] + cost
            if total < dp[j] - 1e-12:
                dp[j] = total
                choice[j] = (i, lines)

    blocks: list[Block] = []
    j = n
    while j > 0:
        c = choice[j]
        assert c is not None
        i, lines = c
        blocks.append(Block(s.id, lines, tokens[i].start, tokens[j - 1].end, j == n))
        j = i
    blocks.reverse()
    return blocks


def build_blocks(sentences: list[CapSentence], cfg_captions: dict, fps: float) -> list[dict]:
    blocks: list[Block] = []
    for s in sentences:
        blocks.extend(segment_sentence(s, cfg_captions))
    blocks.sort(key=lambda b: b.start)
    gap = float(cfg_captions["gapSec"])
    linger = float(cfg_captions["lingerSec"])
    min_dur = float(cfg_captions["minDurationSec"])
    frame = 1.0 / fps

    for k, b in enumerate(blocks):
        nxt = blocks[k + 1].start if k + 1 < len(blocks) else None
        end = b.end + (linger if b.last_in_sentence else 0.0)
        if end - b.start < min_dur:
            end = b.start + min_dur
        if nxt is not None:
            end = min(end, nxt - gap)
        end = max(end, b.start + frame)
        if nxt is not None and end > nxt:
            blocks[k + 1].start = end
        b.end = end

    out: list[dict] = []
    prev_end_frame = -1
    for k, b in enumerate(blocks):
        sf = max(int(round(b.start * fps)), prev_end_frame if prev_end_frame >= 0 else 0)
        ef = int(round(b.end * fps))
        if k + 1 < len(blocks):
            nsf = int(round(blocks[k + 1].start * fps))
            if gap > 0 and ef >= nsf and nsf - 1 > sf:
                ef = nsf - 1
            ef = min(ef, max(nsf, sf + 1))
        ef = max(ef, sf + 1)
        prev_end_frame = ef
        out.append({
            "id": f"c{k + 1:04d}",
            "sentenceId": b.sentence_id,
            "start": round(sf / fps, 4),
            "end": round(ef / fps, 4),
            "startFrame": sf,
            "endFrame": ef,
            "text": b.text,
            "lines": [
                [
                    {"text": p.text, "startFrame": int(round(p.start * fps)), "endFrame": int(round(p.end * fps))}
                    if p.start is not None and p.end is not None else {"text": p.text}
                    for p in line
                ]
                for line in b.lines
            ],
        })
    return out


def _srt_time(t: float) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def to_srt(blocks: list[dict]) -> str:
    parts = []
    for i, b in enumerate(blocks, 1):
        text = b["text"].replace("　", " ").strip()
        parts.append(f"{i}\n{_srt_time(b['start'])} --> {_srt_time(b['end'])}\n{text}\n")
    return "\n".join(parts)


def check_blocks(blocks: list[dict], sentences: list[CapSentence], cfg_captions: dict) -> list[str]:
    """字幕与原文逐句一致、时间不重叠、宽度不超限。"""
    errs: list[str] = []
    by_sid: dict[str, list[dict]] = {}
    for b in blocks:
        by_sid.setdefault(b["sentenceId"], []).append(b)
    for s in sentences:
        if not s.tokens:
            continue
        joined = "".join(b["text"] for b in by_sid.get(s.id, []))
        if strip_for_compare(joined) != strip_for_compare(s.text):
            errs.append(f"句子 {s.id}：字幕拼起来与原文不一致\n    原文：{s.text}\n    字幕：{joined}")
    maxw = float(cfg_captions["maxCharsPerLine"])
    for k, b in enumerate(blocks):
        if b["endFrame"] <= b["startFrame"]:
            errs.append(f"{b['id']}：结束不晚于开始")
        if k + 1 < len(blocks) and b["endFrame"] > blocks[k + 1]["startFrame"]:
            errs.append(f"{b['id']} 与 {blocks[k + 1]['id']} 时间重叠")
        lines = b["lines"]
        if len(lines) > int(cfg_captions["maxLines"]):
            errs.append(f"{b['id']}：行数超过 maxLines")
        for line in lines:
            w = display_width("".join(p["text"] for p in line))
            token_count = sum(1 for p in line if "startFrame" in p)
            if w > maxw and token_count > 1:
                errs.append(f"{b['id']}：一行宽 {w:g} 超过 maxCharsPerLine={maxw:g}")
    return errs
