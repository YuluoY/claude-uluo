"""逐句配音。

引擎：
- edge-tts（默认）：必须显式传 boundary="WordBoundary"，7.2 以后默认只给句级边界。偏移单位 100ns，标点不出词。
- say：macOS 系统语音，没有词级时间，按 voice.align 对齐。
- external：audio/external/<句子id>.<扩展名>，由模型的 TTS 工具或用户提供，同样按 voice.align 对齐。
- none：不配音，句长按阅读速度计算。

缓存：audio/tts/<句子id>.<扩展名> + <句子id>.json。json 里的 key 由引擎参数和朗读文本算出，key 不变就不重新合成。
配音音频属于项目素材，清理时保留（edge-tts 以后可能用不了，那时这些音频补不回来）。
"""
from __future__ import annotations

import asyncio
import importlib.util
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

from . import asr as asr_mod
from .errors import VPError
from .jsonutil import load_json, sha256_file, sha256_json, write_bytes, write_json
from .media import speech_bounds
from .paths import Project, resolve_in_project
from .storyboard import Sentence, Storyboard
from .textproc import display_width
from .timing import Word

CACHE_VERSION = 2
EXTERNAL_EXTS = ("wav", "mp3", "m4a", "aiff", "flac")
EDGE_CONCURRENCY = 3
SAY_BASE_WPM = 175
# 阅读模式下单句最短显示时间
MIN_READING_SEC = 1.2


@dataclass
class SentenceAudio:
    sid: str
    engine: str
    file: Optional[Path]
    duration: float
    speech: tuple[float, float]
    words: Optional[list[Word]]
    timing: str  # word / whisper / estimated / reading

    def to_json(self, project: Project, key: str) -> dict:
        return {
            "key": key,
            "engine": self.engine,
            "file": project.rel(self.file) if self.file else None,
            "duration": round(self.duration, 4),
            "speech": [round(self.speech[0], 4), round(self.speech[1], 4)],
            "timing": self.timing,
            "words": [{"text": w.text, "start": round(w.start, 4), "end": round(w.end, 4)} for w in self.words] if self.words else None,
        }


Log = Callable[[str], None]


def _print(msg: str) -> None:
    print(msg, file=sys.stderr)


def cache_key(s: Sentence, cfg: dict, engine: str, extra: Optional[dict] = None) -> str:
    v = cfg["voice"]
    payload: dict = {"v": CACHE_VERSION, "engine": engine, "say": s.say}
    if engine == "edge-tts":
        payload.update(voice=v["voice"], rate=s.rate or v["rate"], volume=v["volume"], pitch=v["pitch"])
    elif engine == "say":
        payload.update(voice=v["sayVoice"], rate=s.rate or v["rate"])
    elif engine == "none":
        payload = {"v": CACHE_VERSION, "engine": "none", "text": s.text, "cps": v["readingCharsPerSec"]}
    if engine in ("say", "external"):
        payload["align"] = _align_signature(cfg)
    if extra:
        payload.update(extra)
    return sha256_json(payload)


def _align_signature(cfg: dict) -> dict:
    mode = cfg["voice"]["align"]
    backend = asr_mod.available_backend(cfg["asr"]["engine"]) if mode != "estimate" else None
    if mode == "auto" and backend is None:
        return {"mode": "estimate"}
    if mode == "estimate":
        return {"mode": "estimate"}
    return {"mode": "whisper", "backend": backend, "model": cfg["asr"]["model"], "lang": cfg["asr"]["language"]}


def _rate_pct(rate: str) -> int:
    m = re.match(r"^([+-])([0-9]+)%$", rate)
    if not m:
        raise VPError(f"语速格式应为 +10% / -5%：{rate}")
    return int(m.group(2)) * (1 if m.group(1) == "+" else -1)


# ---------- edge-tts ----------

def _require_edge_tts():
    if importlib.util.find_spec("edge_tts") is None:
        raise VPError("没有安装 edge-tts：pip install edge-tts（需要 7.2 或更新版本）")
    import edge_tts  # type: ignore

    ver = getattr(edge_tts, "__version__", "0")
    parts = [int(x) for x in re.findall(r"[0-9]+", ver)[:2]] + [0, 0]
    if (parts[0], parts[1]) < (7, 2):
        raise VPError(f"edge-tts 版本 {ver} 过旧，需要 7.2 或更新（pip install -U edge-tts）")
    return edge_tts


async def _edge_once(edge_tts, text: str, voice: str, rate: str, volume: str, pitch: str, timeout: int) -> tuple[bytes, list[Word]]:
    kwargs = dict(rate=rate, volume=volume, pitch=pitch, boundary="WordBoundary", receive_timeout=timeout)
    proxy = os.environ.get("VP_TTS_PROXY")
    if proxy:
        kwargs["proxy"] = proxy
    comm = edge_tts.Communicate(text, voice, **kwargs)
    audio = bytearray()
    words: list[Word] = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            start = chunk["offset"] / 1e7
            words.append(Word(chunk["text"], start, start + chunk["duration"] / 1e7))
    if not audio:
        raise VPError("edge-tts 没有返回音频")
    return bytes(audio), words


