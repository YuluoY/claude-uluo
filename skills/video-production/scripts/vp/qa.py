"""验收：成片参数、声画字对应、响度、黑帧、长时间静止，抽帧，写 qa/report.md 与 qa/report.json。

错误（errors）表示成片不符合配置或时间轴自相矛盾，必须修；警告（warnings）需要人看一眼判断是否有意为之。
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional

from . import captions as cap_mod
from .config import load_project_config
from .errors import VPError
from .jsonutil import load_json, write_json, write_text
from .media import detect_black, detect_freeze, extract_frame, integrated_loudness, video_info
from .paths import Project
from .timing import Token

CODEC_NAMES = {"h264": "h264", "h265": "hevc", "vp9": "vp9", "prores": "prores"}


def _fmt(t: float) -> str:
    m, s = divmod(max(0.0, t), 60)
    return f"{int(m):02d}:{s:05.2f}"


def _overlapping_shots(timeline: Optional[dict], a: float, b: float) -> str:
    if not timeline:
        return ""
    ids = [sh["id"] for sh in timeline.get("shots", []) if sh["start"] < b and sh["end"] > a]
    return f"（镜头 {', '.join(ids)}）" if ids else ""


def _sentence_checks(project: Project, cfg: dict, timeline: dict, errors: list[str], warnings: list[str]) -> None:
    """时间轴与字幕的一致性：声（句子时间）、画（镜头区间）、字（字幕块）。"""
    shots = timeline["shots"]
    total = timeline["durationInFrames"]
    prev_end = 0
    for i, sh in enumerate(shots):
        if sh["durationInFrames"] < 1:
            errors.append(f"镜头 {sh['id']} 时长为 0 帧")
        if sh["from"] != prev_end:
            errors.append(f"镜头 {sh['id']} 起点 {sh['from']} 与上一镜终点 {prev_end} 不相接")
        prev_end = sh["from"] + sh["durationInFrames"]
    if shots and prev_end != total:
        errors.append(f"镜头总长 {prev_end} 帧与全片 {total} 帧不一致")
    shot_range = {sh["id"]: (sh["from"], sh["from"] + sh["durationInFrames"]) for sh in shots}
    last_end = -1.0
    for s in timeline["sentences"]:
        a, b = shot_range.get(s["shotId"], (None, None))
        if a is None:
            errors.append(f"句子 {s['id']} 所属镜头 {s['shotId']} 不存在")
            continue
        if not (a <= s["startFrame"] and s["endFrame"] <= b):
            errors.append(f"句子 {s['id']} 的口播（{s['startFrame']}–{s['endFrame']} 帧）超出所属镜头 {s['shotId']} 的画面（{a}–{b} 帧）")
        if s["start"] < last_end - 1e-6:
            errors.append(f"句子 {s['id']} 与上一句的口播重叠")
        last_end = s["end"]
        if s["timing"] == "estimated" and cfg["voice"]["engine"] != "none":
            warnings.append(f"句子 {s['id']} 字幕时间是按字数估算的（没有可靠的词级时间），留意字幕是否跟得上口播")
        for w in s.get("unmatchedWords", [])[:3]:
            warnings.append(f"句子 {s['id']}：识别/合成出的词“{w}”在朗读文本里没对上")

    if not cfg["captions"]["enabled"]:
        return
    cap = load_json(project.captions_json) if project.captions_json.is_file() else None
    if cap is None:
        errors.append("缺少 captions/captions.json")
        return
    sents = [cap_mod.CapSentence(s["id"], s["text"], [Token.from_json(t) for t in s["tokens"]]) for s in timeline["sentences"]]
    errors.extend(cap_mod.check_blocks(cap["blocks"], sents, cfg["captions"]))
    sent_range = {s["id"]: (s["startFrame"], s["endFrame"]) for s in timeline["sentences"]}
    for b in cap["blocks"]:
        r = sent_range.get(b["sentenceId"])
        if r is None:
            errors.append(f"字幕 {b['id']} 属于不存在的句子 {b['sentenceId']}")
            continue
        linger_frames = int(round((cfg["captions"]["lingerSec"] + cfg["captions"]["minDurationSec"]) * timeline["fps"])) + 1
        if b["startFrame"] < r[0] or b["endFrame"] > r[1] + linger_frames:
            errors.append(f"字幕 {b['id']}（{b['startFrame']}–{b['endFrame']} 帧）落在句子 {b['sentenceId']} 的口播（{r[0]}–{r[1]} 帧）之外")


def run(project: Project, video: Optional[Path] = None, *, preview: bool = False) -> dict:
    cfg = load_project_config(project.config_path)
    errors: list[str] = []
    warnings: list[str] = []
    info_rows: dict = {}

    timeline = load_json(project.timeline_path) if (cfg["mode"] == "produce" and project.timeline_path.is_file()) else None
    if cfg["mode"] == "produce":
        if timeline is None:
            raise VPError("缺少 timeline.json，先运行 vp.py build")
        _sentence_checks(project, cfg, timeline, errors, warnings)

    if video is None:
        from .pipeline import output_path

        video = output_path(project, cfg, preview)
    if not video.is_file():
        raise VPError(f"找不到成片：{project.rel(video)}（先运行 vp.py render{' --preview' if preview else ''}）")

    vi = video_info(video)
    info_rows["file"] = project.rel(video)
    info_rows["video"] = {"codec": vi.codec, "size": f"{vi.width}x{vi.height}", "fps": round(vi.fps, 3), "pixFmt": vi.pix_fmt, "colorRange": vi.color_range, "durationSec": round(vi.duration, 3)}
    info_rows["audio"] = {"codec": vi.audio_codec, "sampleRate": vi.sample_rate, "channels": vi.channels} if vi.has_audio else None
    v = cfg["video"]

    if cfg["mode"] == "produce":
        want_codec = CODEC_NAMES[v["codec"]] if not preview else "h264"
        if vi.codec != want_codec:
            errors.append(f"视频编码是 {vi.codec}，配置要求 {want_codec}")
        if not preview:
            if (vi.width, vi.height) != (v["width"], v["height"]):
                errors.append(f"分辨率是 {vi.width}x{vi.height}，配置要求 {v['width']}x{v['height']}")
            if v["codec"] != "prores" and vi.pix_fmt != v["pixelFormat"]:
                errors.append(f"像素格式是 {vi.pix_fmt}，配置要求 {v['pixelFormat']}")
            if v["colorSpace"] == "bt709" and vi.color_range not in ("tv", "unknown"):
                errors.append(f"色彩范围是 {vi.color_range}（全范围），配置 colorSpace=bt709 应为 tv（有限范围）")
            if abs(vi.duration - timeline["durationSec"]) > 1.5 / v["fps"] + 0.05:
                errors.append(f"时长 {vi.duration:.3f}s 与时间轴 {timeline['durationSec']:.3f}s 不一致")
        if abs(vi.fps - v["fps"]) > 0.01:
            errors.append(f"帧率是 {vi.fps:.3f}，配置要求 {v['fps']}")
        has_audio_track = timeline is not None and any(s.get("audio") for s in timeline["sentences"]) or bool(cfg["audio"]["bgm"]["file"])
        if has_audio_track and not vi.has_audio:
            errors.append("成片没有音轨")
        if vi.has_audio and vi.sample_rate and vi.sample_rate != cfg["audio"]["sampleRate"]:
            warnings.append(f"音频采样率是 {vi.sample_rate}，配置为 {cfg['audio']['sampleRate']}")
    else:
        from .footage import source_path

        src = video_info(source_path(project, cfg))
        if not preview:
            if (vi.width, vi.height) != (src.width, src.height):
                errors.append(f"分辨率 {vi.width}x{vi.height} 与源视频 {src.width}x{src.height} 不一致")
            if abs(vi.duration - src.duration) > 0.2:
                errors.append(f"时长 {vi.duration:.2f}s 与源视频 {src.duration:.2f}s 不一致")
        if src.has_audio and not vi.has_audio:
            errors.append("源视频有音轨，成片却没有")

    c = cfg["captions"]
    if c["enabled"] and c["render"] in ("soft", "both") and not preview and cfg["mode"] == "footage":
        if not vi.subtitle_codecs:
            errors.append("配置要求软字幕，成片里没有字幕轨")

    loud = cfg["audio"]["loudness"]
    if vi.has_audio and loud["enabled"] and not preview:
        lufs = integrated_loudness(video)
        info_rows["loudnessLufs"] = lufs
        if lufs is not None and abs(lufs - loud["targetLufs"]) > cfg["qa"]["loudnessToleranceLu"]:
            warnings.append(f"整体响度 {lufs:.1f} LUFS，目标 {loud['targetLufs']} LUFS（允许 ±{cfg['qa']['loudnessToleranceLu']}）")

    q = cfg["qa"]
    blacks = detect_black(video, q["blackMinSec"], q["blackPixelThreshold"])
    for a, b in blacks:
        warnings.append(f"黑屏 {_fmt(a)}–{_fmt(b)}{_overlapping_shots(timeline, a, b)}：确认是否有意为之")
    freezes = detect_freeze(video, q["freezeWarnSec"])
    for a, b in freezes:
        warnings.append(f"画面静止 {b - a:.1f}s（{_fmt(a)}–{_fmt(b)}）{_overlapping_shots(timeline, a, b)}：讲解中长时间不动容易走神，考虑加入随口播推进的变化")

    stills: list[str] = []
    if q["stills"] and timeline and not preview:
        for sh in timeline["shots"]:
            mid = (sh["start"] + sh["end"]) / 2
            out = project.renders_dir / "stills" / "final" / f"{sh['id']}.jpg"
            extract_frame(video, mid, out)
            stills.append(project.rel(out))
    info_rows["stills"] = stills

    report = {
        "ok": not errors,
        "checkedAt": datetime.now().isoformat(timespec="seconds"),
        "preview": preview,
        "errors": errors,
        "warnings": warnings,
        "info": info_rows,
    }
    write_json(project.qa_dir / ("report.preview.json" if preview else "report.json"), report)
    write_text(project.qa_dir / ("report.preview.md" if preview else "report.md"), render_md(report))
    return report


def render_md(r: dict) -> str:
    lines = [f"# 验收报告{'（预览）' if r['preview'] else ''}", "", f"- 时间：{r['checkedAt']}", f"- 文件：{r['info'].get('file')}"]
    vi = r["info"].get("video") or {}
    lines.append(f"- 视频：{vi.get('codec')} {vi.get('size')} {vi.get('fps')}fps {vi.get('pixFmt')}，{vi.get('durationSec')}s")
    au = r["info"].get("audio")
    lines.append(f"- 音频：{au['codec']} {au['sampleRate']}Hz {au['channels']}ch" if au else "- 音频：无")
    if r["info"].get("loudnessLufs") is not None:
        lines.append(f"- 响度：{r['info']['loudnessLufs']:.1f} LUFS")
    lines.append(f"- 结论：{'通过' if r['ok'] else '不通过'}（{len(r['errors'])} 个错误，{len(r['warnings'])} 个警告）")
    lines.append("")
    lines.append("## 错误")
    lines += [f"- {e}" for e in r["errors"]] or ["- 无"]
    lines.append("")
    lines.append("## 警告")
    lines += [f"- {w}" for w in r["warnings"]] or ["- 无"]
    if r["info"].get("stills"):
        lines += ["", "## 抽帧（每个镜头中点）", ""]
        lines += [f"- {p}" for p in r["info"]["stills"]]
    return "\n".join(lines) + "\n"
