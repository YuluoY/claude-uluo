"""Canvas-based diagram engine.

Precise Canvas 2D drawing for diagram output.
Supports both architecture diagrams (direct Canvas draw) and
Mermaid diagrams (SVG→Image→Canvas bridge).

Usage:
    from _shared.canvas_engine import render_architecture, render_mermaid
"""

import json
import subprocess
import shutil
import textwrap
from pathlib import Path

import numpy as np
from PIL import Image

THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent

CANVAS_DPI = 2          # Canvas native pixel scale
CANVAS_WIDTH = 1600     # Logical (CSS) width for architecture diagrams
FONT_FAMILY = '"Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif'


def _find_chrome() -> str | None:
    for c in [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        shutil.which("google-chrome"), shutil.which("chromium"),
    ]:
        if c and Path(c).exists():
            return c
    return None


# ═══════════════════════════════════════════════════════════════
#  Architecture Diagram: Canvas direct draw
# ═══════════════════════════════════════════════════════════════

ARCH_JS_TEMPLATE = """\
const LAYOUT = {layout_json};
const THEME = {theme_json};
const DPR = {dpr};
const FW = {canvas_w};
const PAD = 24;        // padding inside each layer
const GAP = 10;        // gap between blocks
const ARROW_H = 32;    // arrow height between layers
const LABEL_W = 110;   // layer label width
const L_MIN_H = 60;    // minimum layer body height

const FONT = '{font_family}';

// ─── Canvas setup ───
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
ctx.scale(DPR, DPR);

// ─── Layout calculation ───
// Measure how much height each layer needs
function calcBlockHeight(block) {{
    switch(block.type) {{
        case 'group': return Math.max(block.columns.reduce((s,c)=>s+c.items.length,0) * 22 + 44, 100);
        case 'modular-block': return 80;
        case 'ajax-block': return 72;
        case 'device': return 90;
        case 'side-modules': return block.items.length * 32 + 16;
        default: return block.style === 'large' ? 52 : 40;
    }}
}}

function calcLayerContentHeight(layer) {{
    if (!layer.blocks || layer.blocks.length === 0) return L_MIN_H;
    // For group + side-modules, the group dictates height
    const hasGroup = layer.blocks.some(b => b.type === 'group');
    if (hasGroup) {{
        const g = layer.blocks.find(b => b.type === 'group');
        return calcBlockHeight(g) + PAD*2;
    }}
    return Math.max(...layer.blocks.map(calcBlockHeight)) + PAD*2;
}}

// Calculate total height
let totalH = 0;
const layerHeights = [];
for (const layer of LAYOUT.layers) {{
    const h = calcLayerContentHeight(layer);
    layerHeights.push(h);
    totalH += h + (LAYOUT.arrows !== false ? ARROW_H : 0);
}}
if (LAYOUT.arrows !== false) totalH -= ARROW_H;

canvas.width = Math.round(FW * DPR);
canvas.height = Math.round(totalH * DPR);
canvas.style.width = FW + 'px';
canvas.style.height = totalH + 'px';

// ─── Drawing helpers ───
function darken(hex, factor=0.82) {{
    const c = hex.replace('#','');
    const r = Math.round(parseInt(c.substring(0,2),16) * factor);
    const g = Math.round(parseInt(c.substring(2,4),16) * factor);
    const b = Math.round(parseInt(c.substring(4,6),16) * factor);
    return '#' + [r,g,b].map(v=>Math.min(255,v).toString(16).padStart(2,'0')).join('');
}}

function drawDashedRect(x,y,w,h,color) {{
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x+0.75, y+0.75, w-1.5, h-1.5);
    ctx.setLineDash([]);
    ctx.restore();
}}

function drawModule(x,y,w,h,text,opts={{}}) {{
    ctx.fillStyle = opts.bg || THEME.module_bg || '#ffffff';
    ctx.fillRect(x,y,w,h);
    ctx.strokeStyle = opts.border || THEME.module_border || '#555';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.strokeRect(x,y,w,h);
    ctx.fillStyle = opts.color || THEME.module_text || '#1a1a1a';
    const fs = (opts.style === 'large') ? 15 : 13;
    ctx.font = (opts.style==='large'?'bold ':'') + fs + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w/2, y + h/2);
}}

function drawArrow(cx, y) {{
    ctx.strokeStyle = THEME.arrow_color || '#333';
    ctx.fillStyle = THEME.arrow_color || '#333';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, y + ARROW_H - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx-8, y + ARROW_H - 16);
    ctx.lineTo(cx+8, y + ARROW_H - 16);
    ctx.lineTo(cx, y + ARROW_H - 4);
    ctx.fill();
}}

// ─── Layer drawing ───
let y = 0;
for (let li = 0; li < LAYOUT.layers.length; li++) {{
    const layer = LAYOUT.layers[li];
    const lh = layerHeights[li];
    const lc = THEME.layer_colors || ['#e8f5e9'];
    const bg = lc[li % lc.length];
    const lbg = darken(bg);

    // Layer background
    ctx.fillStyle = bg;
    ctx.fillRect(0, y, FW, lh);

    // Dashed border
    drawDashedRect(0, y, FW, lh, THEME.dash_color || '#999');

    // Label area
    ctx.fillStyle = lbg;
    ctx.fillRect(0, y, LABEL_W, lh);
    ctx.fillStyle = THEME.label_text || '#444';
    ctx.font = 'bold 14px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(layer.label, LABEL_W/2, y + lh/2);

    // Blocks
    const bodyX = LABEL_W + PAD;
    const bodyW = FW - LABEL_W - PAD*2;
    const bodyH = lh - PAD*2;
    const bodyY = y + PAD;

    const blocks = layer.blocks || [];
    if (blocks.length > 0) {{
        const totalFlex = blocks.reduce((s,b)=>s+(b.width||1),0);
        const totalGap = (blocks.length - 1) * GAP;
        const availW = bodyW - totalGap;
        let bx = bodyX;

        for (const block of blocks) {{
            const flexW = (block.width || 1) / totalFlex * availW;
            const bh = bodyH;
            const by = bodyY;

            switch(block.type) {{
                case 'module':
                    drawModule(bx, by, flexW, bh, block.text,
                        {{style: block.style}});
                    break;
                case 'highlight':
                    const hlColors = {{
                        yellow: THEME.highlight_yellow || '#fff9c4',
                        red: THEME.highlight_red || '#e53935',
                        blue: THEME.highlight_blue || '#1e88e5'
                    }};
                    const hlbg = hlColors[block.color] || hlColors.yellow;
                    const hlfg = block.color === 'red' || block.color === 'blue' ? '#fff' : '#1a1a1a';
                    drawModule(bx, by, flexW, bh, block.text,
                        {{bg: hlbg, border: '#bbb', color: hlfg, style: block.style}});
                    break;
                case 'device':
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(bx, by, flexW, bh);
                    ctx.strokeStyle = '#bbb';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bx, by, flexW, bh);
                    // Icon
                    ctx.font = '26px ' + FONT;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(block.icon, bx + flexW/2, by + bh*0.4);
                    // Label
                    ctx.fillStyle = '#555';
                    ctx.font = '11px ' + FONT;
                    ctx.fillText(block.text, bx + flexW/2, by + bh*0.75);
                    break;
                case 'ajax-block':
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(bx, by, flexW, bh);
                    ctx.strokeStyle = '#555';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(bx, by, flexW, bh);
                    ctx.fillStyle = '#1a1a1a';
                    ctx.font = 'bold 13px ' + FONT;
                    ctx.fillText('Ajax', bx + flexW/2, by + bh*0.3);
                    const verbs = block.verbs || ['POST','GET'];
                    const vw = Math.min(60, (flexW - 20) / verbs.length);
                    verbs.forEach((v,vi) => {{
                        const vx = bx + flexW/2 - (verbs.length*vw + (verbs.length-1)*6)/2 + vi*(vw+6);
                        const vy = by + bh*0.55;
                        ctx.fillStyle = '#fafafa';
                        ctx.fillRect(vx, vy, vw, 22);
                        ctx.strokeStyle = '#888';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(vx, vy, vw, 22);
                        ctx.fillStyle = '#1a1a1a';
                        ctx.font = '11px ' + FONT;
                        ctx.fillText(v, vx + vw/2, vy + 11);
                    }});
                    break;
                case 'group':
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(bx, by, flexW, bh);
                    ctx.strokeStyle = '#555';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(bx, by, flexW, bh);
                    // Title
                    ctx.fillStyle = '#1a1a1a';
                    ctx.font = 'bold 14px ' + FONT;
                    ctx.fillText(block.title, bx + flexW/2, by + 16);
                    // Columns
                    const cols = block.columns || [];
                    const cgap = 8;
                    const cmargin = 12;
                    const cw = (flexW - cmargin*2 - (cols.length-1)*cgap) / cols.length;
                    const cx0 = bx + cmargin;
                    const cy0 = by + 28;
                    const ch = bh - 36;
                    cols.forEach((col, ci) => {{
                        const cx = cx0 + ci*(cw + cgap);
                        // Column title
                        ctx.fillStyle = '#999';
                        ctx.font = '10px ' + FONT;
                        ctx.fillText(col.title, cx + cw/2, cy0 + 10);
                        // Items
                        const ih = Math.min(22, (ch - 16) / col.items.length);
                        col.items.forEach((item, ii) => {{
                            const iy = cy0 + 18 + ii * (ih + 3);
                            ctx.fillStyle = '#fff';
                            ctx.fillRect(cx, iy, cw, ih);
                            ctx.strokeStyle = '#999';
                            ctx.lineWidth = 1;
                            ctx.strokeRect(cx, iy, cw, ih);
                            ctx.fillStyle = '#1a1a1a';
                            ctx.font = '11px ' + FONT;
                            ctx.fillText(item, cx + cw/2, iy + ih/2);
                        }});
                    }});
                    break;
                case 'side-modules':
                    const smw = 100;
                    const smx = bx + flexW - smw - 4;
                    const smh = Math.min(28, (bh - 8) / (block.items||[]).length - 4);
                    (block.items||[]).forEach((item, ii) => {{
                        const sy = by + 4 + ii*(smh+4);
                        drawModule(smx, sy, smw, smh, item);
                    }});
                    break;
                case 'modular-block':
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(bx, by, flexW, bh);
                    ctx.strokeStyle = '#555';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(bx, by, flexW, bh);
                    ctx.fillStyle = '#1a1a1a';
                    ctx.font = 'bold 14px ' + FONT;
                    ctx.fillText(block.title, bx + flexW/2, by + 18);
                    const mods = block.modules || [];
                    const mgap = 10;
                    const mmargin = 16;
                    const mw = (flexW - mmargin*2 - (mods.length-1)*mgap) / mods.length;
                    const my = by + 34;
                    const mh = bh - 44;
                    mods.forEach((mod, mi) => {{
                        const mx = bx + mmargin + mi*(mw+mgap);
                        drawModule(mx, my, mw, mh, mod);
                    }});
                    break;
            }}
            bx += flexW + GAP;
        }}
    }}

    y += lh;

    // Arrow
    if (LAYOUT.arrows !== false && li < LAYOUT.layers.length - 1) {{
        drawArrow(FW/2, y);
        y += ARROW_H;
    }}
}}

// ─── Export PNG ───
canvas.toBlob(function(blob) {{
    const reader = new FileReader();
    reader.onload = function() {{
        // Write base64 data to a marker element for Python to extract
        const marker = document.createElement('div');
        marker.id = 'canvas-png-data';
        marker.textContent = reader.result;
        document.body.appendChild(marker);
    }};
    reader.readAsDataURL(blob);
}}, 'image/png');
"""


