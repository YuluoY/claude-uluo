"""Diagram Studio — 公共工具模块。

提供所有图表类型共享的基础设施：
- 样式注入与校验
- 主题加载与配置
- 图片导出
- 输入/输出处理
- 通用语法检查
"""

import json
import re
import subprocess
import sys
from pathlib import Path

# ─── 默认样式 ───────────────────────────────────────────────

DEFAULT_THEME_VARIABLES = {
    "primaryColor": "#ffffff",
    "primaryBorderColor": "#888888",
    "primaryTextColor": "#333333",
    "lineColor": "#666666",
    "secondaryColor": "#f5f5f5",
    "tertiaryColor": "#fafafa",
}

THEME_VARIABLES_ALL = [
    "primaryColor", "primaryBorderColor", "primaryTextColor",
    "secondaryColor", "secondaryBorderColor", "secondaryTextColor",
    "tertiaryColor", "tertiaryBorderColor", "tertiaryTextColor",
    "lineColor", "textColor", "mainBkg", "nodeBorder",
    "clusterBkg", "clusterBorder", "titleColor",
    "edgeLabelBackground", "fontFamily", "fontSize",
]

BUILTIN_THEMES = {"default", "neutral", "dark", "forest", "base"}

# ─── 主题加载 ───────────────────────────────────────────────

_diagram_themes_path: Path | None = None


def set_themes_path(path: Path):
    """设置 diagram-themes.yaml 的路径。"""
    global _diagram_themes_path
    _diagram_themes_path = path


def load_diagram_theme(theme_name: str | None = None) -> dict | None:
    """从 diagram-themes.yaml 加载当前主题的 themeVariables dict。

    返回 None 表示无配置文件（调用方应使用 DEFAULT_THEME_VARIABLES）。
    """
    if _diagram_themes_path is None or not _diagram_themes_path.exists():
        return None
    try:
        import yaml
        with open(_diagram_themes_path) as f:
            raw = yaml.safe_load(f) or {}
    except Exception:
        return None

    themes = raw.get("themes", {})
    active = theme_name or raw.get("active_theme", "default")
    theme = themes.get(active, themes.get("default", {}))
    if not theme:
        return None

    # Separate Mermaid themeVariables from metadata keys (like backgroundColor)
    mermaid_keys = {k for k in theme if k in THEME_VARIABLES_ALL}
    meta_keys = {k for k in theme if k not in THEME_VARIABLES_ALL}
    result = {k: theme[k] for k in mermaid_keys}
    result.update({k: theme[k] for k in meta_keys})

    # Apply custom overrides
    custom = raw.get("custom", {}) or {}
    result.update({k: v for k, v in custom.items() if k in THEME_VARIABLES_ALL and v is not None})

    return result if result else None


# ─── 样式构造与校验 ───────────────────────────────────────────


def make_style_init(overrides: dict | None = None) -> str:
    """构造默认样式 init 指令字符串。"""
    tv = dict(DEFAULT_THEME_VARIABLES)
    if overrides:
        tv.update(overrides)
    vars_json = json.dumps(tv)
    return f"%%{{init: {{'theme':'base', 'themeVariables': {vars_json} }} }}%%"


def has_style_init(diagram: str) -> bool:
    """检查是否已有 %%{init:...}%% 样式声明。"""
    return "%%{init:" in diagram


def inject_default_style(diagram: str, overrides: dict | None = None) -> str:
    """如果图表没有样式声明，自动注入默认样式。"""
    if has_style_init(diagram):
        return diagram
    lines = diagram.split("\n")
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped and not stripped.startswith("%%"):
            lines.insert(i, make_style_init(overrides))
            break
    return "\n".join(lines)


def extract_theme(diagram: str) -> dict | None:
    """提取图表中的 theme 配置，无配置返回 None。"""
    m = re.search(r"%%\{init:\s*(\{.*?\})\}%%", diagram, re.DOTALL)
    if not m:
        return None
    try:
        s = m.group(1).replace("'", '"')
        return json.loads(s)
    except json.JSONDecodeError:
        return None


def validate_style(diagram: str) -> list[dict]:
    """校验样式配置，返回问题列表。"""
    problems = []
    config = extract_theme(diagram)
    if config is None:
        problems.append({
            "type": "style",
            "message": "缺少 %%{init: ...}%% 样式声明",
            "fix": "使用 'python mermaid.py style' 自动注入默认样式"
        })
        return problems

    theme = config.get("theme", "")
    if theme and theme not in BUILTIN_THEMES:
        problems.append({
            "type": "style",
            "message": f"不支持的 theme '{theme}'，可用: {', '.join(sorted(BUILTIN_THEMES))}",
            "fix": f"改用内置 theme: {', '.join(sorted(BUILTIN_THEMES))}"
        })

    variables = config.get("themeVariables", {})
    for k in variables:
        if k not in THEME_VARIABLES_ALL:
            problems.append({
                "type": "style",
                "message": f"未知 themeVariable: '{k}'",
                "fix": f"可用变量: primaryColor, primaryBorderColor, lineColor..."
            })
    return problems


