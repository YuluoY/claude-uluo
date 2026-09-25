"""版面预检：在渲染前按与 template/src/engine/layout.ts 相同的公式算出内容区、字幕带、章节条，
发现配置层面就注定放不下的问题（字幕一行放不下、内容区被挤得太小、章节名放不下）。

渲染后的精确检测由 vp.py layout（浏览器里实测 DOM）完成；这里只做能提前确定的部分。
改 layout.ts 的公式要同步改这里。
"""
from __future__ import annotations

from typing import Optional

from .textproc import display_width

MARGINS = {"landscape": (0.055, 0.065), "square": (0.07, 0.06), "portrait": (0.075, 0.045)}


def aspect_of(w: float, h: float) -> str:
    r = w / h
    if r >= 1.3:
        return "landscape"
    if r <= 0.8:
        return "portrait"
    return "square"


def frame_layout(cfg: dict, theme: dict, width: Optional[int] = None, height: Optional[int] = None) -> dict:
    W = width or cfg["video"]["width"]
    H = height or cfg["video"]["height"]
    unit = min(W, H) / 1080
    sa = cfg["video"]["safeArea"]
    safe = {"x": sa["left"] / 100 * W, "y": sa["top"] / 100 * H, "w": W * (1 - (sa["left"] + sa["right"]) / 100), "h": H * (1 - (sa["top"] + sa["bottom"]) / 100)}
    mxr, myr = MARGINS[aspect_of(W, H)]
    mx, my = mxr * W, myr * H
    cb = cfg["overlays"]["chapterBar"]
    chapter_bar = None
    inner_top = safe["y"] + my
    inner_bottom = safe["y"] + safe["h"] - my
    lift = 0.0
    if cb["enabled"] and cfg["mode"] == "produce":
        ch, gap = cb["height"] * unit, 14 * unit
        ruler = cb.get("style") == "ruler"
        if cb["position"] == "top":
            chapter_bar = ({"x": 0, "y": 0, "w": W, "h": ch} if ruler
                           else {"x": safe["x"] + mx, "y": safe["y"] + gap, "w": safe["w"] - 2 * mx, "h": ch})
            inner_top = chapter_bar["y"] + ch + my * 0.5
        else:
            chapter_bar = ({"x": 0, "y": H - ch, "w": W, "h": ch} if ruler
                           else {"x": safe["x"] + mx, "y": safe["y"] + safe["h"] - gap - ch, "w": safe["w"] - 2 * mx, "h": ch})
            inner_bottom = chapter_bar["y"] - my * 0.5
            lift = ch + gap
    gutter = round(theme["space"] * unit)
    top = inner_top
    page_on = cfg["overlays"].get("pageNumber", True) is not False
    header_empty = (not page_on) and chapter_bar
    if theme["chrome"]["header"] and cfg["overlays"].get("header", True) is not False and not header_empty:
        top = inner_top + theme["type"]["small"] * unit * 1.5 + gutter
    captions = None
    c = cfg["captions"]
    burn = c["enabled"] and c["render"] in ("burn", "both")
    bottom = inner_bottom
    if burn:
        st = c["style"]
        pad = st["fontSize"] * (0.36 if st["background"] else 0.2) + st["strokeWidth"]
        ch_ = st["fontSize"] * st["lineHeight"] * c["maxLines"] + pad * 2
        cb_bottom = (st["bottomPct"] + sa["bottom"]) / 100 * H + lift
        captions = {"x": 0, "y": H - cb_bottom - ch_, "w": W, "h": ch_}
        bottom = min(bottom, captions["y"] - gutter * 0.75)
    content = {"x": safe["x"] + mx, "y": top, "w": safe["w"] - 2 * mx, "h": max(1.0, bottom - top)}
    return {"width": W, "height": H, "unit": unit, "safe": safe, "chapterBar": chapter_bar, "captions": captions, "content": content, "gutter": gutter}


def layout_errors(cfg: dict, theme: dict, *, chapters: Optional[list[str]] = None, width: Optional[int] = None, height: Optional[int] = None) -> tuple[list[str], list[str]]:
    """返回（错误, 警告）。"""
    errs: list[str] = []
    warns: list[str] = []
    f = frame_layout(cfg, theme, width, height)
    W, H = f["width"], f["height"]
    ratio = f["content"]["h"] / H
    if ratio < 0.38:
        errs.append(
            f"内容区只剩画面高度的 {ratio:.0%}（安全区、页边距、页眉、章节条、字幕带占掉了太多）："
            "调小 captions.style.fontSize / maxLines / bottomPct，或关掉 chapterBar，或换没有页眉的风格"
        )
    c = cfg["captions"]
    if c["enabled"] and c["render"] in ("burn", "both"):
        st = c["style"]
        # 汉字按 1em 宽，描边两侧各占 strokeWidth
        need = c["maxCharsPerLine"] * st["fontSize"] + st["strokeWidth"] * 2 + (st["fontSize"] if st["background"] else 0)
        have = st["maxWidthPct"] / 100 * W
        if need > have:
            fs = int((have - st["strokeWidth"] * 2) / (c["maxCharsPerLine"] + (1 if st["background"] else 0)))
            errs.append(
                f"字幕一行 {c['maxCharsPerLine']:g} 个字 × {st['fontSize']:g}px 需要 {need:.0f}px，超过字幕最大宽度 {have:.0f}px"
                f"（{st['maxWidthPct']:g}% × {W}）：把 captions.style.fontSize 调到 {fs} 以下，或减小 maxCharsPerLine"
            )
    bar = f["chapterBar"]
    if bar and chapters:
        n = len(chapters)
        gap = 8 * f["unit"]
        cell = (bar["w"] - gap * (n - 1)) / n
        fs = min(bar["h"] * 0.42, theme["type"]["small"] * f["unit"])
        longest = max(chapters, key=display_width)
        need = display_width(longest) * fs + fs * 1.2
        if cell < fs * 3.2:
            errs.append(f"章节条有 {n} 个章节，每格只有 {cell:.0f}px，放不下章节名：合并章节，或把 chapterBar.position 放到更宽的画幅")
        elif need > cell and cfg["overlays"]["chapterBar"]["widths"] == "equal":
            warns.append(f"章节名“{longest}”在章节条里放不下（每格 {cell:.0f}px），会显示为省略号：缩短章节名")
    if bar is not None and not chapters:
        warns.append("开启了章节条，但 storyboard 里没有给镜头写 chapter：章节条会只有一格")
    return errs, warns