def _darken(hex_color: str, factor: float = 0.82) -> str:
    c = hex_color.lstrip("#")
    r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
    return f"#{min(255,int(r*factor)):02x}{min(255,int(g*factor)):02x}{min(255,int(b*factor)):02x}"


def render_architecture(layout: dict, theme: dict, output_path: Path,
                        dpr: int = CANVAS_DPI, width: int = CANVAS_WIDTH) -> Path:
    """Render architecture diagram from layout dict + theme dict → PNG via Canvas."""
    js = ARCH_JS_TEMPLATE.format(
        layout_json=json.dumps(layout, ensure_ascii=False),
        theme_json=json.dumps(theme, ensure_ascii=False),
        dpr=dpr,
        canvas_w=width,
        font_family=FONT_FAMILY,
    )

    html = textwrap.dedent(f"""\
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"><style>
        *{{margin:0;padding:0;}} body{{background:#fff;}}
    </style></head><body>
    <script>{js}</script>
    </body></html>""")

    return _render_html_to_png(html, output_path, dpr)


# ═══════════════════════════════════════════════════════════════
#  Mermaid Diagram: SVG → Image → Canvas bridge
# ═══════════════════════════════════════════════════════════════

MERMAID_CANVAS_JS = """\
const TARGET_W = {target_w};
const MERMAID_CODE = {mermaid_code_json};
const STYLE_INIT = {style_init_json};
const MERMAID_CONFIG = {mermaid_config_json};

// Render mermaid to DOM
const container = document.createElement('div');
container.style.display = 'inline-block';
document.body.appendChild(container);

const initOpts = {{ startOnLoad: false, securityLevel: 'loose' }};
Object.assign(initOpts, MERMAID_CONFIG);
mermaid.initialize(initOpts);
mermaid.render('diagram', STYLE_INIT + '\\n' + MERMAID_CODE, container).then(function(result) {{
    container.innerHTML = result.svg;
    const svgEl = container.querySelector('svg');
    if (!svgEl) throw new Error('No SVG rendered');

    // Serialize SVG
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const encoded = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);

    const img = new Image();
    img.onload = function() {{
        const canvas = document.createElement('canvas');
        const aspect = img.naturalHeight / img.naturalWidth;
        canvas.width = Math.round(TARGET_W * {dpr});
        canvas.height = Math.round(TARGET_W * aspect * {dpr});
        canvas.style.width = TARGET_W + 'px';
        canvas.style.height = Math.round(TARGET_W * aspect) + 'px';
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(function(blob) {{
            const reader = new FileReader();
            reader.onload = function() {{
                const marker = document.createElement('div');
                marker.id = 'canvas-png-data';
                marker.textContent = reader.result;
                document.body.appendChild(marker);
            }};
            reader.readAsDataURL(blob);
        }}, 'image/png');
    }};
    img.src = encoded;
}}).catch(function(err) {{
    const d = document.createElement('div');
    d.id = 'error';
    d.textContent = err.message || String(err);
    document.body.appendChild(d);
}});
"""


