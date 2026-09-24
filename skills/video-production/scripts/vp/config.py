"""配置解析：defaults → 用户级默认 → preset → 项目配置，合并后按 schema 与语义规则校验。"""
from __future__ import annotations

import copy
from pathlib import Path
from typing import Any, Optional

from .errors import VPError
from .jsonutil import load_json
from .paths import DEFAULTS_PATH, PRESETS_PATH, SCHEMA_PATH, user_defaults_path
from .schema import validate

# 各编码器允许的 crf 区间（与 Remotion 4 的校验一致）
CRF_RANGES = {"h264": (1, 51), "h265": (0, 51), "vp9": (0, 63)}
CONTAINERS = {"h264": "mp4", "h265": "mp4", "vp9": "webm", "prores": "mov"}


def deep_merge(base: Any, override: Any) -> Any:
    """对象逐键合并；数组和标量整体替换；override 中以 $ 开头的键（如 $schema）忽略。"""
    if not isinstance(base, dict) or not isinstance(override, dict):
        return copy.deepcopy(override)
    out = copy.deepcopy(base)
    for key, value in override.items():
        if key.startswith("$"):
            continue
        if key in out and isinstance(out[key], dict) and isinstance(value, dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = copy.deepcopy(value)
    return out


def load_presets() -> dict:
    data = load_json(PRESETS_PATH)
    presets = data.get("presets")
    if not isinstance(presets, dict) or not presets:
        raise VPError(f"{PRESETS_PATH} 缺少 presets")
    return presets


def load_user_defaults() -> dict:
    path = user_defaults_path()
    if not path.is_file():
        return {}
    data = load_json(path)
    if not isinstance(data, dict):
        raise VPError(f"用户级默认配置 {path} 必须是 JSON 对象")
    return data


def resolve_config(project_cfg: Optional[dict], *, user_defaults: Optional[dict] = None) -> dict:
    """返回合并并校验后的完整配置。user_defaults 为 None 时从默认位置读取。"""
    defaults = load_json(DEFAULTS_PATH)
    user = load_user_defaults() if user_defaults is None else user_defaults
    proj = project_cfg or {}
    if not isinstance(proj, dict):
        raise VPError("video.config.json 必须是 JSON 对象")

    presets = load_presets()
    preset_name = proj.get("preset") or user.get("preset") or defaults["preset"]
    if preset_name not in presets:
        raise VPError(f"未知 preset：{preset_name}。可选：{', '.join(sorted(presets))}")

    merged = deep_merge(defaults, user)
    merged = deep_merge(merged, presets[preset_name]["config"])
    merged = deep_merge(merged, proj)
    merged["preset"] = preset_name

    errors = validate(merged, load_json(SCHEMA_PATH))
    if not errors:
        errors = semantic_errors(merged)
    if errors:
        raise VPError("配置无效：\n  - " + "\n  - ".join(errors))
    return merged


def load_project_config(config_path: Path) -> dict:
    return resolve_config(load_json(config_path))


def semantic_errors(cfg: dict) -> list[str]:
    """schema 表达不了的跨字段约束。"""
    errs: list[str] = []
    v = cfg["video"]
    codec = v["codec"]

    if v["crf"] is not None and v["videoBitrate"] is not None:
        errs.append("video.crf 与 video.videoBitrate 只能设置一个")
    if codec == "prores":
        if v["crf"] is not None or v["videoBitrate"] is not None:
            errs.append("prores 不支持 crf / videoBitrate，请置为 null")
    elif v["crf"] is not None:
        lo, hi = CRF_RANGES[codec]
        if not lo <= v["crf"] <= hi:
            errs.append(f"{codec} 的 crf 取值范围是 {lo}–{hi}，当前 {v['crf']}")
    if v["x264Preset"] is not None and codec != "h264":
        errs.append("video.x264Preset 只能在 codec=h264 时设置")
    if v["pixelFormat"] == "yuv420p10le" and codec not in ("h265", "vp9"):
        errs.append("yuv420p10le 只支持 h265 / vp9")
    if codec != "prores" and v["pixelFormat"] == "yuv420p" and (v["width"] % 2 or v["height"] % 2):
        errs.append("yuv420p 要求宽高为偶数")
    sa = v["safeArea"]
    if sa["top"] + sa["bottom"] >= 80 or sa["left"] + sa["right"] >= 80:
        errs.append("video.safeArea 占去的画面过多（上下或左右合计须小于 80%）")

    c = cfg["captions"]
    if c["minChars"] >= c["maxCharsPerLine"]:
        errs.append("captions.minChars 必须小于 captions.maxCharsPerLine")
    if c["style"]["bottomPct"] + sa["bottom"] >= 90:
        errs.append("captions.style.bottomPct 加 safeArea.bottom 超出画面")

    if cfg["mode"] == "footage" and codec not in ("h264", "h265"):
        errs.append("footage 模式由 ffmpeg 直接编码，video.codec 只支持 h264 / h265")
    if cfg["mode"] == "footage" and c["style"]["highlightWords"]:
        errs.append("footage 模式每块字幕只渲染一张图，不支持 captions.style.highlightWords")

    scale = cfg["render"]["preview"]["scale"]
    pw, ph = v["width"] * scale, v["height"] * scale
    if cfg["mode"] == "produce" and (abs(pw - round(pw)) > 1e-6 or abs(ph - round(ph)) > 1e-6 or round(pw) % 2 or round(ph) % 2):
        errs.append(f"render.preview.scale={scale:g} 让预览尺寸变成 {pw:g}x{ph:g}，H.264 需要偶数整数宽高，换一个缩放比例")

    fonts = cfg["fonts"]
    seen = set()
    for i, f in enumerate(fonts):
        key = (f["family"], f.get("weight"), f.get("style"))
        if key in seen:
            errs.append(f"fonts[{i}] 重复声明了 {f['family']}")
        seen.add(key)
    return errs


def container_for(codec: str) -> str:
    return CONTAINERS[codec]
