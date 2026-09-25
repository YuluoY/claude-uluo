"""从 schema + defaults + presets 生成配置参数说明（references/config.md 由它生成，保证文档与配置一致）。"""
from __future__ import annotations

import json
from typing import Any

from .jsonutil import load_json
from .paths import DEFAULTS_PATH, PRESETS_PATH, SCHEMA_PATH

HEADER = """# 配置参数（video.config.json）

> 本文件由 `vp.py config --doc` 生成，不要手改；改 `config/video.config.schema.json` 或 `config/defaults.json` 后重新生成。

项目根目录的 `video.config.json` 只写想改的字段，其余按下面的顺序逐层合并：

1. 技能默认值 `config/defaults.json`
2. 用户级默认 `~/.config/video-production/defaults.json`（或环境变量 `VP_USER_DEFAULTS` 指向的文件），适合放个人常用音色、水印
3. 平台预设 `preset`（只覆盖画幅、安全区、字幕尺寸这类平台相关字段）
4. 项目 `video.config.json`

对象逐键合并，数组和标量整体替换。合并结果按 schema 校验，再检查跨字段约束（例如 crf 与 videoBitrate 只能设一个）。
`vp.py config` 打印某个项目合并后的完整配置。

最小示例：

```json
{
  "title": "Dijkstra 最短路径",
  "preset": "landscape-1080p",
  "genre": "algorithm",
  "style": "paper",
  "voice": { "voice": "zh-CN-XiaoxiaoNeural", "rate": "+5%" },
  "audio": { "bgm": { "file": "public/audio/bgm.mp3", "volumeDb": -26 } }
}
```
"""


def _type_text(s: dict) -> str:
    if "enum" in s:
        return " / ".join(json.dumps(e, ensure_ascii=False) for e in s["enum"])
    t = s.get("type")
    if isinstance(t, list):
        base = " 或 ".join(t)
    else:
        base = t or ""
    bounds = []
    if "minimum" in s:
        bounds.append(f"≥{s['minimum']}")
    if "exclusiveMinimum" in s:
        bounds.append(f">{s['exclusiveMinimum']}")
    if "maximum" in s:
        bounds.append(f"≤{s['maximum']}")
    if "pattern" in s:
        bounds.append(f"格式 `{s['pattern']}`")
    return base + (f"（{'，'.join(bounds)}）" if bounds else "")


def _default(defaults: Any, path: list[str]) -> str:
    cur = defaults
    for k in path:
        if not isinstance(cur, dict) or k not in cur:
            return ""
        cur = cur[k]
    if isinstance(cur, (dict,)):
        return ""
    text = json.dumps(cur, ensure_ascii=False)
    return text if len(text) <= 60 else text[:57] + "…"


def _cell(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def _walk(schema: dict, defaults: dict, path: list[str], rows: list[tuple[str, str, str, str]]) -> None:
    for key, sub in schema.get("properties", {}).items():
        if key.startswith("$"):
            continue
        p = path + [key]
        if sub.get("type") == "object" and "properties" in sub:
            if sub.get("description"):
                rows.append(("`" + ".".join(p) + "`", "对象", "", sub["description"]))
            _walk(sub, defaults, p, rows)
        else:
            rows.append(("`" + ".".join(p) + "`", _type_text(sub), _default(defaults, p), sub.get("description", "")))


def render_config_doc() -> str:
    schema = load_json(SCHEMA_PATH)
    defaults = load_json(DEFAULTS_PATH)
    presets = load_json(PRESETS_PATH)["presets"]
    rows: list[tuple[str, str, str, str]] = []
    _walk(schema, defaults, [], rows)
    out = [HEADER, "## 全部参数", "", "| 参数 | 类型 / 取值 | 默认值 | 说明 |", "|---|---|---|---|"]
    for r in rows:
        out.append("| " + " | ".join(_cell(x) for x in r) + " |")
    out += ["", "## 平台预设（preset）", "", "| 名称 | 说明 | 覆盖的字段 |", "|---|---|---|"]
    for name, p in presets.items():
        fields = []

        def flat(d: dict, prefix: str) -> None:
            for k, v in d.items():
                if isinstance(v, dict):
                    flat(v, prefix + k + ".")
                else:
                    fields.append(f"{prefix}{k}={json.dumps(v, ensure_ascii=False)}")

        flat(p["config"], "")
        out.append(f"| `{name}` | {_cell(p['description'])} | {_cell('，'.join(fields))} |")
    return "\n".join(out) + "\n"
