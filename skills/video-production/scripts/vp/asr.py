"""语音识别（whisper）：词级时间戳。支持 faster-whisper 与 openai-whisper，按需加载。"""
from __future__ import annotations

import importlib.util
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .errors import VPError
from .timing import Word

_MODELS: dict[tuple[str, str], object] = {}


@dataclass
class Segment:
    start: float
    end: float
    text: str
    words: list[Word] = field(default_factory=list)


def available_backend(preference: str = "auto") -> Optional[str]:
    """返回可用的后端名；没有就返回 None。"""
    has_fw = importlib.util.find_spec("faster_whisper") is not None
    has_ow = importlib.util.find_spec("whisper") is not None
    if preference == "faster-whisper":
        return "faster-whisper" if has_fw else None
    if preference == "openai-whisper":
        return "openai-whisper" if has_ow else None
    if has_fw:
        return "faster-whisper"
    if has_ow:
        return "openai-whisper"
    return None


def require_backend(preference: str) -> str:
    b = available_backend(preference)
    if b is None:
        want = {"faster-whisper": "pip install faster-whisper", "openai-whisper": "pip install openai-whisper"}.get(
            preference, "pip install faster-whisper（或 openai-whisper）"
        )
        raise VPError(f"没有可用的 whisper：{want}")
    return b


def _load(backend: str, model: str):
    key = (backend, model)
    if key in _MODELS:
        return _MODELS[key]
    if backend == "faster-whisper":
        from faster_whisper import WhisperModel  # type: ignore

        m = WhisperModel(model, device="auto", compute_type="default")
    else:
        import whisper  # type: ignore

        m = whisper.load_model(model)
    _MODELS[key] = m
    return m


def transcribe(path: Path, asr_cfg: dict, *, initial_prompt: Optional[str] = None) -> list[Segment]:
    backend = require_backend(asr_cfg["engine"])
    model = _load(backend, asr_cfg["model"])
    prompt = initial_prompt if initial_prompt is not None else (asr_cfg["initialPrompt"] or None)
    lang = asr_cfg["language"]
    out: list[Segment] = []
    if backend == "faster-whisper":
        segments, _info = model.transcribe(  # type: ignore[attr-defined]
            str(path), language=lang, initial_prompt=prompt, word_timestamps=True, vad_filter=False,
        )
        for seg in segments:
            words = [Word(w.word.strip(), float(w.start), float(w.end)) for w in (seg.words or []) if w.word.strip()]
            out.append(Segment(float(seg.start), float(seg.end), seg.text.strip(), words))
    else:
        result = model.transcribe(  # type: ignore[attr-defined]
            str(path), language=lang, initial_prompt=prompt, word_timestamps=True, verbose=None,
        )
        for seg in result.get("segments", []):
            words = [
                Word(str(w["word"]).strip(), float(w["start"]), float(w["end"]))
                for w in seg.get("words", []) if str(w.get("word", "")).strip()
            ]
            out.append(Segment(float(seg["start"]), float(seg["end"]), str(seg["text"]).strip(), words))
    return out


def all_words(segments: list[Segment]) -> list[Word]:
    return [w for s in segments for w in s.words]