def enforce_default_style(diagram: str, theme_overrides: dict | None = None) -> tuple[str, list[dict]]:
    """强制注入默认样式（或指定主题样式）。返回 (修正后图表, 变更记录)。

    当 theme_overrides 为 None 时使用 DEFAULT_THEME_VARIABLES；
    传入 dict 时使用合并后的自定义配色。
    """
    expected = dict(DEFAULT_THEME_VARIABLES)
    if theme_overrides:
        expected.update(theme_overrides)

    changes = []
    if not has_style_init(diagram):
        result = inject_default_style(diagram, overrides=theme_overrides)
        changes.append({
            "type": "style",
            "action": "injected",
            "message": "已注入样式声明"
        })
        return result, changes

    config = extract_theme(diagram)
    if config is None:
        return diagram, changes

    variables = config.get("themeVariables", {})
    needs_fix = any(
        k in variables and variables[k] != v
        for k, v in expected.items()
    )
    if needs_fix:
        config["theme"] = "base"
        config["themeVariables"] = dict(expected)
        result = _replace_config(diagram, config, theme_overrides)
        changes.append({
            "type": "style",
            "action": "corrected",
            "message": "已修正 themeVariables"
        })
        return result, changes
    return diagram, changes


def _replace_config(diagram: str, config: dict, overrides: dict | None = None) -> str:
    """替换图表中的 %%{init:...}%% 为新配置。"""
    clean = make_style_init(overrides)
    if "%%{init:" in diagram:
        return re.sub(r"%%\{init:.*?\}%%", clean, diagram, count=1, flags=re.DOTALL)
    return inject_default_style(diagram, overrides)


# ─── 输入/输出处理 ───────────────────────────────────────────

def read_input(source: str) -> str:
    """读取输入，支持文件路径和 stdin("-")。"""
    if source == "-":
        return sys.stdin.read()
    return Path(source).read_text(encoding="utf-8")


def extract_mermaid_blocks(content: str) -> list[tuple[str, int]]:
    """从 Markdown 文本中提取所有 ```mermaid 代码块。"""
    return [(m.group(1).strip(), m.start())
            for m in re.finditer(r"```mermaid\s*\n(.*?)```", content, re.DOTALL)]


def find_closing_fence(text: str, start: int) -> int:
    """找到 ``` 的结束位置。"""
    idx = text.find("```", start)
    return idx if idx >= 0 else len(text)


# ─── 图片导出 ───────────────────────────────────────────────

def _resolve_export_background(transparent: bool = False,
                               theme_name: str | None = None) -> str:
    """Resolve the background color for image export.

    Priority:
    1. If transparent=True  → "transparent"
    2. Theme's backgroundColor field → use it
    3. Fallback → "#ffffff"
    """
    if transparent:
        return "transparent"
    theme = load_diagram_theme(theme_name)
    if theme and theme.get("backgroundColor"):
        return theme["backgroundColor"]
    return "#ffffff"


# ─── 依赖检查 ───────────────────────────────────────────────

def check_dependencies() -> dict:
    """检查运行所需的外部依赖。返回 {dep_name: status}。

    status: 'ok' | 'missing' | 'warning'
    """
    import shutil
    import shutil as _shutil

    deps = {}

    # mmdc (Mermaid CLI)
    mmdc_path = _shutil.which("mmdc")
    if mmdc_path:
        deps["mmdc"] = "ok"
    else:
        deps["mmdc"] = "missing"

    # PyYAML
    try:
        import yaml
        deps["PyYAML"] = "ok"
    except ImportError:
        deps["PyYAML"] = "missing"

    # CJK Font (cross-platform)
    cjk_fonts = [
        # macOS
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/System/Library/Fonts/PingFang.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        # Linux
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        # Windows
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simsun.ttc",
    ]
    if any(Path(f).exists() for f in cjk_fonts):
        deps["CJK_font"] = "ok"
    else:
        deps["CJK_font"] = "warning"

    return deps


def format_dependency_help(deps: dict) -> str:
    """格式化依赖帮助信息。"""
    lines = []
    if deps.get("mmdc") == "missing":
        lines.append("❌ mmdc (Mermaid CLI) 未安装")
        lines.append("   安装: npm install -g @mermaid-js/mermaid-cli")
        lines.append("         npx puppeteer browsers install chrome")
    if deps.get("PyYAML") == "missing":
        lines.append("❌ PyYAML 未安装")
        lines.append("   安装: pip install pyyaml")
    if deps.get("CJK_font") == "warning":
        lines.append("⚠️  未找到中文字体，图表中文可能显示为方块")
        lines.append("   macOS: 系统自带 STHeiti/PingFang")
        lines.append("   Linux: apt install fonts-noto-cjk")
        lines.append("   Windows: 系统自带 Microsoft YaHei")
    if not lines:
        lines.append("✅ 所有依赖已就绪")
    return "\n".join(lines)


