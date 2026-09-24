"""配音拼接与混音。

narration.wav：按时间轴把每句裁好的配音写到精确的采样位置（逐句解码为 PCM 后按起点写入，
不经过 concat/amix，没有累计误差，也不会被 amix 按输入数平均掉音量）。

mix.wav：narration 施加 gainDb → 可选 BGM（循环、淡入淡出、有人声时 sidechain 压低）→ 两遍 loudnorm。
Remotion 渲染时直接用 mix.wav 作为整片音轨。
"""
from __future__ import annotations

import wave
from pathlib import Path
from typing import Optional

from .errors import VPError
from .jsonutil import sha256_file, sha256_json
from .media import decode_pcm, ffmpeg, loudnorm_filter, measure_loudnorm
from .paths import Project, resolve_in_project

SAMPLE_BYTES = 2


def narration_signature(placements: list[dict], cfg: dict, total_sec: float) -> str:
    rows = [
        {"f": sha256_file(p["file"]), "a": round(p["clipStart"], 5), "b": round(p["clipEnd"], 5), "t": round(p["start"], 5)}
        for p in placements
    ]
    return sha256_json({"rows": rows, "sr": cfg["audio"]["sampleRate"], "ch": cfg["audio"]["channels"], "total": round(total_sec, 5)})