def render_mermaid(diagram: str, style_init: str, output_path: Path,
                   target_width: int = 3600, dpr: int = CANVAS_DPI,
                   mermaid_config: dict | None = None) -> Path:
    """Render mermaid diagram via SVG→Image→Canvas bridge.

    mermaid_config: optional dict passed to mermaid.initialize().
                    e.g. {'gantt': {'barHeight': 32, 'barGap': 10}}
    """
    js = MERMAID_CANVAS_JS.format(
        target_w=target_width,
        mermaid_code_json=json.dumps(diagram),
        style_init_json=json.dumps(style_init),
        mermaid_config_json=json.dumps(mermaid_config or {}),
        dpr=dpr,
    )

    html = textwrap.dedent(f"""\
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"><style>
        *{{margin:0;padding:0;}} body{{background:#fff;}}
    </style></head><body>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
    <script>{js}</script>
    </body></html>""")

    return _render_html_to_png(html, output_path, dpr)


# ═══════════════════════════════════════════════════════════════
#  Shared: Chrome headless → PNG extraction
# ═══════════════════════════════════════════════════════════════

def _render_html_to_png(html: str, output_path: Path, dpr: int) -> Path:
    chrome = _find_chrome()
    if not chrome:
        raise RuntimeError("Chrome not found")

    # Strategy: Render HTML, JS draws to Canvas and exports base64 PNG
    # We use --dump-dom to extract the base64 data, then decode to PNG
    html_path = output_path.with_suffix(".html")
    html_path.write_text(html, encoding="utf-8")

    # Render: virtual-time-budget needs to be long enough for complex diagrams
    cmd = [
        chrome, "--headless=new",
        "--window-size=100,100",  # minimal viewport; canvas is self-sizing
        "--default-background-color=ffffff",
        "--disable-gpu", "--no-sandbox",
        "--virtual-time-budget=45000",  # 45s for complex mermaid diagrams
        f"--dump-dom",
        f"file://{html_path}",
    ]

    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    except subprocess.TimeoutExpired:
        html_path.unlink(missing_ok=True)
        raise RuntimeError("Chrome timed out")

    html_path.unlink(missing_ok=True)
    dom = r.stdout

    # Extract base64 PNG data from marker element
    import re as _re
    import base64
    m = _re.search(r'id="canvas-png-data"[^>]*>(.*?)</div>', dom)
    if not m:
        # Check for mermaid error
        err_m = _re.search(r'id="error"[^>]*>(.*?)</div>', dom)
        if err_m:
            raise RuntimeError(f"Mermaid render error: {err_m.group(1)}")
        raise RuntimeError("Canvas PNG data not found in Chrome output")

    data_url = m.group(1).strip()
    # Remove data:image/png;base64, prefix
    if ',' in data_url:
        b64 = data_url.split(',', 1)[1]
    else:
        b64 = data_url

    png_bytes = base64.b64decode(b64)
    output_path.write_bytes(png_bytes)

    # Auto-crop white borders
    try:
        img = Image.open(output_path)
        arr = np.array(img.convert("RGB"))
        mask = np.any(arr < 250, axis=2)
        rows, cols = np.any(mask, axis=1), np.any(mask, axis=0)
        if rows.any() and cols.any():
            margin = 16
            img = img.crop((
                max(0, np.argmax(cols) - margin),
                max(0, np.argmax(rows) - margin),
                min(arr.shape[1], len(cols) - np.argmax(cols[::-1]) + margin),
                min(arr.shape[0], len(rows) - np.argmax(rows[::-1]) + margin),
            ))
        img.save(output_path, "PNG", optimize=True)
    except Exception:
        pass

    return output_path
