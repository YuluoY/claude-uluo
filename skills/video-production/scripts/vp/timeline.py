"""时间轴：把逐句配音排到全片时间线上，得到镜头、句子、词元、提示点、算法步骤的时刻与帧号。

timeline.json 是全片唯一的时间来源：画面按它切换，字幕从它生成，混音按它摆放配音。

排布规则
- 句子起点对齐到帧网格；每句音频裁掉首尾静音（保留 headPadSec / tailPadSec 余量）。
- 句间停顿 sentencePauseSec，镜头间停顿 shotPauseSec，单句可用 pauseAfterSec 覆盖。
- 镜头的画面比它第一句口播提前 visualLeadSec 出现，但不早于上一镜口播结束。
- 镜头按顺序首尾相接铺满全片：第 i 镜到第 i+1 镜画面出现为止；片头 leadInSec 属于第一镜，片尾 tailSec 属于最后一镜。
- 转场是后一镜盖在前一镜上进入，前一镜在转场结束前保持显示（防闪）。
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .errors import VPError
from .storyboard import Cue, Sentence, Shot, Storyboard, find_occurrence
from .timing import Token, Word, tokens_for_sentence
from .tts import SentenceAudio

TIMELINE_VERSION = 1


@dataclass
class Placed:
    sentence: Sentence
    audio: SentenceAudio
    start: float
    end: float
    clip_start: float
    clip_end: float
    speech: tuple[float, float]
    tokens: list[Token]
    timing: str
    info: dict


def _frame(t: float, fps: int) -> int:
    return int(round(t * fps))


def _snap(t: float, fps: int) -> float:
    return _frame(t, fps) / fps


def place_sentence(s: Sentence, a: SentenceAudio, start: float, cfg: dict) -> Placed:
    p = cfg["pacing"]
    if a.engine == "none":
        clip_start, clip_end = 0.0, a.duration
    else:
        clip_start = max(0.0, a.speech[0] - p["headPadSec"])
        clip_end = min(a.duration, a.speech[1] + p["tailPadSec"])
    end = start + (clip_end - clip_start)
    speech = (start + a.speech[0] - clip_start, start + a.speech[1] - clip_start)
    words = None
    if a.words:
        words = [Word(w.text, start + w.start - clip_start, start + w.end - clip_start) for w in a.words]
    tokens, timing, info = tokens_for_sentence(s.text, s.say, words, speech, kind_when_matched=a.timing)
    if a.timing == "reading":
        timing = "reading"
    return Placed(s, a, start, end, clip_start, clip_end, speech, tokens, timing, info)


def cue_time(p: Placed, c: Cue) -> float:
    pos = find_occurrence(p.sentence.text, c.at, c.occurrence)
    if pos is None:
        raise VPError(f"句子 {p.sentence.id}：找不到提示点 {c.id} 的“{c.at}”")
    a, b = pos, pos + len(c.at)
    hit = [t for t in p.tokens if t.a < b and t.b > a]
    if not hit:
        raise VPError(f"句子 {p.sentence.id}：提示点 {c.id} 的“{c.at}”没有落在任何词上")
    t = min(x.start for x in hit) if c.edge == "start" else max(x.end for x in hit)
    return t + c.offset


def sentence_steps(p: Placed) -> list[tuple[int, float]]:
    """本句的算法步骤时刻：cue 指定的步骤按 cue 时刻，其余在锚点之间按步号线性插值。"""
    s = p.sentence
    anchors: dict[int, float] = {}
    for c in s.cues:
        if c.step is not None:
            anchors[c.step] = cue_time(p, c)
    if s.steps is None:
        return sorted(anchors.items(), key=lambda kv: kv[1])
    a, b = s.steps
    lo, hi = p.speech
    if a not in anchors:
        anchors[a] = lo
    end_anchor = b + 1
    anchors_all = dict(anchors)
    anchors_all[end_anchor] = max(hi, max(anchors.values()))
    keys = sorted(anchors_all)
    for i in range(len(keys) - 1):
        if anchors_all[keys[i + 1]] < anchors_all[keys[i]] - 1e-6:
            raise VPError(f"句子 {s.id}：提示点里的步骤时刻顺序与步号顺序相反（第 {keys[i]} 步晚于第 {keys[i + 1]} 步）")
    out: list[tuple[int, float]] = []
    for step in range(a, b + 1):
        if step in anchors:
            out.append((step, anchors[step]))
            continue
        k0 = max(k for k in keys if k < step)
        k1 = min(k for k in keys if k > step)
        t0, t1 = anchors_all[k0], anchors_all[k1]
        out.append((step, t0 + (t1 - t0) * (step - k0) / (k1 - k0)))
    for step, t in anchors.items():
        if not a <= step <= b:
            out.append((step, t))
    out.sort(key=lambda kv: (kv[1], kv[0]))
    return out


def build_timeline(
    cfg: dict,
    sb: Storyboard,
    audios: dict[str, SentenceAudio],
    *,
    clip_durations: Optional[dict[str, float]] = None,
    audio_src: Optional[str] = None,
) -> dict:
    fps = cfg["video"]["fps"]
    pace = cfg["pacing"]
    clip_durations = clip_durations or {}

    placed: dict[str, Placed] = {}
    shot_rows: list[dict] = []
    cursor = pace["leadInSec"]
    prev_content_end = 0.0
    n = len(sb.shots)

    for i, sh in enumerate(sb.shots):
        content_start = _snap(cursor, fps)
        if sh.sentences:
            t = content_start
            last_end = t
            for k, s in enumerate(sh.sentences):
                if s.id not in audios:
                    raise VPError(f"句子 {s.id} 没有配音结果")
                pl = place_sentence(s, audios[s.id], _snap(t, fps), cfg)
                placed[s.id] = pl
                last_end = pl.end
                if k < len(sh.sentences) - 1:
                    gap = s.pause_after if s.pause_after is not None else pace["sentencePauseSec"]
                    t = pl.end + gap
            content_end = last_end + sh.hold
        else:
            content_end = content_start + float(sh.duration or 0)

        if i == 0:
            visual_start = 0.0
        elif sh.sentences:
            visual_start = max(prev_content_end, content_start - pace["visualLeadSec"])
        else:
            visual_start = content_start
        if content_end - visual_start < sh.min_duration:
            content_end = visual_start + sh.min_duration

        shot_rows.append({"shot": sh, "visual_start": visual_start, "content_end": content_end})
        last_pause = sh.sentences[-1].pause_after if sh.sentences and sh.sentences[-1].pause_after is not None else None
        if i < n - 1:
            cursor = content_end + (last_pause if last_pause is not None else pace["shotPauseSec"])
        prev_content_end = content_end

    total_sec = prev_content_end + pace["tailSec"]
    total_frames = max(_frame(total_sec, fps), 1)

    froms: list[int] = []
    for i, row in enumerate(shot_rows):
        f = _frame(row["visual_start"], fps)
        if froms and f <= froms[-1]:
            f = froms[-1] + 1
        froms.append(f)
    if froms[-1] >= total_frames:
        total_frames = froms[-1] + 1
    total_sec = max(total_sec, total_frames / fps)

    default_tr = cfg["transition"]
    shots_full: list[dict] = []
    shots_compact: list[dict] = []
    sentences_full: list[dict] = []
    for i, row in enumerate(shot_rows):
        sh: Shot = row["shot"]
        f0 = froms[i]
        f1 = froms[i + 1] if i + 1 < n else total_frames
        dur_frames = f1 - f0
        tr = sh.transition or default_tr
        tr_type = tr["type"]
        tr_sec = tr.get("durationSec", default_tr["durationSec"])
        tr_frames = 0 if (i == 0 or tr_type == "cut") else min(_frame(tr_sec, fps), dur_frames)
        if tr_frames == 0:
            tr_type = "cut"

        cues_full: dict[str, dict] = {}
        cues_compact: dict[str, int] = {}
        steps: list[tuple[int, float]] = []
        sent_compact: list[dict] = []
        for s in sh.sentences:
            pl = placed[s.id]
            for c in s.cues:
                t = cue_time(pl, c)
                cues_full[c.id] = {"sentenceId": s.id, "time": round(t, 4), "frame": _frame(t, fps) - f0}
                cues_compact[c.id] = _frame(t, fps) - f0
            steps.extend(sentence_steps(pl))
            sf, ef = _frame(pl.start, fps), _frame(pl.end, fps)
            sent_compact.append({
                "id": s.id,
                "text": s.text,
                "startFrame": sf - f0,
                "endFrame": ef - f0,
                "tokens": [
                    {"text": tk.text, "span": [tk.a, tk.b], "startFrame": _frame(tk.start, fps) - f0, "endFrame": _frame(tk.end, fps) - f0}
                    for tk in pl.tokens
                ],
            })
            sentences_full.append({
                "id": s.id,
                "shotId": sh.id,
                "text": s.text,
                "say": s.say,
                "start": round(pl.start, 4),
                "end": round(pl.end, 4),
                "startFrame": sf,
                "endFrame": ef,
                "speechStart": round(pl.speech[0], 4),
                "speechEnd": round(pl.speech[1], 4),
                "audio": None if pl.audio.file is None else {
                    "engine": pl.audio.engine,
                    "clipStart": round(pl.clip_start, 4),
                    "clipEnd": round(pl.clip_end, 4),
                },
                "timing": pl.timing,
                "coverage": pl.info.get("coverage"),
                "unmatchedWords": pl.info.get("unmatchedWords", []),
                "tokens": [tk.to_json() for tk in pl.tokens],
            })
        step_rows = [{"step": st, "time": round(t, 4), "frame": _frame(t, fps) - f0} for st, t in steps]

        source = dict(sh.source)
        if source.get("type") == "clip":
            d = clip_durations.get(source["file"])
            if d is not None:
                rate = float(source.get("playbackRate", 1.0))
                trim = float(source.get("trimStartSec", 0.0))
                source["clipDurationInFrames"] = max(1, int((d - trim) / rate * fps))
        common = {
            "id": sh.id,
            "index": i,
            "chapter": sh.chapter,
            "from": f0,
            "durationInFrames": dur_frames,
            "transition": {"type": tr_type, "durationInFrames": tr_frames},
            "source": source,
        }
        shots_full.append({
            **common,
            "intent": sh.intent,
            "visual": sh.visual,
            "start": round(f0 / fps, 4),
            "end": round(f1 / fps, 4),
            "sentenceIds": [s.id for s in sh.sentences],
            "cues": cues_full,
            "steps": step_rows,
        })
        shots_compact.append({
            **common,
            "sentences": sent_compact,
            "cues": cues_compact,
            "steps": [{"step": r["step"], "frame": r["frame"]} for r in step_rows],
        })

    chapters = chapters_of(shots_full, fps)
    full = {
        "version": TIMELINE_VERSION,
        "fps": fps,
        "width": cfg["video"]["width"],
        "height": cfg["video"]["height"],
        "durationSec": round(total_frames / fps, 4),
        "durationInFrames": total_frames,
        "title": cfg["title"],
        "chapters": chapters,
        "shots": shots_full,
        "sentences": sentences_full,
    }
    compact = {
        "fps": fps,
        "width": cfg["video"]["width"],
        "height": cfg["video"]["height"],
        "durationInFrames": total_frames,
        "title": cfg["title"],
        "audio": audio_src,
        "chapters": [{"title": c["title"], "startFrame": c["startFrame"], "endFrame": c["endFrame"]} for c in chapters],
        "shots": shots_compact,
    }
    return {"full": full, "compact": compact, "placed": placed}


def chapters_of(shots: list[dict], fps: int) -> list[dict]:
    out: list[dict] = []
    for sh in shots:
        title = sh.get("chapter")
        end_frame = sh["from"] + sh["durationInFrames"]
        if title and out and out[-1]["title"] == title and out[-1]["endFrame"] == sh["from"]:
            out[-1]["endFrame"] = end_frame
            out[-1]["end"] = round(end_frame / fps, 4)
        elif title:
            out.append({"title": title, "startFrame": sh["from"], "endFrame": end_frame,
                        "start": round(sh["from"] / fps, 4), "end": round(end_frame / fps, 4)})
    return out


def audio_placements(placed: dict[str, Placed]) -> list[dict]:
    """混音用：每句音频文件、裁剪区间、在全片中的起点（秒）。"""
    rows = []
    for pl in sorted(placed.values(), key=lambda p: p.start):
        if pl.audio.file is None:
            continue
        rows.append({
            "sid": pl.sentence.id,
            "file": pl.audio.file,
            "clipStart": pl.clip_start,
            "clipEnd": pl.clip_end,
            "start": pl.start,
        })
    return rows