def write_narration(placements: list[dict], out: Path, *, sample_rate: int, channels: int, total_sec: float) -> None:
    frame_bytes = SAMPLE_BYTES * channels
    total_frames = int(round(total_sec * sample_rate))
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_name(out.stem + ".tmp.wav")
    written = 0  # 已写出的采样帧数
    with wave.open(str(tmp), "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(SAMPLE_BYTES)
        w.setframerate(sample_rate)
        for p in sorted(placements, key=lambda r: r["start"]):
            pcm = decode_pcm(p["file"], sample_rate, channels)
            a = int(round(p["clipStart"] * sample_rate))
            b = int(round(p["clipEnd"] * sample_rate))
            chunk = pcm[a * frame_bytes: b * frame_bytes]
            at = int(round(p["start"] * sample_rate))
            if at < written:
                # 起点已被上一句占用（只可能是舍入造成的 1 个采样以内的重叠），截掉重叠部分
                skip = written - at
                if skip * frame_bytes >= len(chunk):
                    continue
                chunk = chunk[skip * frame_bytes:]
                at = written
            if at > written:
                w.writeframes(b"\x00" * ((at - written) * frame_bytes))
                written = at
            w.writeframes(chunk)
            written += len(chunk) // frame_bytes
        if written > total_frames:
            raise VPError(f"配音总长 {written / sample_rate:.2f}s 超出时间轴 {total_sec:.2f}s，时间轴与配音不一致")
        if total_frames > written:
            w.writeframes(b"\x00" * ((total_frames - written) * frame_bytes))
    tmp.replace(out)


def write_silence(out: Path, *, sample_rate: int, channels: int, total_sec: float) -> None:
    write_narration([], out, sample_rate=sample_rate, channels=channels, total_sec=total_sec)


def mix_signature(project: Project, cfg: dict, narration_sig: str, total_sec: float) -> str:
    a = cfg["audio"]
    bgm = a["bgm"]
    bgm_hash = None
    if bgm["file"]:
        bgm_hash = sha256_file(resolve_in_project(project, bgm["file"], what="audio.bgm.file"))
    return sha256_json({
        "narration": narration_sig, "gain": a["gainDb"], "loud": a["loudness"], "bgm": bgm, "bgmHash": bgm_hash,
        "sr": a["sampleRate"], "ch": a["channels"], "total": round(total_sec, 5), "v": 2,
    })


def _bgm_chain(bgm: dict, total_sec: float) -> str:
    parts = [f"atrim=0:{total_sec:.6f}", "asetpts=PTS-STARTPTS", f"volume={bgm['volumeDb']}dB"]
    if bgm["fadeInSec"] > 0:
        parts.append(f"afade=t=in:st=0:d={bgm['fadeInSec']}")
    if bgm["fadeOutSec"] > 0:
        parts.append(f"afade=t=out:st={max(0.0, total_sec - bgm['fadeOutSec']):.6f}:d={bgm['fadeOutSec']}")
    return ",".join(parts)


def write_mix(project: Project, cfg: dict, narration: Path, out: Path, *, total_sec: float, has_voice: bool) -> None:
    a = cfg["audio"]
    sr, ch = a["sampleRate"], a["channels"]
    bgm = a["bgm"]
    fmt = f"aformat=sample_fmts=fltp:sample_rates={sr}:channel_layouts={'stereo' if ch == 2 else 'mono'}"

    inputs = ["-i", str(narration)]
    if bgm["file"]:
        bgm_path = resolve_in_project(project, bgm["file"], what="audio.bgm.file")
        if not bgm_path.is_file():
            raise VPError(f"找不到 BGM：{bgm['file']}")
        if bgm["loop"]:
            inputs = inputs + ["-stream_loop", "-1", "-i", str(bgm_path)]
        else:
            inputs = inputs + ["-i", str(bgm_path)]

    graph: list[str] = [f"[0:a]{fmt},volume={a['gainDb']}dB[voice]"]
    if bgm["file"]:
        graph.append(f"[1:a]{fmt},{_bgm_chain(bgm, total_sec)},apad=whole_dur={total_sec:.6f}[bgm]")
        if bgm["duck"] and has_voice:
            graph.append("[voice]asplit=2[v1][vsc]")
            graph.append(f"[bgm][vsc]sidechaincompress=threshold=0.02:ratio={bgm['duckRatio']}:attack=20:release=400[ducked]")
            voice_label, bgm_label = "[v1]", "[ducked]"
        else:
            voice_label, bgm_label = "[voice]", "[bgm]"
        pan = "stereo|c0=c0+c2|c1=c1+c3" if ch == 2 else "mono|c0=c0+c1"
        graph.append(f"{voice_label}{bgm_label}amerge=inputs=2,pan={pan}[mixed]")
        last = "[mixed]"
    else:
        last = "[voice]"
    graph.append(f"{last}atrim=0:{total_sec:.6f},asetpts=PTS-STARTPTS[pre]")

    out.parent.mkdir(parents=True, exist_ok=True)
    work = out.with_name(out.stem + ".pre.wav")
    ffmpeg(
        ["-y", *inputs, "-filter_complex", ";".join(graph), "-map", "[pre]", "-ar", str(sr), "-ac", str(ch), "-c:a", "pcm_s16le", str(work)],
        what="混音",
    )

    loud = a["loudness"]
    final_filter = ""
    if loud["enabled"] and has_voice:
        measured = measure_loudnorm(work, loud["targetLufs"], loud["truePeakDb"], loud["lra"])
        final_filter = loudnorm_filter(measured, loud["targetLufs"], loud["truePeakDb"], loud["lra"])
    tmp = out.with_name(out.stem + ".tmp.wav")
    args = ["-y", "-i", str(work)]
    if final_filter:
        args += ["-af", final_filter]
    args += ["-ar", str(sr), "-ac", str(ch), "-c:a", "pcm_s16le", "-t", f"{total_sec:.6f}", str(tmp)]
    ffmpeg(args, what="响度标准化")
    tmp.replace(out)
    work.unlink(missing_ok=True)


def footage_audio_filter(cfg: dict, source: Path) -> Optional[str]:
    """footage 模式：gainDb + 两遍 loudnorm；都不需要时返回 None（音轨直接复制）。"""
    a = cfg["audio"]
    loud = a["loudness"]
    pre = f"volume={a['gainDb']}dB" if a["gainDb"] else ""
    if not loud["enabled"]:
        return pre or None
    measured = measure_loudnorm(source, loud["targetLufs"], loud["truePeakDb"], loud["lra"], pre_filter=pre)
    ln = loudnorm_filter(measured, loud["targetLufs"], loud["truePeakDb"], loud["lra"])
    chain = ",".join(x for x in (pre, ln) if x)
    return chain or None
