"""Cross-platform CJK font resolution for diagram-compiler.

Usage:
    from _shared.fonts import setup_cjk_fonts
    setup_cjk_fonts()  # call once at start of any render function
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Platform-ordered font search paths
_CJK_SEARCH_PATHS = [
    # macOS
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
    # Linux
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    # Windows
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/msyhbd.ttc",
    "C:/Windows/Fonts/simsun.ttc",
]

# Fallback font family names (used when no font file is found)
_CJK_FALLBACK_FAMILIES = [
    "STHeiti", "PingFang SC", "Hiragino Sans GB",
    "Noto Sans CJK SC", "Noto Sans CJK",
    "WenQuanYi Zen Hei", "WenQuanYi Micro Hei",
    "Microsoft YaHei", "SimHei",
    "sans-serif",
]

_cached_font_name: str | None = None
_cached_font_path: str | None = None


def find_cjk_font() -> tuple[str | None, str | None]:
    """Find an available CJK font. Returns (family_name, file_path) or (None, None)."""
    global _cached_font_name, _cached_font_path
    if _cached_font_name is not None:
        return _cached_font_name, _cached_font_path

    # First, try known file paths (for matplotlib font_manager.addfont)
    for fp in _CJK_SEARCH_PATHS:
        if Path(fp).exists():
            _cached_font_path = fp
            break

    # Then, try font family names via matplotlib
    try:
        import matplotlib.font_manager as fm
        available = {f.name for f in fm.fontManager.ttflist}
        for family in _CJK_FALLBACK_FAMILIES:
            if family in available:
                _cached_font_name = family
                break
    except Exception:
        pass

    # If we found a file but no family name, try to extract it
    if _cached_font_path and not _cached_font_name:
        try:
            import matplotlib.font_manager as fm
            prop = fm.FontProperties(fname=_cached_font_path)
            _cached_font_name = prop.get_name()
        except Exception:
            _cached_font_name = _CJK_FALLBACK_FAMILIES[-1]  # "sans-serif"

    if not _cached_font_name:
        _cached_font_name = _CJK_FALLBACK_FAMILIES[-1]

    return _cached_font_name, _cached_font_path


def setup_cjk_fonts() -> str:
    """Register CJK fonts with matplotlib. Returns the resolved font family name.

    Call this once at the start of any Matplotlib render function.
    """
    import matplotlib
    import matplotlib.font_manager as fm
    import matplotlib.pyplot as plt

    font_name, font_path = find_cjk_font()

    # Register font file if found
    if font_path:
        try:
            fm.fontManager.addfont(font_path)
        except Exception:
            pass

    # Set as default
    matplotlib.rcParams["font.family"] = [font_name] + [
        f for f in _CJK_FALLBACK_FAMILIES if f != font_name
    ]
    matplotlib.rcParams["axes.unicode_minus"] = False

    return font_name
