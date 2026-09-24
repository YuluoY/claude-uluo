"""分镜（storyboard.json）：读取、校验、整理成镜头/句子/提示点，生成可读的 script.md。"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from .errors import VPError
from .jsonutil import load_json
from .paths import CONFIG_DIR, Project, resolve_in_project
from .schema import validate
from .textproc import apply_pronunciations, display_width, has_spoken_content

STORYBOARD_SCHEMA_PATH = CONFIG_DIR / "storyboard.schema.json"

# 粗估语速（每秒汉字数，edge-tts 中文音色 +0% 的经验值），只用于脚本确认阶段的时长预估
ESTIMATE_CHARS_PER_SEC = 4.2


@dataclass
class Cue:
    id: str
    at: str
    occurrence: int = 1
    edge: str = "start"
    offset: float = 0.0
    step: Optional[int] = None


@dataclass
class Sentence:
    id: str
    shot_id: str
    index: int
    text: str
    say: str
    rate: Optional[str] = None
    pause_after: Optional[float] = None
    steps: Optional[tuple[int, int]] = None
    cues: list[Cue] = field(default_factory=list)


@dataclass
class Shot:
    id: str
    index: int
    chapter: Optional[str]
    intent: str
    visual: str
    source: dict
    transition: Optional[dict]
    hold: float
    min_duration: float
    duration: Optional[float]
    sentences: list[Sentence]

    @property
    def trace_id(self) -> Optional[str]:
        if self.source.get("type") != "scene":
            return None
        t = (self.source.get("props") or {}).get("trace")
        return t if isinstance(t, str) else None


@dataclass
class Storyboard:
    shots: list[Shot]

    @property
    def sentences(self) -> list[Sentence]:
        return [s for sh in self.shots for s in sh.sentences]

    def shot(self, shot_id: str) -> Shot:
        for sh in self.shots:
            if sh.id == shot_id:
                return sh
        raise KeyError(shot_id)


def find_occurrence(text: str, needle: str, occurrence: int) -> Optional[int]:
    pos = -1
    for _ in range(occurrence):
        pos = text.find(needle, pos + 1)
        if pos < 0:
            return None
    return pos


def load_storyboard(project: Project, cfg: dict) -> Storyboard:
    path = project.storyboard_path
    if not path.is_file():
        raise VPError(f"缺少 {project.rel(path)}：先写分镜（见 references/storyboard.md）")
    return parse_storyboard(load_json(path), cfg, project=project)


def parse_storyboard(data: dict, cfg: dict, *, project: Optional[Project] = None) -> Storyboard:
    schema = load_json(STORYBOARD_SCHEMA_PATH)
    errors = validate(data, schema, "storyboard")
    if errors:
        raise VPError("storyboard.json 格式错误：\n  - " + "\n  - ".join(errors))

    errs: list[str] = []
    table = cfg["voice"]["pronunciations"]
    explicit_ids = {s["id"] for sh in data["shots"] for s in sh["sentences"] if "id" in s}
    shot_ids: set[str] = set()
    sentence_ids: set[str] = set()
    shots: list[Shot] = []
    g = 0
    for si, raw in enumerate(data["shots"]):
        where = f"shots[{si}]（{raw['id']}）"
        if raw["id"] in shot_ids:
            errs.append(f"{where}：镜头 id 重复")
        shot_ids.add(raw["id"])

        src = raw["source"]
        sub = schema["$defs"].get(f"source_{src['type']}")
        errs.extend(validate(src, sub, f"{where}.source"))
        if project is not None and src["type"] in ("clip", "image") and isinstance(src.get("file"), str):
            try:
                f = resolve_in_project(project, src["file"], base=project.public_dir, what=f"{where}.source.file")
                if not f.is_file():
                    errs.append(f"{where}：找不到 public/{src['file']}")
            except VPError as e:
                errs.append(str(e))

        has_sentences = bool(raw["sentences"])
        if not has_sentences and "durationSec" not in raw:
            errs.append(f"{where}：没有句子的镜头必须给 durationSec")
        if has_sentences and "durationSec" in raw:
            errs.append(f"{where}：有句子的镜头时长由配音决定，不能写 durationSec（需要更长请用 holdSec 或 minDurationSec）")

        sentences: list[Sentence] = []
        cue_ids: set[str] = set()
        trace_id = None
        if src["type"] == "scene":
            t = (src.get("props") or {}).get("trace")
            trace_id = t if isinstance(t, str) else None
        for k, rs in enumerate(raw["sentences"]):
            sid = rs.get("id") or f"{raw['id']}-{k + 1}"
            swhere = f"{where}.sentences[{k}]（{sid}）"
            if "id" not in rs and sid in explicit_ids:
                errs.append(f"{swhere}：自动生成的编号与别处手写的编号冲突，请给这句手写 id")
            if sid in sentence_ids:
                errs.append(f"{swhere}：句子 id 重复")
            sentence_ids.add(sid)
            text = rs["text"].strip()
            if not has_spoken_content(text):
                errs.append(f"{swhere}：text 里没有可朗读的文字")
            say = (rs.get("say") or apply_pronunciations(text, table)).strip()
            if not has_spoken_content(say):
                errs.append(f"{swhere}：朗读文本里没有可朗读的文字")

            steps = None
            if "steps" in rs:
                a, b = rs["steps"]
                if a > b:
                    errs.append(f"{swhere}：steps 起点 {a} 大于终点 {b}")
                if trace_id is None:
                    errs.append(f"{swhere}：用了 steps，但镜头 source 不是带 props.trace 的场景")
                steps = (a, b)

            cues: list[Cue] = []
            for ci, rc in enumerate(rs.get("cues", [])):
                cwhere = f"{swhere}.cues[{ci}]（{rc['id']}）"
                if rc["id"] in cue_ids:
                    errs.append(f"{cwhere}：提示点 id 在镜头内重复")
                cue_ids.add(rc["id"])
                occ = rc.get("occurrence", 1)
                if find_occurrence(text, rc["at"], occ) is None:
                    errs.append(f"{cwhere}：在本句 text 中找不到第 {occ} 处“{rc['at']}”")
                elif not has_spoken_content(rc["at"]):
                    errs.append(f"{cwhere}：at 只有标点或空白，念不出来，没有时刻")
                step = rc.get("step")
                if step is not None:
                    if trace_id is None:
                        errs.append(f"{cwhere}：用了 step，但镜头 source 不是带 props.trace 的场景")
                    if steps is not None and not steps[0] <= step <= steps[1]:
                        errs.append(f"{cwhere}：step {step} 不在本句 steps {list(steps)} 范围内")
                cues.append(Cue(rc["id"], rc["at"], occ, rc.get("edge", "start"), float(rc.get("offsetSec", 0.0)), step))

            sentences.append(Sentence(
                id=sid, shot_id=raw["id"], index=g, text=text, say=say,
                rate=rs.get("rate"), pause_after=rs.get("pauseAfterSec"), steps=steps, cues=cues,
            ))
            g += 1

        shots.append(Shot(
            id=raw["id"], index=si, chapter=raw.get("chapter"), intent=raw["intent"].strip(),
            visual=raw["visual"].strip(), source=src, transition=raw.get("transition"),
            hold=float(raw.get("holdSec", 0.0)), min_duration=float(raw.get("minDurationSec", 0.0)),
            duration=raw.get("durationSec"), sentences=sentences,
        ))

    if not any(sh.sentences for sh in shots) and cfg["voice"]["engine"] != "none":
        errs.append("storyboard 里一句口播都没有")
    if errs:
        raise VPError("storyboard.json 有问题：\n  - " + "\n  - ".join(errs))
    return Storyboard(shots)


def check_traces(sb: Storyboard, trace_lengths: dict[str, int]) -> list[str]:
    """steps / cue.step 是否落在 trace 的步数范围内。"""
    errs: list[str] = []
    for sh in sb.shots:
        tid = sh.trace_id
        if tid is None:
            continue
        uses = any(s.steps is not None or any(c.step is not None for c in s.cues) for s in sh.sentences)
        if tid not in trace_lengths:
            if uses:
                errs.append(f"镜头 {sh.id}：找不到 trace “{tid}”（src/algo/{tid}/trace.ts，先运行 vp.py trace）")
            continue
        n = trace_lengths[tid]
        for s in sh.sentences:
            if s.steps is not None and s.steps[1] >= n:
                errs.append(f"句子 {s.id}：steps {list(s.steps)} 超出 trace “{tid}” 的步数（共 {n} 步，编号 0–{n - 1}）")
            for c in s.cues:
                if c.step is not None and c.step >= n:
                    errs.append(f"句子 {s.id} 提示点 {c.id}：step {c.step} 超出 trace “{tid}” 的步数（共 {n} 步）")
    return errs


def scene_component_warnings(project: Project, sb: Storyboard) -> list[str]:
    """组件名是否出现在场景注册表（src/scenes/index.ts）或已安装类型包的 scenes 导出里。

    这里只是按文本粗查、提前提示；组件真的不存在时，渲染会直接报错并列出可用组件。
    """
    reg = project.root / "src" / "scenes" / "index.ts"
    if not reg.is_file():
        return [f"缺少 {project.rel(reg)}（场景注册表）"]
    texts = [reg.read_text(encoding="utf-8")]
    genres_dir = project.root / "src" / "genres"
    if genres_dir.is_dir():
        for idx in sorted(genres_dir.glob("*/index.ts")):
            texts.append(idx.read_text(encoding="utf-8"))
    corpus = "\n".join(texts)
    out = []
    for sh in sb.shots:
        if sh.source.get("type") == "scene":
            name = sh.source["component"]
            if not re.search(r"\b" + re.escape(name) + r"\b", corpus):
                out.append(f"镜头 {sh.id}：组件 {name} 既不在 src/scenes/index.ts，也不在已安装类型包的 scenes 里")
    return out


def _rate_factor(rate: str) -> float:
    m = re.match(r"^([+-])([0-9]+)%$", rate)
    if not m:
        return 1.0
    pct = int(m.group(2)) * (1 if m.group(1) == "+" else -1)
    return max(0.2, 1 + pct / 100)


def estimate_seconds(sb: Storyboard, cfg: dict) -> float:
    v = cfg["voice"]
    p = cfg["pacing"]
    total = p["leadInSec"] + p["tailSec"]
    for sh in sb.shots:
        if not sh.sentences:
            total += float(sh.duration or 0)
            continue
        for s in sh.sentences:
            if v["engine"] == "none":
                cps = v["readingCharsPerSec"]
            else:
                cps = ESTIMATE_CHARS_PER_SEC * _rate_factor(s.rate or v["rate"])
            total += display_width(s.text) / cps + (s.pause_after if s.pause_after is not None else p["sentencePauseSec"])
        total += sh.hold
    return total


def _fmt_time(t: float) -> str:
    m, s = divmod(max(0.0, t), 60)
    return f"{int(m):02d}:{s:04.1f}"


def source_label(src: dict) -> str:
    t = src.get("type")
    if t == "scene":
        extra = ""
        props = src.get("props") or {}
        if isinstance(props.get("trace"), str):
            extra = f"（trace: {props['trace']}）"
        return f"场景 {src.get('component')}{extra}"
    if t == "clip":
        return f"视频片段 public/{src.get('file')}"
    if t == "image":
        return f"图片 public/{src.get('file')}"
    return str(t)


def render_script_md(sb: Storyboard, cfg: dict, timeline: Optional[dict] = None) -> str:
    """口播稿：按章节 → 镜头 → 句子列出，带编号；有时间轴时附上起止时间。"""
    times: dict[str, tuple[float, float]] = {}
    total = None
    if timeline:
        for s in timeline.get("sentences", []):
            times[s["id"]] = (s["start"], s["end"])
        total = timeline.get("durationSec")
    sentences = sb.sentences
    chars = sum(display_width(s.text) for s in sentences)
    lines = [f"# {cfg['title'] or '口播稿'}", ""]
    lines.append("> 由 storyboard.json 生成，不要直接改本文件：改 storyboard.json 后运行 `vp.py build`。")
    if total is not None:
        lines.append(f"> {len(sb.shots)} 个镜头，{len(sentences)} 句，约 {chars:.0f} 字，时长 {_fmt_time(total)}（按实际配音）。")
    else:
        lines.append(f"> {len(sb.shots)} 个镜头，{len(sentences)} 句，约 {chars:.0f} 字，粗估时长 {_fmt_time(estimate_seconds(sb, cfg))}（配音后以实际为准）。")
    lines.append("")
    chapter = object()
    for sh in sb.shots:
        if sh.chapter != chapter:
            chapter = sh.chapter
            if sh.chapter:
                lines += [f"## {sh.chapter}", ""]
        lines.append(f"### 镜头 {sh.id}")
        lines.append(f"- 要表达的关系：{sh.intent}")
        lines.append(f"- 画面：{sh.visual}")
        lines.append(f"- 来源：{source_label(sh.source)}")
        if not sh.sentences:
            lines.append(f"- 纯画面，{sh.duration:g} 秒")
        lines.append("")
        for s in sh.sentences:
            head = f"{s.index + 1}. `{s.id}`"
            if s.id in times:
                a, b = times[s.id]
                head += f" [{_fmt_time(a)}–{_fmt_time(b)}]"
            lines.append(f"{head} {s.text}")
            if s.say != s.text:
                lines.append(f"   - 朗读：{s.say}")
            if s.steps is not None:
                lines.append(f"   - 算法步骤：{s.steps[0]}–{s.steps[1]}")
            for c in s.cues:
                extra = f"，切到第 {c.step} 步" if c.step is not None else ""
                lines.append(f"   - 提示点 `{c.id}`：念到“{c.at}”{'开始' if c.edge == 'start' else '念完'}时{extra}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"
