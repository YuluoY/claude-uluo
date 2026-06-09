#!/usr/bin/env python3
"""N-Tier Layered Architecture Diagram — data-driven, Matplotlib-rendered.

Usage:
    python3 layered_architecture.py                          # default layout + default theme
    python3 layered_architecture.py --theme dark            # switch theme
    python3 layered_architecture.py --layout custom.yaml    # custom architecture
    python3 layered_architecture.py --theme warm -o my.png  # custom output
"""

import sys
import argparse
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None

THIS_DIR = Path(__file__).resolve().parent.parent  # scripts/
ROOT_DIR = THIS_DIR.parent
sys.path.insert(0, str(THIS_DIR))
OUTPUT_DIR = ROOT_DIR / "output"

ARCH_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "architecture-themes.yaml"
DEFAULT_LAYOUT_PATH = ROOT_DIR / "assets" / "layouts" / "architecture-layout.yaml"


def load_theme(theme_name: str | None = None) -> dict:
    """Load and resolve architecture theme."""
    if not ARCH_THEMES_PATH.exists() or yaml is None:
        return _default_theme()

    with open(ARCH_THEMES_PATH) as f:
        raw = yaml.safe_load(f) or {}

    themes = raw.get("themes", {})
    active = theme_name or raw.get("active_theme", "default")
    theme = themes.get(active, themes.get("default", {}))
    if not theme:
        return _default_theme()

    # Apply custom overrides
    custom = raw.get("custom", {}) or {}
    for k, v in custom.items():
        if isinstance(v, dict) and isinstance(theme.get(k), list):
            for idx_str, color in v.items():
                idx = int(idx_str)
                if 0 <= idx < len(theme[k]):
                    theme[k][idx] = color
        else:
            theme[k] = v

    return theme


def load_layout(path: Path | None = None) -> dict:
    """Load architecture layout from YAML. Falls back to built-in default."""
    if path is None:
        path = DEFAULT_LAYOUT_PATH
    if path and path.exists() and yaml is not None:
        with open(path) as f:
            return yaml.safe_load(f) or {}
    if path and path.exists() and yaml is None and path != DEFAULT_LAYOUT_PATH:
        raise RuntimeError("Reading a custom YAML layout requires PyYAML")
    return _default_layout()


def _default_theme() -> dict:
    return {
        "canvasBg": "#ffffff",
        "layer_colors": ["#e8f5e9","#eef7ee","#eef7ee","#e3f2fd","#e8f5e9","#e3f2fd","#eef7ee","#fff3e0"],
        "module_bg": "#ffffff", "module_border": "#555555", "module_text": "#1a1a1a",
        "label_bg": "#c8e6c9", "label_text": "#444444",
        "arrow_color": "#333333", "dash_color": "#999999",
        "highlight_yellow": "#fff9c4", "highlight_red": "#e53935", "highlight_blue": "#1e88e5",
    }


def _default_layout() -> dict:
    from architecture import _default_layout as architecture_default_layout
    return architecture_default_layout()


def main():
    parser = argparse.ArgumentParser(description="N-Tier Layered Architecture Diagram (Matplotlib)")
    parser.add_argument("--theme", "-t", help="Theme: default, dark, warm, business")
    parser.add_argument("--layout", "-l", help="Path to custom layout YAML")
    parser.add_argument("--out", "-o", help="Output PNG path")
    parser.add_argument("--transparent", action="store_true",
                        help="导出透明背景（默认跟随主题背景色）")
    args = parser.parse_args()

    theme = load_theme(args.theme)
    layout_path = Path(args.layout) if args.layout else None
    layout = load_layout(layout_path)
    out = Path(args.out) if args.out else OUTPUT_DIR / "java-web-architecture.png"
    out.parent.mkdir(parents=True, exist_ok=True)

    print(f"Theme: {args.theme or 'default'}  |  Layout: {args.layout or 'default'}"
          f"{'  |  Transparent BG' if args.transparent else ''}")
    print("Rendering via Matplotlib...")

    from architecture import render_architecture
    render_architecture(layout, theme, out, dpi=150, transparent=args.transparent)

    from PIL import Image
    img = Image.open(out)
    print(f"OK  {img.size[0]}x{img.size[1]} px  {out.stat().st_size//1024} KB")
    print(f"Output: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