async def _edge_batch(items: list[tuple[Sentence, Path]], cfg: dict, log: Log) -> dict[str, object]:
    """并发合成；返回 {句子id: (音频字节, 词) 或 Exception}。"""
    edge_tts = _require_edge_tts()
    v = cfg["voice"]
    sem = asyncio.Semaphore(EDGE_CONCURRENCY)
    results: dict[str, object] = {}

    async def one(s: Sentence) -> None:
        async with sem:
            last: Optional[BaseException] = None
            for attempt in range(v["retries"] + 1):
                try:
                    data, words = await asyncio.wait_for(
                        _edge_once(edge_tts, s.say, v["voice"], s.rate or v["rate"], v["volume"], v["pitch"], v["timeoutSec"]),
                        timeout=v["timeoutSec"] + 5,
                    )
                    results[s.id] = (data, words)
                    log(f"  配音 {s.id}（edge-tts，{len(words)} 个词）")
                    return
                except Exception as e:  # noqa: BLE001 — 网络/服务端错误种类多，统一重试
                    last = e
                    if attempt < v["retries"]:
                        await asyncio.sleep(min(8.0, 1.0 * 2 ** attempt))
            results[s.id] = last if last is not None else VPError("edge-tts 失败")

    await asyncio.gather(*(one(s) for s, _ in items))
    return results


# ---------- say ----------

def _say(s: Sentence, cfg: dict, out: Path) -> None:
    exe = shutil.which("say")
    if not exe:
        raise VPError("找不到 say（只有 macOS 自带）")
    wpm = max(80, round(SAY_BASE_WPM * (1 + _rate_pct(s.rate or cfg["voice"]["rate"]) / 100)))
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_name(out.stem + ".tmp.aiff")
    proc = subprocess.run(
        [exe, "-v", cfg["voice"]["sayVoice"], "-r", str(wpm), "-o", str(tmp), "--data-format=LEI16@24000", s.say],
        capture_output=True,
    )
    if proc.returncode != 0 or not tmp.is_file():
        raise VPError(f"say 合成失败：{proc.stderr.decode('utf-8', 'replace').strip()}")
    os.replace(tmp, out)


# ---------- 对齐 ----------

def _align_words(file: Path, s: Sentence, cfg: dict) -> tuple[Optional[list[Word]], str]:
    sig = _align_signature(cfg)
    if sig["mode"] == "estimate":
        return None, "estimated"
    if cfg["voice"]["align"] == "whisper":
        asr_mod.require_backend(cfg["asr"]["engine"])
    segs = asr_mod.transcribe(file, cfg["asr"], initial_prompt=s.say)
    words = asr_mod.all_words(segs)
    return (words or None), ("whisper" if words else "estimated")


def _bounds(file: Path, words: Optional[list[Word]]) -> tuple[float, tuple[float, float]]:
    head, tail, total = speech_bounds(file)
    if words:
        head = min(head, words[0].start) if tail > head else words[0].start
        tail = max(tail, words[-1].end)
    if tail <= head:
        raise VPError(f"{file.name} 里听不到声音（整段静音）")
    return total, (max(0.0, head), min(total, tail))


def _external_file(project: Project, cfg: dict, sid: str) -> Path:
    base = resolve_in_project(project, cfg["voice"]["externalDir"], what="voice.externalDir")
    for ext in EXTERNAL_EXTS:
        p = base / f"{sid}.{ext}"
        if p.is_file():
            return p
    raise VPError(f"engine=external：找不到 {project.rel(base)}/{sid}.({'|'.join(EXTERNAL_EXTS)})")


# ---------- 主入口 ----------

def _load_cached(project: Project, sid: str, key: str) -> Optional[SentenceAudio]:
    meta_path = project.tts_dir / f"{sid}.json"
    if not meta_path.is_file():
        return None
    try:
        meta = load_json(meta_path)
    except VPError:
        return None
    if meta.get("key") != key:
        return None
    f = project.root / meta["file"] if meta.get("file") else None
    if f is not None and not f.is_file():
        return None
    words = [Word(w["text"], float(w["start"]), float(w["end"])) for w in meta["words"]] if meta.get("words") else None
    return SentenceAudio(sid, meta["engine"], f, float(meta["duration"]), (float(meta["speech"][0]), float(meta["speech"][1])), words, meta["timing"])


def _save(project: Project, a: SentenceAudio, key: str) -> SentenceAudio:
    """写缓存，并返回按缓存精度规范化后的结果：首次合成与命中缓存得到完全相同的时间轴。"""
    meta = a.to_json(project, key)
    write_json(project.tts_dir / f"{a.sid}.json", meta)
    words = [Word(w["text"], float(w["start"]), float(w["end"])) for w in meta["words"]] if meta.get("words") else None
    return SentenceAudio(a.sid, a.engine, a.file, float(meta["duration"]), (float(meta["speech"][0]), float(meta["speech"][1])), words, a.timing)


