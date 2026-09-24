"""视频项目的创建、状态、清理、封面。一个视频就是一个项目目录，全部素材都留在里面。"""
from __future__ import annotations

import re
import shutil
from datetime import date
from pathlib import Path
from typing import Optional

from . import genres as genres_mod
from . import remotion as rm
from . import styles as styles_mod
from .config import load_presets, resolve_config
from .errors import VPError
from .jsonutil import load_json, write_json, write_text
from .paths import SCHEMA_PATH, TEMPLATE_DIR, Project
from .storyboard import STORYBOARD_SCHEMA_PATH

TEMPLATE_IGNORE = shutil.ignore_patterns("node_modules", ".DS_Store", "__pycache__")


def slugify(text: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()
    return s or "video"


def init(
    target: Path,
    *,
    title: str,
    mode: str = "produce",
    genre: Optional[str] = None,
    style: Optional[str] = None,
    preset: Optional[str] = None,
    source: Optional[Path] = None,
    copy_source: bool = True,
    force: bool = False,
) -> Project:
    target = Path(target).expanduser().resolve()
    if target.exists() and any(target.iterdir()) and not force:
        raise VPError(f"{target} 已存在且不为空（确认要覆盖模板文件请加 --force）")
    if mode not in ("produce", "footage"):
        raise VPError("mode 只能是 produce 或 footage")
    if preset is not None and preset not in load_presets():
        raise VPError(f"未知 preset：{preset}。可选：{', '.join(sorted(load_presets()))}")
    if genre is not None:
        genres_mod.load_meta(genre)
    if style is not None:
        styles_mod.resolve(style)
    if mode == "footage":
        if source is None:
            raise VPError("footage 模式需要 --source 指定源视频")
        source = Path(source).expanduser().resolve()
        if not source.is_file():
            raise VPError(f"找不到源视频：{source}")

    target.mkdir(parents=True, exist_ok=True)
    shutil.copytree(TEMPLATE_DIR, target, ignore=TEMPLATE_IGNORE, dirs_exist_ok=True)
    project = Project(target)
    gi = target / "_gitignore"
    if gi.is_file():
        gi.replace(target / ".gitignore")

    pkg = load_json(target / "package.json")
    pkg["name"] = slugify(target.name)
    write_json(target / "package.json", pkg)

    cfg: dict = {"$schema": SCHEMA_PATH.as_uri(), "title": title, "mode": mode}
    if preset:
        cfg["preset"] = preset
    if genre:
        cfg["genre"] = genre
    if style:
        cfg["style"] = style
    if mode == "footage":
        assert source is not None
        if copy_source:
            from .footage import copy_source_into_project

            rel = copy_source_into_project(project, source)
        else:
            rel = str(source)
        cfg["footage"] = {"source": rel, "copySource": copy_source}
    resolved = resolve_config({k: v for k, v in cfg.items() if not k.startswith("$")})
    write_json(project.config_path, cfg)

    genres_mod.install(project, genres_mod.BASE_GENRE)
    if resolved["genre"] != genres_mod.BASE_GENRE:
        genres_mod.install(project, resolved["genre"])
    if mode == "produce" and not project.storyboard_path.is_file():
        write_json(project.storyboard_path, {"$schema": STORYBOARD_SCHEMA_PATH.as_uri(), "shots": []})
    write_initial_generated(project, resolved)

    for name in ("README.md", "brief.md"):
        p = target / name
        if p.is_file():
            text = p.read_text(encoding="utf-8")
            text = text.replace("{{title}}", title).replace("{{date}}", date.today().isoformat()).replace("{{mode}}", mode)
            write_text(p, text)
    return project


def initial_generated(cfg: dict, themes: dict[str, dict]) -> dict[str, object]:
    """新项目的 src/generated/*：空时间轴、空字幕、按配置的设置。Studio 在 build 之前也能打开。"""
    v = cfg["video"]
    return {
        "timeline": {"fps": v["fps"], "width": v["width"], "height": v["height"], "durationInFrames": 1,
                     "title": cfg["title"], "audio": None, "chapters": [], "shots": []},
        "captions": {"blocks": []},
        "traces": {},
        "settings": rm.settings_payload(cfg, cfg["style"], themes, glyphs=rm.collect_glyphs(cfg["title"])),
    }


def write_initial_generated(project: Project, cfg: dict) -> None:
    themes = styles_mod.load_all(project)
    for name, data in initial_generated(cfg, themes).items():
        rm.write_generated(project, name, data)
    rm.write_fonts(project, [themes[cfg["style"]]])


# ---------- 状态 ----------

def _exists(p: Path) -> bool:
    return p.is_file() and p.stat().st_size > 0


def status(project: Project) -> list[dict]:
    """按阶段列出完成情况（从文件推断，不单独记状态，避免与实际文件不一致）。"""
    cfg = load_json(project.config_path)
    mode = cfg.get("mode", "produce")
    rows: list[dict] = []

    def row(stage: str, done: bool, detail: str = "") -> None:
        rows.append({"stage": stage, "done": done, "detail": detail})

    brief = project.brief_path.read_text(encoding="utf-8") if project.brief_path.is_file() else ""
    row("brief：选题/受众/风格与检查点记录", "TODO" not in brief and bool(brief.strip()), project.rel(project.brief_path))
    if mode == "produce":
        shots = 0
        if project.storyboard_path.is_file():
            try:
                shots = len(load_json(project.storyboard_path).get("shots", []))
            except VPError:
                shots = 0
        row("分镜与口播稿（storyboard.json）", shots > 0, f"{shots} 个镜头")
        tts_files = list(project.tts_dir.glob("*.json")) if project.tts_dir.is_dir() else []
        row("配音（audio/tts）", bool(tts_files), f"{len(tts_files)} 句")
        row("时间轴与字幕（vp.py build）", _exists(project.timeline_path) and _exists(project.captions_json))
    else:
        row("转写（vp.py asr）", _exists(project.asr_path))
        row("校对稿（captions/transcript.proof.json）", _exists(project.proof_path))
        row("字幕（vp.py build）", _exists(project.captions_json))
    row("预览（renders/preview.mp4）", _exists(project.renders_dir / "preview.mp4"))
    video_exts = {".mp4", ".mov", ".webm"}
    finals = (
        [p for p in project.renders_dir.iterdir() if p.is_file() and p.suffix.lower() in video_exts and p.stem != "preview"]
        if project.renders_dir.is_dir() else []
    )
    row("成片（renders/）", bool(finals), ", ".join(project.rel(p) for p in finals))
    rep = project.qa_dir / "report.json"
    ok = load_json(rep).get("ok") if rep.is_file() else None
    row("验收（qa/report.md）", ok is True, "" if ok is None else ("通过" if ok else "不通过"))
    cover = project.cover_dir / "cover.png"
    row("封面（cover/cover.png，可跳过）", cover.is_file())
    row("清理（node_modules 已删）", not project.node_modules.exists())
    return rows


# ---------- 清理 ----------

def _size(p: Path) -> int:
    if p.is_file():
        return p.stat().st_size
    total = 0
    for f in p.rglob("*"):
        if f.is_file() and not f.is_symlink():
            total += f.stat().st_size
    return total


def cleanup(project: Project, *, dry_run: bool = False) -> list[tuple[str, int]]:
    """删掉可再生成的大文件；配音、素材、源码、lockfile、成片全部保留。"""
    cfg = resolve_config({k: v for k, v in load_json(project.config_path).items() if not k.startswith("$")})
    c = cfg["cleanup"]
    targets: list[Path] = []
    if c["removeNodeModules"]:
        targets.append(project.node_modules)
    if c["removeWorkDir"]:
        targets += [project.work_dir, project.seq_dir, project.root / "out", project.vp_dir / "tmp"]
        targets += list(project.vp_dir.glob("props-*.json")) if project.vp_dir.is_dir() else []
        targets += list(project.asr_dir.glob("*.wav")) if project.asr_dir.is_dir() else []
        targets += [project.renders_dir / "stills" / "styles"]
    if c["removePreview"]:
        targets.append(project.renders_dir / "preview.mp4")
    removed = []
    for t in targets:
        if not t.exists():
            continue
        size = _size(t)
        removed.append((project.rel(t), size))
        if dry_run:
            continue
        if t.is_dir() and not t.is_symlink():
            shutil.rmtree(t)
        else:
            t.unlink()
    return removed


# ---------- 封面 ----------

def cover(project: Project, *, background: Optional[Path] = None, subtitle: Optional[str] = None, log=print) -> Optional[Path]:
    """背景图（由有生图能力的模型生成，不含文字）+ 标题文字 → cover/cover.png。

    cover.enabled=auto 且没有背景图时跳过（返回 None）；=true 且没有背景图时报错。
    """
    raw = load_json(project.config_path)
    cfg = resolve_config({k: v for k, v in raw.items() if not k.startswith("$")})
    mode = cfg["cover"]["enabled"]
    if mode is False:
        log("cover.enabled=false，跳过封面")
        return None
    bg = Path(background) if background else project.cover_dir / "background.png"
    if not bg.is_absolute():
        bg = project.root / bg
    if not bg.is_file():
        if mode == "auto":
            log("没有封面背景图（cover/background.png），当前模型没有生图能力时按约定跳过封面")
            return None
        raise VPError("cover.enabled=true，但找不到 cover/background.png：需要先用生图工具生成背景图")
    public_bg = project.public_dir / "cover" / bg.name
    public_bg.parent.mkdir(parents=True, exist_ok=True)
    if bg.resolve() != public_bg.resolve():
        shutil.copy2(bg, public_bg)
    rm.ensure_node_modules(project)
    out = project.cover_dir / "cover.png"
    props = {"background": f"cover/{bg.name}", "title": cfg["title"], "subtitle": subtitle or ""}
    rm.render_still(project, "Cover", out, props=props)
    return out
