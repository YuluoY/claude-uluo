"""视觉风格包：styles/<name>/theme.json（技能自带）或项目内 styles/<name>/theme.json（项目自定义，优先）。"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from .errors import VPError
from .jsonutil import load_json
from .paths import STYLE_SCHEMA_PATH, STYLES_DIR, Project
from .schema import validate


def _dirs(project: Optional[Project]) -> list[Path]:
    out = []
    if project is not None:
        out.append(project.root / "styles")
    out.append(STYLES_DIR)
    return out


def available(project: Optional[Project] = None) -> dict[str, Path]:
    """{风格名: theme.json 路径}；项目内同名风格覆盖技能自带的。"""
    found: dict[str, Path] = {}
    for base in reversed(_dirs(project)):
        if not base.is_dir():
            continue
        for d in sorted(base.iterdir()):
            f = d / "theme.json"
            if d.is_dir() and f.is_file():
                found[d.name] = f
    return found


def load_theme(path: Path) -> dict:
    theme = load_json(path)
    errors = validate(theme, load_json(STYLE_SCHEMA_PATH), path.parent.name)
    if errors:
        raise VPError(f"风格 {path} 格式错误：\n  - " + "\n  - ".join(errors))
    if theme["name"] != path.parent.name:
        raise VPError(f"风格 {path}：name 字段 {theme['name']!r} 必须与目录名 {path.parent.name!r} 一致")
    return theme


def resolve(name: str, project: Optional[Project] = None) -> dict:
    found = available(project)
    if name not in found:
        raise VPError(f"找不到风格 {name}。可选：{', '.join(sorted(found)) or '（无）'}")
    return load_theme(found[name])


def load_all(project: Optional[Project] = None) -> dict[str, dict]:
    return {name: load_theme(path) for name, path in available(project).items()}
