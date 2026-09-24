"""ffmpeg / ffprobe 的薄封装：探测、解码、静音检测、响度测量、黑帧与静止检测、抽帧。"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Sequence

from .errors import VPError

_FLOAT = r"(-?[0-9]+(?:\.[0-9]+)?(?:e[-+]?[0-9]+)?)"


def require_tool(name: str, hint: str = "") -> str:
    path = shutil.which(name)
    if not path:
        raise VPError(f"找不到 {name}。{hint or '请先安装后重试。'}")
    return path


def ffmpeg_bin() -> str:
    return require_tool("ffmpeg", "macOS：brew install ffmpeg；Ubuntu：apt install ffmpeg")


def ffprobe_bin() -> str:
    return require_tool("ffprobe", "ffprobe 随 ffmpeg 一起安装")


def run(cmd: Sequence[str], *, what: str, input_bytes: Optional[bytes] = None, capture: bool = True) -> subprocess.CompletedProcess:
    """运行命令；失败时把 stderr 末尾附进错误信息。"""
    try:
        proc = subprocess.run(
            list(cmd),
            input=input_bytes,
            stdout=subprocess.PIPE if capture else None,
            stderr=subprocess.PIPE if capture else None,
            check=False,
        )
    except FileNotFoundError:
        raise VPError(f"{what}失败：找不到可执行文件 {cmd[0]}") from None
    if proc.returncode != 0:
        tail = ""
        if capture and proc.stderr:
            tail = "\n" + "\n".join(proc.stderr.decode("utf-8", "replace").strip().splitlines()[-15:])
        raise VPError(f"{what}失败（退出码 {proc.returncode}）：{' '.join(map(str, cmd[:6]))} …{tail}")
    return proc


def ffmpeg(args: Sequence[str], *, what: str, input_bytes: Optional[bytes] = None) -> subprocess.CompletedProcess:
    return run([ffmpeg_bin(), "-hide_banner", "-nostdin", *args], what=what, input_bytes=input_bytes)


def stderr_text(proc: subprocess.CompletedProcess) -> str:
    return (proc.stderr or b"").decode("utf-8", "replace")


# ---------- 探测 ----------

@dataclass
class VideoInfo:
    width: int
    height: int
    fps: float
    fps_fraction: str
    duration: float
    codec: str
    pix_fmt: str
    color_range: str
    has_audio: bool
    audio_codec: Optional[str]
    sample_rate: Optional[int]
    channels: Optional[int]
    subtitle_codecs: list[str]


def probe(path: Path) -> dict:
    proc = run(
        [ffprobe_bin(), "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        what=f"探测 {path}",
    )
    try:
        return json.loads(proc.stdout.decode("utf-8", "replace"))
    except json.JSONDecodeError:
        raise VPError(f"ffprobe 输出无法解析：{path}") from None


def duration_of(path: Path) -> float:
    info = probe(path)
    fmt_dur = info.get("format", {}).get("duration")
    if fmt_dur is not None:
        return float(fmt_dur)
    for s in info.get("streams", []):
        if s.get("duration") is not None:
            return float(s["duration"])
    raise VPError(f"无法获得时长：{path}")


def parse_fraction(text: str) -> float:
    if "/" in text:
        num, den = text.split("/", 1)
        d = float(den)
        return float(num) / d if d else 0.0
    return float(text)


def video_info(path: Path) -> VideoInfo:
    info = probe(path)
    streams = info.get("streams", [])
    v = next((s for s in streams if s.get("codec_type") == "video" and not s.get("disposition", {}).get("attached_pic")), None)
    if v is None:
        raise VPError(f"{path} 里没有视频流")
    a = next((s for s in streams if s.get("codec_type") == "audio"), None)
    subs = [s.get("codec_name", "") for s in streams if s.get("codec_type") == "subtitle"]
    rate = v.get("avg_frame_rate") or v.get("r_frame_rate") or "0/1"
    if parse_fraction(rate) <= 0:
        rate = v.get("r_frame_rate") or "0/1"
    dur = info.get("format", {}).get("duration") or v.get("duration") or 0
    return VideoInfo(
        width=int(v["width"]),
        height=int(v["height"]),
        fps=parse_fraction(rate),
        fps_fraction=rate,
        duration=float(dur),
        codec=v.get("codec_name", ""),
        pix_fmt=v.get("pix_fmt", ""),
        color_range=v.get("color_range", "unknown"),
        has_audio=a is not None,
        audio_codec=a.get("codec_name") if a else None,
        sample_rate=int(a["sample_rate"]) if a and a.get("sample_rate") else None,
        channels=int(a["channels"]) if a and a.get("channels") else None,
        subtitle_codecs=subs,
    )


# ---------- 音频 ----------

def decode_pcm(path: Path, sample_rate: int, channels: int) -> bytes:
    """解码为 s16le 交错 PCM（整段读入内存；用于单句配音，长度有限）。"""
    proc = ffmpeg(
        ["-i", str(path), "-vn", "-f", "s16le", "-acodec", "pcm_s16le", "-ar", str(sample_rate), "-ac", str(channels), "-"],
        what=f"解码 {path.name}",
    )
    return proc.stdout


def speech_bounds(path: Path, *, noise_db: float = -45.0, min_silence: float = 0.08) -> tuple[float, float, float]:
    """返回（有声起点, 有声终点, 文件时长）。整段静音时起终点都为 0。"""
    proc = ffmpeg(
        ["-i", str(path), "-vn", "-af", f"silencedetect=noise={noise_db}dB:d={min_silence}", "-f", "null", "-"],
        what=f"静音检测 {path.name}",
    )
    text = stderr_text(proc)
    total = duration_of(path)
    starts = [float(x) for x in re.findall(r"silence_start: " + _FLOAT, text)]
    ends = [float(x) for x in re.findall(r"silence_end: " + _FLOAT, text)]
    intervals: list[tuple[float, float]] = []
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else total
        intervals.append((max(0.0, s), min(total, e)))
    head = 0.0
    tail = total
    if intervals and intervals[0][0] <= 0.02:
        head = intervals[0][1]
    if intervals and intervals[-1][1] >= total - 0.02:
        tail = intervals[-1][0]
    if tail <= head:
        return 0.0, 0.0, total
    return head, tail, total


def mean_volume_db(path: Path) -> Optional[float]:
    proc = ffmpeg(["-i", str(path), "-vn", "-af", "volumedetect", "-f", "null", "-"], what=f"音量探测 {path.name}")
    m = re.search(r"mean_volume: " + _FLOAT + " dB", stderr_text(proc))
    return float(m.group(1)) if m else None


def measure_loudnorm(path: Path, target_i: float, target_tp: float, target_lra: float, pre_filter: str = "") -> dict:
    """loudnorm 第一遍：测量。返回 input_i / input_tp / input_lra / input_thresh / target_offset。"""
    chain = (pre_filter + "," if pre_filter else "") + f"loudnorm=I={target_i}:TP={target_tp}:LRA={target_lra}:print_format=json"
    proc = ffmpeg(["-i", str(path), "-vn", "-af", chain, "-f", "null", "-"], what=f"响度测量 {path.name}")
    text = stderr_text(proc)
    start = text.rfind("{")
    end = text.rfind("}")
    if start < 0 or end < start:
        raise VPError(f"loudnorm 没有输出测量结果：{path}")
    try:
        data = json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        raise VPError(f"loudnorm 测量结果无法解析：{path}") from None
    return data


def loudnorm_filter(measured: dict, target_i: float, target_tp: float, target_lra: float) -> str:
    """loudnorm 第二遍的滤镜串（linear 模式）。测得的值为 -inf（整段静音）时返回空串，表示跳过。"""
    keys = ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset")
    vals = {}
    for k in keys:
        v = str(measured.get(k, ""))
        if v in ("", "-inf", "inf", "nan"):
            return ""
        vals[k] = v
    return (
        f"loudnorm=I={target_i}:TP={target_tp}:LRA={target_lra}"
        f":measured_I={vals['input_i']}:measured_TP={vals['input_tp']}:measured_LRA={vals['input_lra']}"
        f":measured_thresh={vals['input_thresh']}:offset={vals['target_offset']}:linear=true"
    )


def integrated_loudness(path: Path) -> Optional[float]:
    proc = ffmpeg(["-i", str(path), "-vn", "-af", "ebur128=framelog=quiet", "-f", "null", "-"], what=f"响度统计 {path.name}")
    text = stderr_text(proc)
    m = re.findall(r"I:\s+" + _FLOAT + r" LUFS", text)
    return float(m[-1]) if m else None


# ---------- 视频检测 ----------

def detect_black(path: Path, min_sec: float, pix_th: float) -> list[tuple[float, float]]:
    proc = ffmpeg(
        ["-i", str(path), "-an", "-vf", f"blackdetect=d={min_sec}:pix_th={pix_th}", "-f", "null", "-"],
        what="黑帧检测",
    )
    out = []
    for m in re.finditer(r"black_start:" + _FLOAT + r" black_end:" + _FLOAT, stderr_text(proc)):
        out.append((float(m.group(1)), float(m.group(2))))
    return out


def detect_freeze(path: Path, min_sec: float) -> list[tuple[float, float]]:
    proc = ffmpeg(
        ["-i", str(path), "-an", "-vf", f"freezedetect=n=-60dB:d={min_sec}", "-f", "null", "-"],
        what="静止画面检测",
    )
    text = stderr_text(proc)
    starts = [float(x) for x in re.findall(r"freeze_start: " + _FLOAT, text)]
    ends = [float(x) for x in re.findall(r"freeze_end: " + _FLOAT, text)]
    dur = None
    out = []
    for i, s in enumerate(starts):
        if i < len(ends):
            out.append((s, ends[i]))
        else:
            if dur is None:
                dur = duration_of(path)
            out.append((s, dur))
    return out


def extract_frame(video: Path, at_sec: float, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg(
        ["-y", "-ss", f"{max(0.0, at_sec):.3f}", "-i", str(video), "-frames:v", "1", "-q:v", "3", str(out)],
        what=f"抽帧 {out.name}",
    )


def db_to_gain(db: float) -> float:
    return 10 ** (db / 20.0)
