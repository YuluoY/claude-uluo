"""vp.py 命令行。所有命令都在项目目录内运行（或用 --project 指定），--json 输出机器可读结果到 stdout。"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Optional

from . import __version__
from .errors import VPError
from .paths import Project, find_project


def _log(msg: str) -> None:
    print(msg, file=sys.stderr)


def _project(args) -> Project:
    if args.project:
        return Project(Path(args.project)).require()
    return find_project(Path.cwd())


def _emit(args, data, human: Optional[str] = None) -> None:
    if getattr(args, "json", False):
        print(json.dumps(data, ensure_ascii=False, indent=2))
    elif human is not None:
        print(human)


def _warn_block(warnings: list[str]) -> str:
    return "\n".join(f"  ! {w}" for w in warnings)


# ---------- 命令 ----------

def cmd_init(args) -> int:
    from .project import init

    p = init(
        Path(args.dir), title=args.title, mode=args.mode, genre=args.genre, style=args.style, preset=args.preset,
        source=Path(args.source) if args.source else None, copy_source=not args.no_copy, force=args.force,
    )
    nxt = "写 brief.md 与 storyboard.json，然后 vp.py check" if args.mode == "produce" else "vp.py asr"
    _emit(args, {"project": str(p.root)}, f"已创建项目 {p.root}\n下一步：{nxt}")
    return 0


def cmd_check(args) -> int:
    from .pipeline import check

    r = check(_project(args), log=_log)
    human = f"分镜通过校验：{r['shots']} 个镜头，{r['sentences']} 句；已生成 script.md 供确认口播稿"
    if r["warnings"]:
        human += "\n" + _warn_block(r["warnings"])
    _emit(args, r, human)
    return 0


def _cfg(project: Project) -> dict:
    from .config import load_project_config

    return load_project_config(project.config_path)


def cmd_build(args) -> int:
    project = _project(args)
    cfg = _cfg(project)
    if cfg["mode"] == "footage":
        from .footage import build

        r = build(project, log=_log)
        human = f"字幕 {r['captions']} 块（{r['segments']} 段，时长 {r['durationSec']}s）；时间来源 {r['timing']}"
    else:
        from .pipeline import build

        r = build(project, force_tts=args.force_tts, force_traces=args.force_traces, log=_log)
        human = (
            f"时长 {r['durationSec']}s：{r['shots']} 个镜头、{r['sentences']} 句、{r['captions']} 块字幕；"
            f"字幕时间来源 {r['timing']}；本次重跑：{'、'.join(r['rerun']) or '无（都已是最新）'}"
        )
        if r["warnings"]:
            human += "\n" + _warn_block(r["warnings"])
    _emit(args, r, human)
    return 0


def cmd_tts(args) -> int:
    from .config import load_project_config
    from .storyboard import load_storyboard
    from .tts import synthesize

    project = _project(args)
    cfg = load_project_config(project.config_path)
    sb = load_storyboard(project, cfg)
    res = synthesize(project, cfg, sb, force=args.force, log=_log)
    rows = {sid: {"engine": a.engine, "timing": a.timing, "durationSec": round(a.duration, 3)} for sid, a in res.items()}
    _emit(args, rows, f"{len(res)} 句配音就绪")
    return 0


def cmd_trace(args) -> int:
    from .trace import run_all

    res = run_all(_project(args), force=args.force, log=_log)
    _emit(args, {k: len(v["steps"]) for k, v in res.items()}, "\n".join(f"{k}: {len(v['steps'])} 步" for k, v in res.items()) or "没有 trace（src/algo/<id>/trace.ts）")
    return 0


def cmd_asr(args) -> int:
    from .footage import asr

    r = asr(_project(args), force=args.force, log=_log)
    _emit(args, r, f"识别 {r['segments']} 段；校对 captions/transcript.proof.json 后运行 vp.py build")
    return 0


def cmd_setup(args) -> int:
    from .remotion import ensure_node_modules

    ensure_node_modules(_project(args), _log)
    _emit(args, {"ok": True}, "依赖已安装")
    return 0


def _prepare_styles(project: Project, cfg: dict, style_names: list[str]) -> None:
    """对比风格前：确认风格已进 settings（要先 build），并把这些风格的字体一起写进 fonts.ts。"""
    from . import remotion as rm
    from . import styles as st

    settings = rm.read_generated(project, "settings") or {}
    avail = set((settings.get("themes") or {}).keys())
    bad = [s for s in style_names if s not in avail]
    if bad:
        raise VPError(f"没有这些风格：{', '.join(bad)}（可选：{', '.join(sorted(avail))}；新加的风格要先 build）")
    themes = st.load_all(project)
    names = list(dict.fromkeys([cfg["style"], *style_names]))
    rm.write_fonts(project, [themes[n] for n in names])


def cmd_stills(args) -> int:
    from . import layoutaudit as la
    from . import remotion as rm
    from .pipeline import stills_frames

    project = _project(args)
    cfg = _cfg(project)
    if cfg["mode"] != "produce":
        raise VPError("stills 只用于 produce 模式")
    frames = stills_frames(project)
    if args.shots:
        want = set(args.shots.split(","))
        unknown = want - {sid for sid, _ in frames}
        if unknown:
            raise VPError(f"没有这些镜头：{', '.join(sorted(unknown))}")
        frames = [f for f in frames if f[0] in want]
    style_names = args.styles.split(",") if args.styles else [cfg["style"]]
    _prepare_styles(project, cfg, style_names)
    rm.ensure_node_modules(project, _log)
    produced: dict[str, list[str]] = {}
    layout: dict[str, list[dict]] = {}
    ids = [f"{sid}@still" for sid, _ in frames]
    for style in style_names:
        sub = "styles/" + style if args.styles else "current"
        out_dir = project.renders_dir / "stills" / sub
        shutil.rmtree(la.artifacts_dir(project), ignore_errors=True)
        files = rm.render_sequence(
            project, "Stills", out_dir, props={"frames": [f for _, f in frames], "style": style, "ids": ids},
            image_format="jpeg", prefix="still", scale=args.scale, frames=(0, len(frames) - 1),
        )
        if len(files) != len(frames):
            raise VPError(f"静帧数量 {len(files)} 与镜头数 {len(frames)} 不一致")
        named = []
        for (sid, _), f in zip(frames, files):
            dst = out_dir / f"{sid}.jpg"
            f.replace(dst)
            named.append(project.rel(dst))
        produced[style] = named
        layout[style] = la.rows_to_issues(la.collect(project, ids))
    lines = []
    for k, v in produced.items():
        lines.append(f"{k}: {len(v)} 张 → {Path(v[0]).parent if v else ''}；版面{'无问题' if not layout[k] else f'有 {len(layout[k])} 处问题'}")
        lines += [f"  x {la.describe(it)}（镜头 {it['shot']}）" for it in layout[k][:8]]
        if len(layout[k]) > 8:
            lines.append(f"  … 另有 {len(layout[k]) - 8} 处")
    _emit(args, {"stills": produced, "layout": layout}, "\n".join(lines))
    return 0


def cmd_layout(args) -> int:
    from . import layoutaudit as la

    project = _project(args)
    cfg = _cfg(project)
    if cfg["mode"] != "produce":
        raise VPError("layout 只用于 produce 模式（footage 只有字幕层）")
    if args.style:
        _prepare_styles(project, cfg, [args.style])
    r = la.run(project, style=args.style, log=_log)
    verdict = "通过" if r["ok"] else f"{len(r['issues'])} 处问题（见 qa/layout.md）"
    human = f"版面检测：{r['frames']} 帧，{verdict}"
    lines = la.summary_lines(r)
    if lines:
        human += "\n" + "\n".join(f"  x {x}" for x in lines)
    _emit(args, r, human)
    return 0 if r["ok"] else 1


def _parse_frames(text: Optional[str]) -> Optional[tuple[int, int]]:
    if not text:
        return None
    try:
        a, b = text.split("-", 1)
        fa, fb = int(a), int(b)
    except ValueError:
        raise VPError("--frames 格式为 起-止，如 0-299") from None
    if fa < 0 or fb < fa:
        raise VPError("--frames 区间不合法")
    return fa, fb


def cmd_render(args) -> int:
    from . import remotion as rm
    from .pipeline import output_path

    project = _project(args)
    cfg = _cfg(project)
    if cfg["mode"] == "footage":
        from .footage import build, render

        if not args.no_build:
            build(project, log=_log)
        out = render(project, preview=args.preview, log=_log)
    else:
        from .pipeline import build

        if not args.no_build:
            r = build(project, log=_log)
            for w in r["warnings"]:
                _log(f"  ! {w}")
        tl = rm.read_generated(project, "timeline")
        if not tl or not tl.get("shots"):
            raise VPError("时间轴为空，先运行 vp.py build")
        rm.ensure_node_modules(project, _log)
        if not args.preview and not args.skip_layout:
            from . import layoutaudit as la

            _log("版面检测（每个镜头的中点与最后一帧）…")
            lr = la.run(project, log=_log)
            if not lr["ok"]:
                raise VPError(
                    f"版面检测发现 {len(lr['issues'])} 处压盖/越界/溢出，先修好再渲染成片（详见 qa/layout.md；确认是误报可加 --skip-layout 跳过，验收报告里仍会列出）：\n  "
                    + "\n  ".join(la.summary_lines(lr))
                )
        frames = _parse_frames(args.frames)
        if args.preview and frames is None and cfg["render"]["preview"]["maxSeconds"]:
            last = min(tl["durationInFrames"], int(cfg["render"]["preview"]["maxSeconds"] * tl["fps"])) - 1
            frames = (0, max(0, last))
        out = output_path(project, cfg, args.preview)
        rm.render_video(project, cfg, out, preview=args.preview, frames=frames)
        c = cfg["captions"]
        if c["enabled"] and c["render"] in ("soft", "both") and not args.preview:
            _mux_soft_subs(project, cfg, out)
    result = {"output": project.rel(out)}
    human = f"已输出 {project.rel(out)}"
    if not args.preview and not args.skip_qa:
        from .qa import run as run_qa

        rep = run_qa(project, out)
        result["qa"] = {"ok": rep["ok"], "errors": rep["errors"], "warnings": rep["warnings"]}
        human += f"\n验收：{'通过' if rep['ok'] else '不通过'}（{len(rep['errors'])} 个错误，{len(rep['warnings'])} 个警告，见 qa/report.md）"
        _emit(args, result, human)
        return 0 if rep["ok"] else 1
    _emit(args, result, human)
    return 0


def _mux_soft_subs(project: Project, cfg: dict, video: Path) -> None:
    from .footage import _iso639_2
    from .media import ffmpeg

    srt = project.srt_path(cfg["render"]["outputName"])
    if not srt.is_file():
        raise VPError(f"找不到 {project.rel(srt)}")
    codec = {"mp4": "mov_text", "mov": "mov_text", "webm": "webvtt"}[video.suffix.lstrip(".")]
    tmp = video.with_name(video.stem + ".subs" + video.suffix)
    ffmpeg(
        ["-y", "-i", str(video), "-i", str(srt), "-map", "0", "-map", "1:s:0", "-c", "copy", "-c:s", codec,
         "-metadata:s:s:0", f"language={_iso639_2(cfg['language'])}", str(tmp)],
        what="封装软字幕",
    )
    tmp.replace(video)


def cmd_qa(args) -> int:
    from .qa import run

    project = _project(args)
    r = run(project, Path(args.video).resolve() if args.video else None, preview=args.preview)
    human = f"验收：{'通过' if r['ok'] else '不通过'}（{len(r['errors'])} 个错误，{len(r['warnings'])} 个警告）"
    for e in r["errors"]:
        human += f"\n  x {e}"
    for w in r["warnings"]:
        human += f"\n  ! {w}"
    _emit(args, r, human)
    return 0 if r["ok"] else 1


def cmd_cover(args) -> int:
    from .project import cover

    out = cover(_project(args), background=Path(args.background) if args.background else None, subtitle=args.subtitle, log=_log)
    _emit(args, {"cover": str(out) if out else None}, f"封面：{out}" if out else "未生成封面")
    return 0


def cmd_cleanup(args) -> int:
    from .project import cleanup

    project = _project(args)
    removed = cleanup(project, dry_run=args.dry_run)
    total = sum(s for _, s in removed)
    verb = "将删除" if args.dry_run else "已删除"
    lines = [f"{verb} {p}（{s / 1e6:.1f} MB）" for p, s in removed] or ["没有需要清理的内容"]
    lines.append(f"合计 {total / 1e6:.1f} MB；lockfile、配音、素材、源码、成片都保留，重装依赖后可原样重新渲染")
    _emit(args, {"removed": removed, "dryRun": args.dry_run}, "\n".join(lines))
    return 0


def cmd_status(args) -> int:
    from .project import status

    project = _project(args)
    rows = status(project)
    human = "\n".join(f"[{'x' if r['done'] else ' '}] {r['stage']}" + (f" — {r['detail']}" if r["detail"] else "") for r in rows)
    _emit(args, {"project": str(project.root), "stages": rows}, f"{project.root}\n{human}")
    return 0


def cmd_studio(args) -> int:
    from . import remotion as rm

    project = _project(args)
    rm.ensure_node_modules(project, _log)
    cmd = rm.studio_command(project)
    if args.print_only:
        print(cmd)
        return 0
    os.chdir(project.root)
    exe = str(rm.bin_path(project, "remotion"))
    os.execv(exe, [exe, "studio", rm.ENTRY])
    return 0


def cmd_genre(args) -> int:
    from . import genres as g

    if args.action == "list":
        rows = g.list_genres()
        _emit(args, [{"name": n, **m} for n, m in rows], "\n".join(f"{n:22s} {m.get('title', '')}：{m.get('description', '')}" for n, m in rows))
        return 0
    if not args.name:
        raise VPError("genre add 需要类型名")
    project = _project(args)
    changed = g.install(project, args.name, force=args.force)
    _emit(args, {"installed": args.name, "changed": changed}, f"已安装类型 {args.name}" + ("（依赖有变化，下次渲染前会自动重装）" if changed else ""))
    return 0


def cmd_styles(args) -> int:
    from . import styles as st

    project = None
    try:
        project = _project(args)
    except VPError:
        pass
    rows = {name: st.load_theme(path)["description"] for name, path in st.available(project).items()}
    _emit(args, rows, "\n".join(f"{k:16s} {v}" for k, v in rows.items()))
    return 0


def cmd_presets(args) -> int:
    from .config import load_presets

    rows = {k: v["description"] for k, v in load_presets().items()}
    _emit(args, rows, "\n".join(f"{k:22s} {v}" for k, v in rows.items()))
    return 0


def cmd_config(args) -> int:
    from .config import load_project_config
    from .configdoc import render_config_doc

    if args.doc:
        print(render_config_doc(), end="")
        return 0
    cfg = load_project_config(_project(args).config_path)
    print(json.dumps(cfg, ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="vp.py", description="video-production：把口播稿和分镜做成视频项目")
    p.add_argument("--version", action="version", version=__version__)
    p.add_argument("--project", help="项目目录（默认从当前目录向上查找 video.config.json）")
    p.add_argument("--json", action="store_true", help="输出 JSON 结果")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("init", help="创建视频项目")
    s.add_argument("dir")
    s.add_argument("--title", required=True)
    s.add_argument("--mode", choices=["produce", "footage"], default="produce")
    s.add_argument("--genre")
    s.add_argument("--style")
    s.add_argument("--preset")
    s.add_argument("--source", help="footage 模式的源视频")
    s.add_argument("--no-copy", action="store_true", help="footage：不把源视频复制进项目")
    s.add_argument("--force", action="store_true")
    s.set_defaults(func=cmd_init)

    s = sub.add_parser("check", help="校验配置与分镜，生成 script.md（不配音）")
    s.set_defaults(func=cmd_check)

    s = sub.add_parser("build", help="配音/转写 → 时间轴 → 混音 → 字幕 → 生成数据")
    s.add_argument("--force-tts", action="store_true", help="忽略配音缓存重新合成")
    s.add_argument("--force-traces", action="store_true", help="重新运行算法 trace")
    s.set_defaults(func=cmd_build)

    s = sub.add_parser("tts", help="只做配音")
    s.add_argument("--force", action="store_true")
    s.set_defaults(func=cmd_tts)

    s = sub.add_parser("trace", help="运行算法 trace（src/algo/<id>/trace.ts）")
    s.add_argument("--force", action="store_true")
    s.set_defaults(func=cmd_trace)

    s = sub.add_parser("asr", help="footage：转写源视频，生成校对稿")
    s.add_argument("--force", action="store_true", help="覆盖已有校对稿")
    s.set_defaults(func=cmd_asr)

    s = sub.add_parser("setup", help="安装 Remotion 依赖")
    s.set_defaults(func=cmd_setup)

    s = sub.add_parser("stills", help="每个镜头渲染一张静帧（可对比多个风格）")
    s.add_argument("--styles", help="逗号分隔的风格名，如 midnight,paper,swiss")
    s.add_argument("--shots", help="只渲染这些镜头")
    s.add_argument("--scale", type=float, default=0.5)
    s.set_defaults(func=cmd_stills)

    s = sub.add_parser("render", help="渲染预览或成片（会先 build，成片后自动验收）")
    s.add_argument("--preview", action="store_true", help="低分辨率、只渲染前 render.preview.maxSeconds 秒")
    s.add_argument("--frames", help="只渲染这些帧，如 0-299")
    s.add_argument("--no-build", action="store_true")
    s.add_argument("--skip-qa", action="store_true")
    s.add_argument("--skip-layout", action="store_true", help="成片前不做版面检测")
    s.set_defaults(func=cmd_render)

    s = sub.add_parser("layout", help="版面检测：实际渲染关键帧，找出压盖、越界、溢出、放不下的文字")
    s.add_argument("--style", help="用另一个风格检测（不写 qa/layout.json）")
    s.set_defaults(func=cmd_layout)

    s = sub.add_parser("qa", help="验收成片")
    s.add_argument("video", nargs="?")
    s.add_argument("--preview", action="store_true")
    s.set_defaults(func=cmd_qa)

    s = sub.add_parser("cover", help="用背景图 + 标题合成封面（没有背景图时按配置跳过）")
    s.add_argument("--background")
    s.add_argument("--subtitle")
    s.set_defaults(func=cmd_cover)

    s = sub.add_parser("cleanup", help="删除 node_modules 与中间文件")
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(func=cmd_cleanup)

    s = sub.add_parser("status", help="查看项目进度")
    s.set_defaults(func=cmd_status)

    s = sub.add_parser("studio", help="打开 Remotion Studio 拖动预览")
    s.add_argument("--print-only", action="store_true")
    s.set_defaults(func=cmd_studio)

    s = sub.add_parser("genre", help="类型包：list / add <名字>")
    s.add_argument("action", choices=["list", "add"])
    s.add_argument("name", nargs="?")
    s.add_argument("--force", action="store_true", help="覆盖项目里已有的组件副本")
    s.set_defaults(func=cmd_genre)

    s = sub.add_parser("styles", help="列出可用风格")
    s.set_defaults(func=cmd_styles)

    s = sub.add_parser("presets", help="列出平台预设")
    s.set_defaults(func=cmd_presets)

    s = sub.add_parser("config", help="打印合并后的完整配置；--doc 打印参数说明")
    s.add_argument("--doc", action="store_true")
    s.set_defaults(func=cmd_config)
    return p


def main(argv: Optional[list[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args) or 0)
    except VPError as e:
        print(f"错误：{e}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("已中断", file=sys.stderr)
        return 130
