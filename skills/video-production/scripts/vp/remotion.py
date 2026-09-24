"""Remotion 侧：依赖安装、生成数据文件（src/generated/*.json）、调用 remotion CLI 渲染。"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional, Sequence

from .errors import VPError
from .jsonutil import dumps, load_json, sha256_file, write_text
from .paths import Project

ENTRY = "src/index.ts"
BROWSER_ENV = "VP_BROWSER_EXECUTABLE"
MIN_NODE_MAJOR = 18


def node_major() -> Optional[int]:
    exe = shutil.which("node")
    if not exe:
        return None
    out = subprocess.run([exe, "--version"], capture_output=True, text=True).stdout.strip()
    m = re.match(r"v(\d+)", out)
    return int(m.group(1)) if m else None


def require_node() -> None:
    major = node_major()
    if major is None:
        raise VPError("找不到 node。Remotion 需要 Node.js 18 或更新版本")
    if major < MIN_NODE_MAJOR:
        raise VPError(f"Node.js 版本过旧（v{major}），Remotion 需要 18 或更新版本")


def package_manager() -> str:
    if shutil.which("pnpm"):
        return "pnpm"
    if shutil.which("npm"):
        return "npm"
    raise VPError("找不到 pnpm 或 npm")


def _install_marker(project: Project) -> Path:
    return project.node_modules / ".vp-installed"


def _deps_signature(project: Project) -> str:
    return sha256_file(project.root / "package.json")


def ensure_node_modules(project: Project, log=lambda m: print(m, file=sys.stderr)) -> None:
    """node_modules 缺失或 package.json 变了就安装。lockfile 保留在项目里，删掉 node_modules 后可原样重装。"""
    require_node()
    marker = _install_marker(project)
    sig = _deps_signature(project)
    if marker.is_file() and marker.read_text().strip() == sig and (project.node_modules / ".bin").is_dir():
        return
    pm = package_manager()
    log(f"安装依赖（{pm} install）…")
    cmd = [pm, "install"]
    if pm == "npm":
        cmd.append("--no-fund")
    proc = subprocess.run(cmd, cwd=project.root)
    if proc.returncode != 0:
        raise VPError(f"{pm} install 失败（退出码 {proc.returncode}）")
    marker.parent.mkdir(parents=True, exist_ok=True)
    marker.write_text(sig)


def bin_path(project: Project, name: str) -> Path:
    p = project.node_modules / ".bin" / name
    if os.name == "nt":
        p = p.with_suffix(".cmd")
    if not p.exists():
        raise VPError(f"找不到 {p}，先运行 vp.py setup 安装依赖")
    return p


def _browser_args() -> list[str]:
    exe = os.environ.get(BROWSER_ENV)
    return [f"--browser-executable={exe}"] if exe else []


def _run_remotion(project: Project, args: Sequence[str], what: str) -> None:
    cmd = [str(bin_path(project, "remotion")), *args, *_browser_args()]
    proc = subprocess.run(cmd, cwd=project.root)
    if proc.returncode != 0:
        raise VPError(f"{what}失败（退出码 {proc.returncode}）。命令：{' '.join(cmd[:8])} …")


def _props_arg(project: Project, props: Optional[dict], name: str) -> list[str]:
    if not props:
        return []
    path = project.vp_dir / f"props-{name}.json"
    write_text(path, json.dumps(props, ensure_ascii=False))
    return [f"--props={path}"]


def render_video(
    project: Project,
    cfg: dict,
    out: Path,
    *,
    preview: bool,
    frames: Optional[tuple[int, int]] = None,
    props: Optional[dict] = None,
) -> None:
    v = cfg["video"]
    a = cfg["audio"]
    args = [
        "render", ENTRY, "Main", str(out), "--overwrite", f"--sample-rate={a['sampleRate']}", f"--audio-bitrate={a['bitrate']}",
        f"--color-space={v['colorSpace']}",
    ]
    if preview:
        args += ["--codec=h264", "--crf=28", "--x264-preset=veryfast", f"--scale={cfg['render']['preview']['scale']}", "--image-format=jpeg", "--jpeg-quality=80"]
    else:
        args += [f"--codec={v['codec']}", f"--image-format={v['imageFormat']}"]
        if v["imageFormat"] == "jpeg":
            args.append(f"--jpeg-quality={v['jpegQuality']}")
        if v["codec"] == "prores":
            args.append(f"--prores-profile={v['proresProfile']}")
        else:
            args.append(f"--pixel-format={v['pixelFormat']}")
            if v["crf"] is not None:
                args.append(f"--crf={v['crf']}")
            if v["videoBitrate"] is not None:
                args.append(f"--video-bitrate={v['videoBitrate']}")
            if v["x264Preset"] is not None:
                args.append(f"--x264-preset={v['x264Preset']}")
    if frames is not None:
        args.append(f"--frames={frames[0]}-{frames[1]}")
    if cfg["render"]["concurrency"] is not None:
        args.append(f"--concurrency={cfg['render']['concurrency']}")
    args += _props_arg(project, props, "main")
    out.parent.mkdir(parents=True, exist_ok=True)
    _run_remotion(project, args, "渲染视频")


def render_sequence(
    project: Project,
    composition: str,
    out_dir: Path,
    *,
    props: Optional[dict] = None,
    image_format: str = "png",
    prefix: str = "frame",
    scale: Optional[float] = None,
    frames: Optional[tuple[int, int]] = None,
) -> list[Path]:
    """渲染图片序列，按帧号排序返回 out_dir 里的文件列表。

    Remotion 判断“输出目录不能带扩展名”时是把整条路径按 . 切开的，路径里任何一级目录带点
    （如 /Users/john.doe/…）都会失败。所以先渲染到项目内不带点的相对路径 renders/_seq/<合成名>，再移到 out_dir。
    """
    stage_rel = Path("renders") / "_seq" / composition.lower()
    stage = project.root / stage_rel
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir(parents=True)
    args = [
        "render", ENTRY, composition, stage_rel.as_posix(), "--sequence", f"--image-format={image_format}",
        f"--image-sequence-pattern={prefix}-[frame].[ext]", "--overwrite",
    ]
    if image_format == "jpeg":
        args.append("--jpeg-quality=90")
    if scale is not None:
        args.append(f"--scale={scale}")
    if frames is not None:
        args.append(f"--frames={frames[0]}-{frames[1]}")
    args += _props_arg(project, props, composition.lower())
    _run_remotion(project, args, f"渲染图片序列 {composition}")
    pat = re.compile(re.escape(prefix) + r"-(\d+)\." + re.escape(image_format) + "$")
    found = []
    for f in stage.iterdir():
        m = pat.match(f.name)
        if m:
            found.append((int(m.group(1)), f))
    found.sort()
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)
    moved = []
    for _, f in found:
        dst = out_dir / f.name
        shutil.move(str(f), dst)
        moved.append(dst)
    shutil.rmtree(stage, ignore_errors=True)
    return moved


def render_still(project: Project, composition: str, out: Path, *, props: Optional[dict] = None, frame: int = 0) -> None:
    args = ["still", ENTRY, composition, str(out), f"--frame={frame}", "--overwrite", "--image-format=png"]
    args += _props_arg(project, props, composition.lower())
    out.parent.mkdir(parents=True, exist_ok=True)
    _run_remotion(project, args, f"渲染静帧 {composition}")


def studio_command(project: Project) -> str:
    return f"cd {project.root} && {package_manager()} exec remotion studio {ENTRY}"


# ---------- 生成数据 ----------

def write_generated(project: Project, name: str, data) -> bool:
    """写 src/generated/<name>.json；内容没变就不写（避免 Studio 无谓重载）。返回是否写了。"""
    path = project.generated_dir / f"{name}.json"
    text = dumps(data)
    if path.is_file() and path.read_text(encoding="utf-8") == text:
        return False
    write_text(path, text)
    return True


def settings_payload(cfg: dict, theme_name: str, themes: dict[str, dict], *, footage: Optional[dict] = None, glyphs: str = "") -> dict:
    c = cfg["captions"]
    burn = c["enabled"] and c["render"] in ("burn", "both")
    w, h = cfg["video"]["width"], cfg["video"]["height"]
    aw, ah = (int(x) for x in cfg["cover"]["aspect"].split(":"))
    short = 1080
    if aw >= ah:
        cover_w, cover_h = round(short * aw / ah), short
    else:
        cover_w, cover_h = short, round(short * ah / aw)
    cover_w += cover_w % 2
    cover_h += cover_h % 2
    return {
        "mode": cfg["mode"],
        "title": cfg["title"],
        "language": cfg["language"],
        "video": {"width": w, "height": h, "fps": cfg["video"]["fps"], "safeArea": cfg["video"]["safeArea"]},
        "captions": {"burn": burn, "maxLines": c["maxLines"], "style": c["style"]},
        "overlays": cfg["overlays"],
        "fonts": cfg["fonts"],
        "styleName": theme_name,
        "themes": themes,
        "cover": {"width": cover_w, "height": cover_h},
        "footage": footage,
        "glyphs": glyphs,
    }


def read_generated(project: Project, name: str) -> Optional[dict]:
    path = project.generated_dir / f"{name}.json"
    return load_json(path) if path.is_file() else None


# ---------- 字体与字形 ----------

# 组件里写死的界面文字，字形也要预加载
UI_TEXT = "来源：例（空）栈（顶在上）队列（队首在左）术语目录第行、…—·/“” 0123456789 CHAPTER VS"


def collect_glyphs(*payloads) -> str:
    """把 JSON 数据里出现的所有字符收集起来（去重排序），字体按它加载 unicode-range 分片。"""
    chars: set[str] = set(UI_TEXT)

    def walk(v) -> None:
        if isinstance(v, str):
            chars.update(v)
        elif isinstance(v, dict):
            for k, x in v.items():
                walk(x)
        elif isinstance(v, list):
            for x in v:
                walk(x)

    for p in payloads:
        walk(p)
    return "".join(sorted(ch for ch in chars if ch.isprintable() or ch == " "))


def write_fonts(project: Project, themes: list[dict]) -> bool:
    """按风格写 src/generated/fonts.ts，并把字体包合并进 package.json。返回依赖是否有变化。"""
    from .genres import merge_dependencies
    from .styles import font_requirements

    req = font_requirements(themes)
    lines = [
        "// 由 vp.py 生成：当前风格用到的字体包（npm，OFL 授权）。改风格后运行 vp.py build 重新生成，不要手改。",
        *[f"import '{imp}';" for imp in req["imports"]],
        "",
        "export const FONT_FACES: Array<{ family: string; weights: number[]; style?: string }> = [",
        *[f"  {{ family: {json.dumps(f['family'])}, weights: {json.dumps(f['weights'])}, style: {json.dumps(f['style'])} }}," for f in req["faces"]],
        "];",
    ]
    text = "\n".join(lines) + "\n"
    path = project.generated_dir / "fonts.ts"
    if not path.is_file() or path.read_text(encoding="utf-8") != text:
        write_text(path, text)
    return merge_dependencies(project, req["packages"])