def export_image(diagram: str, output: str, scale: int = 2,
                 width: int = 0, height: int = 0,
                 background: str | None = None,
                 transparent: bool = False) -> dict:
    """通过 mmdc 导出图片。

    background: CSS 颜色值或 "transparent"。为 None 时从主题自动推断。
    transparent: True 时强制透明背景（覆盖 background 参数）。
    """
    tmp = Path("/tmp/mermaid-export.mmd")
    tmp.write_text(diagram, encoding="utf-8")

    if background is None:
        background = _resolve_export_background(transparent=transparent)
    elif transparent:
        background = "transparent"

    cmd = ["mmdc", "-i", str(tmp), "-o", output, "-b", background, "-s", str(scale)]
    if width:
        cmd.extend(["-w", str(width)])
    if height:
        cmd.extend(["-H", str(height)])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        tmp.unlink(missing_ok=True)
        if result.returncode != 0:
            return {"success": False, "error": result.stderr.strip() or "mmdc 导出失败"}
        return {"success": True, "output": output}
    except FileNotFoundError:
        tmp.unlink(missing_ok=True)
        return {
            "success": False,
            "error": "mmdc 未安装",
            "fix": "npm install -g @mermaid-js/mermaid-cli && npx puppeteer browsers install chrome"
        }
    except subprocess.TimeoutExpired:
        tmp.unlink(missing_ok=True)
        return {"success": False, "error": "导出超时"}


# ─── 通用语法校验 ───────────────────────────────────────────

RESERVED_NODES = {"end", "End", "END"}


def check_reserved_node_labels(diagram: str, diagram_type: str) -> list[dict]:
    """检查节点标签是否使用了 Mermaid 保留字。"""
    problems = []
    for i, line in enumerate(diagram.split("\n"), 1):
        stripped = line.strip()
        if stripped.startswith("%%") or stripped.startswith("style ") or stripped.startswith("classDef "):
            continue
        for m in re.finditer(r'[\[\(\{]([^\[\]\(\)\{\}]*\bend\b[^\[\]\(\)\{\}]*)[\]\)\}]', stripped, re.IGNORECASE):
            problems.append({
                "type": "error",
                "line": i,
                "message": f"节点标签包含 Mermaid 保留字 'end': {m.group(1)[:30]}...",
                "fix": "将 'end' 改为 'End' 或 'END'"
            })
    return problems


def check_node_count(diagram: str, max_nodes: int = 40) -> list[dict]:
    """检查节点数是否过多。"""
    nodes = re.findall(r'\b\w+\s*[\[\(\{\(\[\(\"]', diagram)
    if len(nodes) > max_nodes:
        return [{
            "type": "quality",
            "message": f"节点数 ({len(nodes)}) 超过建议上限 ({max_nodes})",
            "fix": "拆分为多个图表或用 subgraph 分组"
        }]
    return []


def check_long_labels(diagram: str, max_len: int = 60) -> list[dict]:
    """检查是否有过长的标签。"""
    problems = []
    for i, line in enumerate(diagram.split("\n"), 1):
        for m in re.finditer(r'\[([^\]]{' + str(max_len) + r',})\]', line):
            problems.append({
                "type": "quality",
                "line": i,
                "message": f"标签过长 ({len(m.group(1))} 字符)",
                "fix": "使用 <br/> 换行或精简文字"
            })
    return problems


def format_problems(problems: list[dict], prefix: str = "  ") -> str:
    """格式化问题列表为可读文本。"""
    if not problems:
        return ""
    lines = []
    emoji = {"error": "🔴", "warning": "🟡", "style": "🎨", "quality": "💡"}
    for p in problems:
        e = emoji.get(p["type"], "❓")
        lines.append(f"{prefix}{e} [{p['type']}] {p['message']}")
        if p.get("fix"):
            lines.append(f"{prefix}   修复: {p['fix']}")
    return "\n".join(lines)


def print_problems(problems: list[dict]):
    """打印问题列表。"""
    if not problems:
        print("✅ 检查通过")
        return
    errors = [p for p in problems if p["type"] == "error"]
    warnings = [p for p in problems if p["type"] == "warning"]
    others = [p for p in problems if p["type"] not in ("error", "warning")]
    print(f"⚠️  {len(errors)} 错误, {len(warnings)} 警告, {len(others)} 建议\n")
    print(format_problems(problems, ""))


# ─── 断言工具 ───────────────────────────────────────────────

def assert_starts_with(diagram: str, expected: str | tuple[str, ...]) -> list[dict]:
    """校验图表必须以指定类型开头。"""
    first = diagram.strip().split("\n")[0].strip()
    if first.startswith("%%"):
        # 跳过 init 行
        for line in diagram.strip().split("\n"):
            stripped = line.strip()
            if stripped and not stripped.startswith("%%"):
                first = stripped
                break
    expected_set = {expected} if isinstance(expected, str) else set(expected)
    if not any(first.startswith(e) for e in expected_set):
        return [{
            "type": "error",
            "line": 0,
            "message": f"图表类型错误，期望 '{expected}' 开头，实际: '{first}'",
            "fix": f"将首行改为 '{expected}'"
        }]
    return []
