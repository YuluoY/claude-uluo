"""讲解类型包：genres/<name>/，含 GENRE.md（讲解结构与分镜套路）、genre.json（元数据）、components/（Remotion 组件）。

新增类型 = 复制 genres/_template 为新目录并填写，不需要改 SKILL.md。
"""
from __future__ import annotations

import re
import shutil
from pathlib import Path

from .errors import VPError
from .jsonutil import load_json, write_json, write_text
from .paths import GENRES_DIR, Project
from .schema import validate

NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
# 基础类型包：片头、要点、对比、定义等通用场景，每个项目都装
BASE_GENRE = "concept-explainer"
GENRE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["name", "title", "description", "scenes", "dependencies"],
    "properties": {
        "name": {"type": "string", "pattern": "^[a-z0-9][a-z0-9-]*$"},
        "title": {"type": "string", "minLength": 1},
        "description": {"type": "string", "minLength": 1},
        "scenes": {"description": "可在 storyboard 中直接引用的场景组件名", "type": "array", "items": {"type": "string", "pattern": "^[A-Z][A-Za-z0-9]*$"}},
        "dependencies": {"description": "额外 npm 依赖 {包名: 版本}", "type": "object", "additionalProperties": {"type": "string"}},
        "usesTraces": {"type": "boolean"},
    },
}


def genre_dir(name: str) -> Path:
    return GENRES_DIR / name


def load_meta(name: str) -> dict:
    d = genre_dir(name)
    meta_path = d / "genre.json"
    if not meta_path.is_file():
        raise VPError(f"找不到类型 {name}（{d}）。可选：{', '.join(n for n, _ in list_genres()) or '（无）'}")
    meta = load_json(meta_path)
    errors = validate(meta, GENRE_SCHEMA, f"genres/{name}/genre.json")
    if errors:
        raise VPError("\n".join(errors))
    if meta["name"] != name:
        raise VPError(f"genres/{name}/genre.json 的 name 必须是 {name}")
    return meta


def list_genres() -> list[tuple[str, dict]]:
    out = []
    if not GENRES_DIR.is_dir():
        return out
    for d in sorted(GENRES_DIR.iterdir()):
        if d.is_dir() and not d.name.startswith("_") and (d / "genre.json").is_file():
            out.append((d.name, load_json(d / "genre.json")))
    return out


def installed(project: Project) -> list[str]:
    base = project.root / "src" / "genres"
    if not base.is_dir():
        return []
    return sorted(d.name for d in base.iterdir() if d.is_dir() and (d / "index.ts").is_file())


def install(project: Project, name: str, *, force: bool = False) -> bool:
    """把类型组件复制进项目 src/genres/<name>/，合并 npm 依赖，重写 src/genres/index.ts。返回是否有改动。"""
    if not NAME_RE.match(name):
        raise VPError(f"类型名不合法：{name}")
    meta = load_meta(name)
    src = genre_dir(name) / "components"
    if not (src / "index.ts").is_file():
        raise VPError(f"genres/{name}/components/index.ts 不存在")
    dst = project.root / "src" / "genres" / name
    changed = False
    if force or not dst.exists():
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
        changed = True
    if _merge_dependencies(project, meta["dependencies"]):
        changed = True
    write_genre_index(project)
    return changed


def _merge_dependencies(project: Project, deps: dict) -> bool:
    if not deps:
        return False
    pkg_path = project.root / "package.json"
    pkg = load_json(pkg_path)
    cur = pkg.setdefault("dependencies", {})
    changed = False
    for k, v in deps.items():
        if cur.get(k) != v:
            cur[k] = v
            changed = True
    if changed:
        write_json(pkg_path, pkg)
    return changed


def write_genre_index(project: Project) -> None:
    names = installed(project)
    lines = [
        "// 由 vp.py 生成：汇总已安装类型包导出的场景。增删类型用 vp.py genre add <名字>，不要手改。",
        "import type { SceneComponent } from '../engine/types';",
    ]
    idents = []
    for n in names:
        ident = "g_" + n.replace("-", "_")
        idents.append(ident)
        lines.append(f"import {{ scenes as {ident} }} from './{n}';")
    lines.append("")
    body = ", ".join(f"...{i}" for i in idents)
    lines.append(f"export const genreScenes: Record<string, SceneComponent> = {{ {body} }};" if idents else "export const genreScenes: Record<string, SceneComponent> = {};")
    target = project.root / "src" / "genres" / "index.ts"
    text = "\n".join(lines) + "\n"
    if not target.is_file() or target.read_text(encoding="utf-8") != text:
        write_text(target, text)
