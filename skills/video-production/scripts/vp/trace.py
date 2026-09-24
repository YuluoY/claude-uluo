"""算法 trace：运行 src/algo/<id>/trace.ts，记录每一步（当前行、变量、数据结构状态）。

代码面板按 step.line 高亮，可视化面板按 step.viz 画图，两者读同一份记录，所以不会对不上。
展示的代码是 src/algo/<id>/code.<扩展名>（可以是任何语言），trace.ts 是它的 TypeScript 镜像实现，
在对应位置调用 t.step(行号, …)。行号从 1 开始，指向展示代码。
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from .errors import VPError
from .jsonutil import load_json, sha256_file, sha256_json, write_json
from .paths import Project
from .remotion import bin_path, ensure_node_modules

RUNNER = "src/genres/algorithm/run-trace.ts"
LANG_BY_EXT = {
    "py": "python", "ts": "typescript", "js": "javascript", "java": "java", "cpp": "cpp", "cc": "cpp", "hpp": "cpp",
    "c": "c", "h": "c", "go": "go", "rs": "rust", "kt": "kotlin", "swift": "swift", "cs": "csharp", "rb": "ruby",
    "php": "php", "scala": "scala", "sql": "sql", "sh": "bash", "txt": "text",
}
MAX_STEPS = 5000


def algo_dir(project: Project) -> Path:
    return project.root / "src" / "algo"


def discover(project: Project) -> dict[str, dict]:
    """{trace id: {trace: Path, code: Path, lang: str}}"""
    base = algo_dir(project)
    out: dict[str, dict] = {}
    if not base.is_dir():
        return out
    for d in sorted(base.iterdir()):
        if not d.is_dir():
            continue
        tf = d / "trace.ts"
        if not tf.is_file():
            continue
        codes = sorted(p for p in d.glob("code.*") if p.is_file())
        if len(codes) != 1:
            raise VPError(f"src/algo/{d.name}/ 需要恰好一个 code.<扩展名> 文件（展示给观众的代码），现在有 {len(codes)} 个")
        ext = codes[0].suffix.lstrip(".").lower()
        out[d.name] = {"trace": tf, "code": codes[0], "lang": LANG_BY_EXT.get(ext, "text")}
    return out


def _cache_path(project: Project, tid: str) -> Path:
    return project.vp_dir / "traces" / f"{tid}.json"


def _signature(project: Project, info: dict) -> str:
    extra = []
    d = info["trace"].parent
    for p in sorted(d.rglob("*")):
        if p.is_file():
            extra.append((str(p.relative_to(d)), sha256_file(p)))
    runner = project.root / RUNNER
    return sha256_json({"files": extra, "runner": sha256_file(runner) if runner.is_file() else None, "v": 1})


def validate_trace(tid: str, data: dict, code_lines: int) -> list[str]:
    errs = []
    steps = data.get("steps")
    if not isinstance(steps, list) or not steps:
        return [f"trace {tid}：没有记录任何步骤（trace.ts 里要调用 t.step）"]
    if len(steps) > MAX_STEPS:
        errs.append(f"trace {tid}：{len(steps)} 步太多（上限 {MAX_STEPS}），缩小输入规模")
    for i, st in enumerate(steps):
        lines = st.get("lines")
        if not isinstance(lines, list) or not all(isinstance(x, int) for x in lines):
            errs.append(f"trace {tid} 第 {i} 步：lines 必须是整数数组")
            continue
        bad = [x for x in lines if not 1 <= x <= code_lines]
        if bad:
            errs.append(f"trace {tid} 第 {i} 步：行号 {bad} 超出展示代码范围 1–{code_lines}")
    return errs


def run_all(project: Project, *, force: bool = False, log=lambda m: print(m, file=sys.stderr)) -> dict[str, dict]:
    """运行（或复用缓存）所有 trace，返回 {id: {id, lang, code, steps}}。"""
    found = discover(project)
    if not found:
        return {}
    runner = project.root / RUNNER
    if not runner.is_file():
        raise VPError(f"src/algo 下有 trace，但项目没有安装 algorithm 类型包（缺 {RUNNER}）：运行 vp.py genre add algorithm")
    out: dict[str, dict] = {}
    need_run = []
    for tid, info in found.items():
        sig = _signature(project, info)
        cp = _cache_path(project, tid)
        if not force and cp.is_file():
            cached = load_json(cp)
            if cached.get("signature") == sig:
                out[tid] = cached["trace"]
                continue
        need_run.append((tid, info, sig))
    if need_run:
        ensure_node_modules(project, log)
        tsx = bin_path(project, "tsx")
    for tid, info, sig in need_run:
        tmp = project.vp_dir / "traces" / f"{tid}.raw.json"
        tmp.parent.mkdir(parents=True, exist_ok=True)
        proc = subprocess.run([str(tsx), RUNNER, tid, str(tmp)], cwd=project.root, capture_output=True, text=True)
        if proc.returncode != 0:
            raise VPError(f"运行 trace {tid} 失败：\n{(proc.stderr or proc.stdout).strip()[-3000:]}")
        raw = load_json(tmp)
        tmp.unlink(missing_ok=True)
        code = info["code"].read_text(encoding="utf-8").replace("\r\n", "\n").rstrip("\n")
        code_lines = code.count("\n") + 1
        errs = validate_trace(tid, raw, code_lines)
        if errs:
            raise VPError("\n".join(errs))
        trace = {"id": tid, "lang": info["lang"], "code": code, "steps": raw["steps"]}
        write_json(_cache_path(project, tid), {"signature": sig, "trace": trace})
        out[tid] = trace
        log(f"trace {tid}：{len(trace['steps'])} 步")
    return out