def _remove_stale(project: Project, sid: str, keep: Optional[Path]) -> None:
    for ext in ("mp3", "aiff", "wav"):
        p = project.tts_dir / f"{sid}.{ext}"
        if p.is_file() and (keep is None or p.resolve() != keep.resolve()):
            p.unlink()


def synthesize(project: Project, cfg: dict, sb: Storyboard, *, force: bool = False, log: Log = _print) -> dict[str, SentenceAudio]:
    """为所有句子准备音频，返回 {句子id: SentenceAudio}。"""
    engine = cfg["voice"]["engine"]
    out: dict[str, SentenceAudio] = {}
    todo: list[Sentence] = []
    ext_hash: dict[str, str] = {}
    cached_count = 0

    for s in sb.sentences:
        extra = None
        if engine == "external":
            f = _external_file(project, cfg, s.id)
            ext_hash[s.id] = sha256_file(f)
            extra = {"file": ext_hash[s.id]}
        key = cache_key(s, cfg, engine, extra)
        hit = None if force else _load_cached(project, s.id, key)
        if hit is not None:
            out[s.id] = hit
            cached_count += 1
        else:
            todo.append(s)

    if cached_count:
        log(f"配音缓存命中 {cached_count} 句")
    if not todo:
        return out

    if engine == "none":
        cps = cfg["voice"]["readingCharsPerSec"]
        for s in todo:
            dur = max(MIN_READING_SEC, display_width(s.text) / cps)
            a = SentenceAudio(s.id, "none", None, dur, (0.0, dur), None, "reading")
            out[s.id] = _save(project, a, cache_key(s, cfg, "none"))
        return out

    if engine == "external":
        for s in todo:
            f = _external_file(project, cfg, s.id)
            words, timing = _align_words(f, s, cfg)
            total, speech = _bounds(f, words)
            a = SentenceAudio(s.id, "external", f, total, speech, words, timing)
            out[s.id] = _save(project, a, cache_key(s, cfg, "external", {"file": ext_hash[s.id]}))
            log(f"  外部音频 {s.id}（{timing}）")
        return out

    failed: list[tuple[Sentence, BaseException]] = []
    if engine == "edge-tts":
        items = [(s, project.tts_dir / f"{s.id}.mp3") for s in todo]
        t0 = time.time()
        results = asyncio.run(_edge_batch(items, cfg, log))
        for s, path in items:
            r = results.get(s.id)
            if isinstance(r, tuple):
                data, words = r
                write_bytes(path, data)
                _remove_stale(project, s.id, keep=path)
                if not words:
                    words_opt, timing = None, "estimated"
                else:
                    words_opt, timing = words, "word"
                total, speech = _bounds(path, words_opt)
                a = SentenceAudio(s.id, "edge-tts", path, total, speech, words_opt, timing)
                out[s.id] = _save(project, a, cache_key(s, cfg, "edge-tts"))
            else:
                failed.append((s, r if isinstance(r, BaseException) else VPError("未知错误")))
        log(f"edge-tts 合成 {len(items) - len(failed)}/{len(items)} 句，用时 {time.time() - t0:.1f}s")
        if failed and cfg["voice"]["fallbackEngine"] != "say":
            detail = "\n  - ".join(f"{s.id}：{type(e).__name__}: {e}" for s, e in failed[:5])
            raise VPError(f"edge-tts 有 {len(failed)} 句合成失败（已重试 {cfg['voice']['retries']} 次）：\n  - {detail}")
        if failed and not shutil.which("say"):
            detail = "\n  - ".join(f"{s.id}：{type(e).__name__}: {e}" for s, e in failed[:5])
            raise VPError(
                f"edge-tts 有 {len(failed)} 句合成失败，降级引擎 say 只在 macOS 上可用：\n  - {detail}\n"
                "可稍后重试（已成功的句子有缓存），或改用 voice.engine=external 提供音频"
            )
        say_todo = [s for s, _ in failed]
        if say_todo:
            log(f"改用 say 合成 {len(say_todo)} 句（edge-tts 失败）")
    else:
        say_todo = todo

    for s in say_todo:
        path = project.tts_dir / f"{s.id}.aiff"
        _say(s, cfg, path)
        _remove_stale(project, s.id, keep=path)
        words, timing = _align_words(path, s, cfg)
        total, speech = _bounds(path, words)
        a = SentenceAudio(s.id, "say", path, total, speech, words, timing)
        # 降级产生的音频按 say 的参数记 key：下次 edge-tts 恢复后，key 不同会重新用 edge-tts 合成
        out[s.id] = _save(project, a, cache_key(s, cfg, "say") if engine == "say" else "fallback:" + cache_key(s, cfg, "say"))
        log(f"  配音 {s.id}（say，{timing}）")
    return out
