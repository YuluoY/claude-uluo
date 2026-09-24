from __future__ import annotations

import os
from pathlib import Path

from .errors import VPError

SKILL_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE_DIR = SKILL_ROOT / "template"
GENRES_DIR = SKILL_ROOT / "genres"
STYLES_DIR = SKILL_ROOT / "styles"
CONFIG_DIR = SKILL_ROOT / "config"
SCHEMA_PATH = CONFIG_DIR / "video.config.schema.json"
DEFAULTS_PATH = CONFIG_DIR / "defaults.json"
PRESETS_PATH = CONFIG_DIR / "presets.json"
STYLE_SCHEMA_PATH = STYLES_DIR / "style.schema.json"

USER_DEFAULTS_ENV = "VP_USER_DEFAULTS"
CONFIG_FILENAME = "video.config.json"


def user_defaults_path() -> Path:
    env = os.environ.get(USER_DEFAULTS_ENV)
    if env:
        return Path(env).expanduser()
    return Path.home() / ".config" / "video-production" / "defaults.json"


class Project:
    """一个视频项目目录内各文件的约定位置。"""

    def __init__(self, root: Path):
        self.root = Path(root).resolve()

    # 用户编辑的源文件
    @property
    def config_path(self) -> Path:
        return self.root / CONFIG_FILENAME

    @property
    def storyboard_path(self) -> Path:
        return self.root / "storyboard.json"

    @property
    def brief_path(self) -> Path:
        return self.root / "brief.md"

    # 生成的可读文件
    @property
    def script_md(self) -> Path:
        return self.root / "script.md"

    @property
    def transcript_md(self) -> Path:
        return self.root / "transcript.md"

    @property
    def transcript_txt(self) -> Path:
        return self.root / "transcript.txt"

    @property
    def timeline_path(self) -> Path:
        return self.root / "timeline.json"

    @property
    def captions_dir(self) -> Path:
        return self.root / "captions"

    @property
    def captions_json(self) -> Path:
        return self.captions_dir / "captions.json"

    def srt_path(self, name: str) -> Path:
        return self.captions_dir / f"{name}.srt"

    @property
    def proof_path(self) -> Path:
        """footage 模式：可校对的转写稿（只改错字，时间来自识别结果）。"""
        return self.captions_dir / "transcript.proof.json"

    @property
    def state_path(self) -> Path:
        return self.vp_dir / "state.json"

    # 音频
    @property
    def tts_dir(self) -> Path:
        return self.root / "audio" / "tts"

    @property
    def asr_dir(self) -> Path:
        return self.root / "audio" / "asr"

    @property
    def asr_path(self) -> Path:
        return self.asr_dir / "asr.json"

    @property
    def public_dir(self) -> Path:
        return self.root / "public"

    @property
    def narration_wav(self) -> Path:
        return self.public_dir / "audio" / "narration.wav"

    @property
    def mix_wav(self) -> Path:
        return self.public_dir / "audio" / "mix.wav"

    # Remotion 读取的生成数据
    @property
    def generated_dir(self) -> Path:
        return self.root / "src" / "generated"

    # 渲染与验收
    @property
    def renders_dir(self) -> Path:
        return self.root / "renders"

    @property
    def work_dir(self) -> Path:
        # 不用点开头的目录名：Remotion 渲染图片序列时路径里不能有点
        return self.renders_dir / "_work"

    @property
    def seq_dir(self) -> Path:
        return self.renders_dir / "_seq"

    @property
    def qa_dir(self) -> Path:
        return self.root / "qa"

    @property
    def footage_dir(self) -> Path:
        return self.root / "footage"

    @property
    def cover_dir(self) -> Path:
        return self.root / "cover"

    @property
    def vp_dir(self) -> Path:
        return self.root / ".vp"

    @property
    def node_modules(self) -> Path:
        return self.root / "node_modules"

    def rel(self, path: Path) -> str:
        try:
            return str(Path(path).resolve().relative_to(self.root))
        except ValueError:
            return str(path)

    def require(self) -> "Project":
        if not self.config_path.is_file():
            raise VPError(f"{self.root} 不是视频项目目录：缺少 {CONFIG_FILENAME}（先运行 vp.py init）")
        return self


def find_project(start: Path) -> Project:
    """从 start 向上查找含 video.config.json 的目录。"""
    cur = Path(start).resolve()
    for candidate in [cur, *cur.parents]:
        if (candidate / CONFIG_FILENAME).is_file():
            return Project(candidate)
    raise VPError(f"在 {cur} 及其上级目录中找不到 {CONFIG_FILENAME}；用 --project 指定项目目录")


def resolve_in_project(project: Project, rel_path: str, *, base: Path | None = None, what: str = "路径") -> Path:
    """把配置里的相对路径解析到项目内，拒绝绝对路径与 .. 越界。"""
    p = Path(rel_path)
    if p.is_absolute():
        raise VPError(f"{what} 必须是相对路径：{rel_path}")
    root = (base or project.root).resolve()
    resolved = (root / p).resolve()
    try:
        resolved.relative_to(root)
    except ValueError:
        raise VPError(f"{what} 越出了 {root}：{rel_path}") from None
    return resolved
