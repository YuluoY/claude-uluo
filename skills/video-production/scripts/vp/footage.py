"""footage 模式：给已有视频（录屏、讲解）转写并加字幕。

流程：asr（whisper 词级时间）→ 校对稿 captions/transcript.proof.json（只改错字，时间不动）→ build（切字幕块）
→ render（Remotion 为每个字幕块渲染一张透明 PNG，ffmpeg 按时间叠到原视频上；不依赖 libass）。

校对稿里每段有 text（显示，给人改）和 asr（识别原文，不要改）。build 时把 text 逐字对齐到 asr 上，
所以改错字、补标点不会影响时间；整段删掉的内容把 drop 设为 true。
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path
from typing import Optional

from . import asr as asr_mod
from . import captions as cap_mod
from . import remotion as rm
from .audio import footage_audio_filter
from .config import load_project_config
from .errors import VPError
from .jsonutil import load_json, write_json, write_text
from .media import VideoInfo, ffmpeg, mean_volume_db, video_info
from .paths import Project
from .pipeline import ensure_project_assets, render_transcript
from .textproc import word_boundaries
from .timing import Word, tokens_for_sentence

PARAGRAPH_GAP_SEC = 1.5
PROOF_NOTE = "只改 text（错字、标点、专有名词写法），不要改 id 和 asr；整段不要就把 drop 设为 true。时间来自识别结果，不用也不能手调。"


def log_default(msg: str) -> None:
    print(msg, file=sys.stderr)


def source_path(project: Project, cfg: dict) -> Path:
    src = cfg["footage"]["source"]
    if not src:
        raise VPError("footage 模式需要 footage.source（源视频路径）")
    p = Path(src).expanduser()
    if not p.is_absolute():
        p = project.root / p
    if not p.is_file():
        raise VPError(f"找不到源视频：{src}")
    return p


def asr(project: Project, *, force: bool = False, log=log_default) -> dict:
    cfg = load_project_config(project.config_path)
    if cfg["mode"] != "footage":
        raise VPError("asr 只用于 mode=footage")
    src = source_path(project, cfg)
    info = video_info(src)
    if not info.has_audio:
        raise VPError(f"{src.name} 没有音轨，无法转写")
    project.asr_dir.mkdir(parents=True, exist_ok=True)
    wav = project.asr_dir / "source.16k.wav"
    ffmpeg(["-y", "-i", str(src), "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(wav)], what="提取音频")
    a = cfg["asr"]
    mean = mean_volume_db(wav)
    target = wav
    boosted = False
    if mean is not None and mean < a["boostBelowMeanDb"]:
        target = project.asr_dir / "source.16k.boost.wav"
        ffmpeg(["-y", "-i", str(wav), "-af", f"volume={a['boostDb']}dB,alimiter=limit=0.95", str(target)], what="抬高识别音量")
        boosted = True
        log(f"平均音量 {mean:.1f} dB 低于 {a['boostBelowMeanDb']} dB，识别前抬高 {a['boostDb']} dB（成片音量由 audio.gainDb 控制）")
    segs = asr_mod.transcribe(target, a)
    segs = [s for s in segs if s.text.strip()]
    if not segs:
        raise VPError("没有识别出任何内容")
    data = {
        "backend": asr_mod.available_backend(a["engine"]),
        "model": a["model"],
        "language": a["language"],
        "meanVolumeDb": mean,
        "boosted": boosted,
        "segments": [
            {"id": f"p{i + 1:04d}", "start": round(s.start, 4), "end": round(s.end, 4), "text": s.text,
             "words": [{"text": w.text, "start": round(w.start, 4), "end": round(w.end, 4)} for w in s.words]}
            for i, s in enumerate(segs)
        ],
    }
    write_json(project.asr_path, data)
    wrote_proof = False
    if force or not project.proof_path.is_file():
        write_json(project.proof_path, {
            "note": PROOF_NOTE,
            "segments": [{"id": s["id"], "text": s["text"], "asr": s["text"], "drop": False} for s in data["segments"]],
        })
        wrote_proof = True
    else:
        log(f"保留已有校对稿 {project.rel(project.proof_path)}（重新生成用 --force，会覆盖校对结果）")
    return {"segments": len(segs), "durationSec": round(info.duration, 2), "boosted": boosted, "proofWritten": wrote_proof}


def _load_proof(project: Project) -> tuple[dict, dict]:
    if not project.asr_path.is_file():
        raise VPError("还没有识别结果，先运行 vp.py asr")
    asr_data = load_json(project.asr_path)
    if not project.proof_path.is_file():
        raise VPError(f"缺少校对稿 {project.rel(project.proof_path)}，先运行 vp.py asr")
    proof = load_json(project.proof_path)
    return asr_data, proof


def build(project: Project, *, log=log_default) -> dict:
    cfg = load_project_config(project.config_path)
    if cfg["mode"] != "footage":
        raise VPError("footage build 只用于 mode=footage")
    themes = ensure_project_assets(project, cfg)
    src = source_path(project, cfg)
    info = video_info(src)
    asr_data, proof = _load_proof(project)
    by_id = {s["id"]: s for s in asr_data["segments"]}
    errs: list[str] = []
    sentences: list[cap_mod.CapSentence] = []
    kept: list[tuple[str, dict, str]] = []
    seen = set()
    for i, p in enumerate(proof.get("segments", [])):
        pid = p.get("id")
        if pid not in by_id:
            errs.append(f"校对稿第 {i + 1} 段 id={pid!r} 在识别结果里不存在（不要改 id）")
            continue
        if pid in seen:
            errs.append(f"校对稿 id={pid} 重复")
        seen.add(pid)
        seg = by_id[pid]
        if p.get("asr") != seg["text"]:
            errs.append(f"校对稿 {pid} 的 asr 字段被改动了（它必须保持识别原文，改错字请改 text）")
        if p.get("drop"):
            continue
        text = str(p.get("text", "")).strip()
        if not text:
            errs.append(f"校对稿 {pid} 的 text 为空；不要这段就把 drop 设为 true")
            continue
        kept.append((pid, seg, text))
    missing = [s["id"] for s in asr_data["segments"] if s["id"] not in seen]
    if missing:
        errs.append(f"校对稿缺少这些段：{', '.join(missing[:10])}（不要删段，不要的设 drop: true）")
    if errs:
        raise VPError("校对稿有问题：\n  - " + "\n  - ".join(errs))

    fps = info.fps if info.fps > 0 else 30.0
    timing: dict[str, int] = {}
    for pid, seg, text in kept:
        words = [Word(w["text"], float(w["start"]), float(w["end"])) for w in seg["words"]]
        tokens, kind, _info = tokens_for_sentence(text, seg["text"], words or None, (float(seg["start"]), float(seg["end"])), kind_when_matched="whisper")
        timing[kind] = timing.get(kind, 0) + 1
        sentences.append(cap_mod.CapSentence(pid, text, tokens, word_tokens=False, boundaries=word_boundaries(text)))

    blocks = cap_mod.build_blocks(sentences, cfg["captions"], fps) if cfg["captions"]["enabled"] else []
    cap_errs = cap_mod.check_blocks(blocks, sentences, cfg["captions"]) if blocks else []
    if cap_errs:
        raise VPError("字幕校验失败：\n  - " + "\n  - ".join(cap_errs))

    name = cfg["render"]["outputName"]
    write_json(project.captions_json, {"version": 1, "fps": fps, "blocks": blocks})
    if blocks:
        write_text(project.srt_path(name), cap_mod.to_srt(blocks))

    paragraphs: list[tuple[Optional[str], list[str]]] = []
    last_end = None
    for pid, seg, text in kept:
        if last_end is None or float(seg["start"]) - last_end >= PARAGRAPH_GAP_SEC:
            paragraphs.append((None, []))
        paragraphs[-1][1].append(text)
        last_end = float(seg["end"])
    md, txt = render_transcript(cfg["title"], cfg["language"], paragraphs)
    write_text(project.transcript_md, md)
    write_text(project.transcript_txt, txt)

    scale = min(info.width / cfg["video"]["width"], info.height / cfg["video"]["height"])
    footage_info = {"width": info.width, "height": info.height, "fps": fps, "scale": round(scale, 6), "durationSec": info.duration}
    rm.write_generated(project, "settings", rm.settings_payload(cfg, cfg["style"], themes, footage=footage_info))
    rm.write_generated(project, "captions", {"blocks": [
        {"id": b["id"], "startFrame": b["startFrame"], "endFrame": b["endFrame"], "lines": b["lines"]} for b in blocks
    ]})
    rm.write_generated(project, "timeline", _empty_timeline(cfg, info))
    return {"durationSec": round(info.duration, 2), "segments": len(kept), "captions": len(blocks), "timing": timing,
            "source": {"width": info.width, "height": info.height, "fps": round(fps, 3)}}


def _empty_timeline(cfg: dict, info: VideoInfo) -> dict:
    """footage 模式不用 Main 合成；给它一份合法的空时间轴，保证工程能打开。"""
    return {"fps": 30, "width": info.width - info.width % 2, "height": info.height - info.height % 2, "durationInFrames": 1,
            "title": cfg["title"], "audio": None, "chapters": [], "shots": []}


def _concat_list(blocks: list[dict], cards: list[Path], blank: Path, duration: float, fps: float) -> str:
    """ffconcat：空白与字幕卡交替，铺满整段时长。最后一项重复一次，否则 concat 会忽略它的 duration。"""
    lines = ["ffconcat version 1.0"]
    t = 0.0
    last: Optional[Path] = None

    def add(path: Path, dur: float) -> None:
        nonlocal last
        if dur <= 0:
            return
        lines.append(f"file '{path.as_posix()}'")
        lines.append(f"duration {dur:.6f}")
        last = path

    for b, card in zip(blocks, cards):
        start, end = b["startFrame"] / fps, b["endFrame"] / fps
        if start > t:
            add(blank, start - t)
            t = start
        add(card, end - t)
        t = end
    add(blank, max(duration - t, 1.0 / fps))
    if last is not None:
        lines.append(f"file '{last.as_posix()}'")
    return "\n".join(lines) + "\n"


def render(project: Project, *, preview: bool, log=log_default) -> Path:
    cfg = load_project_config(project.config_path)
    src = source_path(project, cfg)
    info = video_info(src)
    cap = load_json(project.captions_json) if project.captions_json.is_file() else None
    if cap is None:
        raise VPError("还没有字幕，先运行 vp.py build")
    blocks = cap["blocks"]
    fps = float(cap["fps"])
    c = cfg["captions"]
    burn = c["enabled"] and c["render"] in ("burn", "both") and bool(blocks)
    soft = c["enabled"] and c["render"] in ("soft", "both") and bool(blocks)
    v = cfg["video"]
    a = cfg["audio"]

    work = project.work_dir / "footage"
    work.mkdir(parents=True, exist_ok=True)
    out = project.renders_dir / ("preview.mp4" if preview else f"{cfg['render']['outputName']}.mp4")
    out.parent.mkdir(parents=True, exist_ok=True)

    args = ["-y", "-i", str(src)]
    filters: list[str] = []
    vmap = "0:v:0"
    if burn:
        rm.ensure_node_modules(project, log)
        cards = rm.render_sequence(project, "CaptionCards", work / "cards", image_format="png", prefix="card")
        if len(cards) != len(blocks):
            raise VPError(f"字幕卡数量 {len(cards)} 与字幕块 {len(blocks)} 不一致")
        blank = work / "blank.png"
        ffmpeg(["-y", "-f", "lavfi", "-i", f"color=c=black@0.0:s={info.width}x{info.height},format=rgba", "-frames:v", "1", str(blank)], what="生成透明底图")
        concat = work / "cards.ffconcat"
        write_text(concat, _concat_list(blocks, cards, blank, info.duration, fps))
        args += ["-f", "concat", "-safe", "0", "-i", str(concat)]
        filters.append("[1:v]format=rgba[ov]")
        filters.append("[0:v][ov]overlay=0:0:eof_action=pass:format=auto[vb]")
        vmap = "[vb]"
    if preview:
        s = cfg["render"]["preview"]["scale"]
        src_label = vmap if vmap.startswith("[") else "[0:v:0]"
        filters.append(f"{src_label}scale=trunc(iw*{s}/2)*2:trunc(ih*{s}/2)*2[vs]")
        vmap = "[vs]"
    srt_index = None
    if soft:
        srt = project.srt_path(cfg["render"]["outputName"])
        if not srt.is_file():
            raise VPError(f"找不到 {project.rel(srt)}，先运行 vp.py build")
        srt_index = 2 if burn else 1
        args += ["-i", str(srt)]
    if filters:
        args += ["-filter_complex", ";".join(filters)]
    args += ["-map", vmap]
    if info.has_audio:
        args += ["-map", "0:a:0"]
    if srt_index is not None:
        args += ["-map", f"{srt_index}:s:0", "-c:s", "mov_text", "-metadata:s:s:0", f"language={_iso639_2(cfg['language'])}"]

    if not filters:
        args += ["-c:v", "copy"]
    else:
        codec = {"h264": "libx264", "h265": "libx265"}[v["codec"]]
        args += ["-c:v", codec, "-pix_fmt", "yuv420p" if preview else v["pixelFormat"]]
        if preview:
            args += ["-crf", "28", "-preset", "veryfast"]
        else:
            if v["videoBitrate"]:
                args += ["-b:v", v["videoBitrate"]]
            else:
                args += ["-crf", str(v["crf"] if v["crf"] is not None else (18 if v["codec"] == "h264" else 23))]
            if v["codec"] == "h264" and v["x264Preset"]:
                args += ["-preset", v["x264Preset"]]
        if v["codec"] == "h265":
            args += ["-tag:v", "hvc1"]
    if info.has_audio:
        af = footage_audio_filter(cfg, src)
        if af:
            args += ["-af", af, "-c:a", "aac", "-b:a", a["bitrate"], "-ar", str(a["sampleRate"])]
        else:
            args += ["-c:a", "copy"]
    if preview and cfg["render"]["preview"]["maxSeconds"]:
        args += ["-t", f"{cfg['render']['preview']['maxSeconds']}"]
    args += ["-movflags", "+faststart", str(out)]
    ffmpeg(args, what="合成成片")
    return out


def _iso639_2(lang: str) -> str:
    base = lang.split("-")[0].lower()
    return {"zh": "chi", "en": "eng", "ja": "jpn", "ko": "kor", "fr": "fre", "de": "ger", "es": "spa", "ru": "rus"}.get(base, "und")


def copy_source_into_project(project: Project, source: Path) -> str:
    project.footage_dir.mkdir(parents=True, exist_ok=True)
    dst = project.footage_dir / source.name
    if dst.resolve() != source.resolve():
        shutil.copy2(source, dst)
    return project.rel(dst)
