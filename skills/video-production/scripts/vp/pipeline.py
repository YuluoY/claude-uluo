"""produce 模式的构建编排：分镜 → trace → 配音 → 时间轴 → 配音拼接/混音 → 字幕 → 生成数据与可读文件。

每一步按输入算签名，没变就跳过（配音按句缓存，混音按签名缓存），所以改哪里只重跑受影响的部分：
- 改口播文字/语速/音色：该句重新配音，之后的时间轴、混音、字幕都会更新
- 只改字幕样式或切分参数：不重新配音，不重新混音
- 只改画面（场景代码、风格）：不需要 build，直接 render
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from . import audio as audio_mod
from . import captions as cap_mod
from . import genres as genres_mod
from . import remotion as rm
from . import styles as styles_mod
from . import trace as trace_mod
from . import tts as tts_mod
from .config import load_project_config
from .errors import VPError
from .jsonutil import load_json, write_json, write_text
from .media import duration_of
from .paths import Project, resolve_in_project
from .storyboard import Storyboard, check_traces, load_storyboard, render_script_md, scene_component_warnings
from .textproc import word_boundaries
from .timeline import audio_placements, build_timeline


def log_default(msg: str) -> None:
    print(msg, file=sys.stderr)


def load_state(project: Project) -> dict:
    if project.state_path.is_file():
        try:
            return load_json(project.state_path)
        except VPError:
            return {}
    return {}


def save_state(project: Project, state: dict) -> None:
    write_json(project.state_path, state)


def join_sentences(texts: list[str], language: str) -> str:
    sep = "" if language.split("-")[0] in ("zh", "ja", "ko") else " "
    return sep.join(t.strip() for t in texts if t.strip())


def render_transcript(title: str, language: str, paragraphs: list[tuple[Optional[str], list[str]]]) -> tuple[str, str]:
    """口播正文：md 按章节分标题，txt 只有段落。paragraphs = [(章节名或 None, [句子…])]。"""
    md = [f"# {title or '口播正文'}", ""]
    txt: list[str] = []
    last_chapter: object = object()
    for chapter, sents in paragraphs:
        body = join_sentences(sents, language)
        if not body:
            continue
        if chapter != last_chapter and chapter:
            md += [f"## {chapter}", ""]
        last_chapter = chapter
        md += [body, ""]
        txt += [body, ""]
    return "\n".join(md).rstrip() + "\n", "\n".join(txt).rstrip() + "\n"


def ensure_project_assets(project: Project, cfg: dict) -> dict:
    """确认主类型包已安装、风格可用；返回 settings 里的 themes。"""
    if cfg["genre"] not in genres_mod.installed(project):
        genres_mod.install(project, cfg["genre"])
    else:
        genres_mod.write_genre_index(project)
    themes = styles_mod.load_all(project)
    if cfg["style"] not in themes:
        raise VPError(f"找不到风格 {cfg['style']}。可选：{', '.join(sorted(themes))}")
    return themes


def check(project: Project, *, log=log_default) -> dict:
    """只校验，不合成：配置、分镜、场景注册、素材文件；并生成 script.md 供确认口播稿。"""
    cfg = load_project_config(project.config_path)
    if cfg["mode"] != "produce":
        raise VPError("check 用于 produce 模式；footage 模式请用 vp.py asr / build")
    ensure_project_assets(project, cfg)
    sb = load_storyboard(project, cfg)
    warnings = scene_component_warnings(project, sb)
    if cfg["audio"]["bgm"]["file"]:
        p = resolve_in_project(project, cfg["audio"]["bgm"]["file"], what="audio.bgm.file")
        if not p.is_file():
            raise VPError(f"找不到 BGM：{cfg['audio']['bgm']['file']}")
    old_tl = load_json(project.timeline_path) if project.timeline_path.is_file() else None
    write_text(project.script_md, render_script_md(sb, cfg, _timeline_if_current(old_tl, sb)))
    return {"shots": len(sb.shots), "sentences": len(sb.sentences), "warnings": warnings}


def _timeline_if_current(tl: Optional[dict], sb: Storyboard) -> Optional[dict]:
    """旧时间轴里的句子与当前分镜完全对得上时才用它的时间。"""
    if not tl:
        return None
    ids = [s["id"] for s in tl.get("sentences", [])]
    texts = [s["text"] for s in tl.get("sentences", [])]
    if ids == [s.id for s in sb.sentences] and texts == [s.text for s in sb.sentences]:
        return tl
    return None


def build(project: Project, *, force_tts: bool = False, force_traces: bool = False, log=log_default) -> dict:
    cfg = load_project_config(project.config_path)
    if cfg["mode"] != "produce":
        raise VPError("build 的 produce 流程只用于 mode=produce")
    themes = ensure_project_assets(project, cfg)
    sb = load_storyboard(project, cfg)
    warnings = scene_component_warnings(project, sb)
    state = load_state(project)
    rerun: list[str] = []

    traces = trace_mod.run_all(project, force=force_traces, log=log)
    errs = check_traces(sb, {k: len(v["steps"]) for k, v in traces.items()})
    if errs:
        raise VPError("分镜与 trace 对不上：\n  - " + "\n  - ".join(errs))

    audios = tts_mod.synthesize(project, cfg, sb, force=force_tts, log=log)

    clip_durations: dict[str, float] = {}
    for sh in sb.shots:
        if sh.source.get("type") == "clip":
            f = resolve_in_project(project, sh.source["file"], base=project.public_dir, what=f"镜头 {sh.id} 的 clip")
            clip_durations[sh.source["file"]] = duration_of(f)

    has_voice = any(a.file is not None for a in audios.values())
    has_bgm = bool(cfg["audio"]["bgm"]["file"])
    audio_src = "audio/mix.wav" if (has_voice or has_bgm) else None
    tl = build_timeline(cfg, sb, audios, clip_durations=clip_durations, audio_src=audio_src)
    full, compact, placed = tl["full"], tl["compact"], tl["placed"]
    total_sec = full["durationInFrames"] / full["fps"]

    if audio_src:
        placements = audio_placements(placed)
        sr, ch = cfg["audio"]["sampleRate"], cfg["audio"]["channels"]
        nsig = audio_mod.narration_signature(placements, cfg, total_sec)
        if state.get("narration") != nsig or not project.narration_wav.is_file():
            audio_mod.write_narration(placements, project.narration_wav, sample_rate=sr, channels=ch, total_sec=total_sec)
            state["narration"] = nsig
            state.pop("mix", None)
            rerun.append("配音拼接")
        msig = audio_mod.mix_signature(project, cfg, nsig, total_sec)
        if state.get("mix") != msig or not project.mix_wav.is_file():
            audio_mod.write_mix(project, cfg, project.narration_wav, project.mix_wav, total_sec=total_sec, has_voice=has_voice)
            state["mix"] = msig
            rerun.append("混音")
    else:
        for p in (project.narration_wav, project.mix_wav):
            p.unlink(missing_ok=True)
        state.pop("narration", None)
        state.pop("mix", None)

    cap_sentences = [
        cap_mod.CapSentence(
            p.sentence.id, p.sentence.text, p.tokens,
            word_tokens=p.timing == "word",
            boundaries=None if p.timing == "word" else word_boundaries(p.sentence.text),
        )
        for p in sorted(placed.values(), key=lambda x: x.start)
    ]
    blocks = cap_mod.build_blocks(cap_sentences, cfg["captions"], cfg["video"]["fps"]) if cfg["captions"]["enabled"] else []
    cap_errs = cap_mod.check_blocks(blocks, cap_sentences, cfg["captions"]) if blocks else []
    if cap_errs:
        raise VPError("字幕校验失败：\n  - " + "\n  - ".join(cap_errs))

    name = cfg["render"]["outputName"]
    write_json(project.timeline_path, full)
    write_json(project.captions_json, {"version": 1, "fps": cfg["video"]["fps"], "blocks": blocks})
    if blocks:
        write_text(project.srt_path(name), cap_mod.to_srt(blocks))
    write_text(project.script_md, render_script_md(sb, cfg, full))
    paragraphs = [(sh.chapter, [s.text for s in sh.sentences]) for sh in sb.shots if sh.sentences]
    md, txt = render_transcript(cfg["title"], cfg["language"], paragraphs)
    write_text(project.transcript_md, md)
    write_text(project.transcript_txt, txt)

    rm.write_generated(project, "timeline", compact)
    rm.write_generated(project, "captions", {"blocks": [
        {"id": b["id"], "startFrame": b["startFrame"], "endFrame": b["endFrame"], "lines": b["lines"]} for b in blocks
    ]})
    rm.write_generated(project, "settings", rm.settings_payload(cfg, cfg["style"], themes))
    rm.write_generated(project, "traces", traces)

    save_state(project, state)
    timing_counts: dict[str, int] = {}
    for s in full["sentences"]:
        timing_counts[s["timing"]] = timing_counts.get(s["timing"], 0) + 1
    low = [s["id"] for s in full["sentences"] if s["timing"] == "estimated" and cfg["voice"]["engine"] != "none"]
    if low:
        warnings.append(f"{len(low)} 句没有可靠的词级时间，字幕按字数估算：{', '.join(low[:8])}{' …' if len(low) > 8 else ''}")
    return {
        "durationSec": round(total_sec, 2),
        "shots": len(sb.shots),
        "sentences": len(sb.sentences),
        "captions": len(blocks),
        "timing": timing_counts,
        "rerun": rerun,
        "warnings": warnings,
    }


def stills_frames(project: Project) -> list[tuple[str, int]]:
    """每个镜头取一帧：转场结束后、镜头结束前的中点。"""
    tl = rm.read_generated(project, "timeline")
    if not tl or not tl.get("shots"):
        raise VPError("还没有时间轴，先运行 vp.py build")
    out = []
    for sh in tl["shots"]:
        a = sh["from"] + sh["transition"]["durationInFrames"]
        b = sh["from"] + sh["durationInFrames"] - 1
        out.append((sh["id"], (a + max(a, b)) // 2))
    return out


def output_path(project: Project, cfg: dict, preview: bool) -> Path:
    from .config import container_for

    if preview:
        return project.renders_dir / "preview.mp4"
    return project.renders_dir / f"{cfg['render']['outputName']}.{container_for(cfg['video']['codec'])}"
