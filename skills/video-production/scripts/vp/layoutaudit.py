"""版面检测：在 Chrome 里实际渲染每个镜头的关键帧，测量 DOM，找出越界、压到字幕、内容溢出、互相压盖、文字放不下。

浏览器端的测量在 template/src/engine/audit.tsx，结果通过 Remotion 的 Artifact 写到 out/Stills/layout/*.json。
每个镜头检测两帧：转场结束后的中点、镜头最后一帧（逐条出现的元素此时都已出现）。
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from typing import Optional

from . import remotion as rm
from .errors import VPError
from .jsonutil import sha256_file, write_json, write_text
from .paths import Project

KIND_TEXT = {
    "outside": "越出{other}",
    "captions": "压到字幕带",
    "overflow": "内容超出槽位",
    "overlap": "与 {other} 压盖",
    "text": "文字在最小字号下也放不下",
}
REGION_TEXT = {"content": "内容区", "header": "页眉", "canvas": "画布"}


def audit_frames(timeline: dict) -> list[tuple[str, int]]:
    out: list[tuple[str, int]] = []
    for sh in timeline["shots"]:
        a = sh["from"] + sh["transition"]["durationInFrames"]
        b = sh["from"] + sh["durationInFrames"] - 1
        b = max(a, b)
        mid = (a + b) // 2
        out.append((f"{sh['id']}@mid", mid))
        if b != mid:
            out.append((f"{sh['id']}@end", b))
    return out


def artifacts_dir(project: Project) -> Path:
    return project.root / "out" / "Stills" / "layout"


def inputs_signature(project: Project) -> str:
    """版面只由生成数据（时间轴、设置）和组件源码决定；任何一个变了，旧的检测结果就作废。"""
    import hashlib

    h = hashlib.sha256()
    for name in ("timeline", "settings", "captions"):
        p = project.generated_dir / f"{name}.json"
        h.update(sha256_file(p).encode() if p.is_file() else b"-")
    src = project.root / "src"
    for f in sorted(src.rglob("*.ts*")) if src.is_dir() else []:
        if "generated" in f.relative_to(src).parts:
            continue
        h.update(f.relative_to(src).as_posix().encode())
        h.update(sha256_file(f).encode())
    return h.hexdigest()


def rows_to_issues(rows: list[dict]) -> list[dict]:
    issues = []
    for row in rows:
        shot, _, which = row["id"].partition("@")
        for it in row["issues"]:
            issues.append({"shot": shot, "at": which, "frame": row["frame"], **it})
    return issues


def collect(project: Project, ids: list[str]) -> list[dict]:
    d = artifacts_dir(project)
    rows = []
    for i in ids:
        p = d / f"{i}.json"
        if not p.is_file():
            raise VPError(f"版面检测没有产出 {i} 的结果（{p}）")
        rows.append(json.loads(p.read_text(encoding="utf-8")))
    return rows


def describe(issue: dict) -> str:
    other = issue.get("other") or ""
    other = REGION_TEXT.get(other, other)
    text = KIND_TEXT.get(issue["kind"], issue["kind"]).format(other=other)
    amt = f"（{issue['amount']}px）" if issue.get("amount") else ""
    r = issue.get("rect") or {}
    return f"{issue['box']} {text}{amt} @({r.get('x')},{r.get('y')} {r.get('w')}×{r.get('h')})"


def run(project: Project, *, style: Optional[str] = None, log=lambda m: print(m, file=sys.stderr)) -> dict:
    tl = rm.read_generated(project, "timeline")
    if not tl or not tl.get("shots"):
        raise VPError("还没有时间轴，先运行 vp.py build")
    frames = audit_frames(tl)
    ids = [i for i, _ in frames]
    d = artifacts_dir(project)
    if d.exists():
        shutil.rmtree(d)
    rm.ensure_node_modules(project, log)
    props = {"frames": [f for _, f in frames], "ids": ids}
    if style:
        props["style"] = style
    rm.render_sequence(project, "Stills", project.work_dir / "layout-frames", props=props, image_format="jpeg", prefix="layout", scale=0.25, frames=(0, len(frames) - 1))
    rows = collect(project, ids)
    issues = rows_to_issues(rows)
    report = {"ok": not issues, "style": style, "frames": len(rows), "issues": issues, "signature": inputs_signature(project)}
    if style is None:
        write_json(project.qa_dir / "layout.json", report)
        write_text(project.qa_dir / "layout.md", render_md(report))
    shutil.rmtree(project.work_dir / "layout-frames", ignore_errors=True)
    return report


def render_md(r: dict) -> str:
    lines = ["# 版面检测", "", f"- 检测帧数：{r['frames']}（每个镜头的中点与最后一帧）", f"- 结论：{'通过' if r['ok'] else '不通过'}（{len(r['issues'])} 处问题）", ""]
    if r["issues"]:
        lines += ["| 镜头 | 帧 | 问题 |", "|---|---|---|"]
        for it in r["issues"]:
            lines.append(f"| {it['shot']} | {it['frame']}（{it['at']}） | {describe(it)} |")
    return "\n".join(lines) + "\n"


def summary_lines(r: dict, limit: int = 12) -> list[str]:
    out = [f"镜头 {it['shot']}（第 {it['frame']} 帧）：{describe(it)}" for it in r["issues"][:limit]]
    if len(r["issues"]) > limit:
        out.append(f"…另有 {len(r['issues']) - limit} 处，见 qa/layout.md")
    return out
