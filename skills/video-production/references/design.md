# 版面与风格

目标：每一帧都像一页排好版的幻灯片——内容不压盖、不越界、不被字幕挡住，任何分辨率下位置和字号都是算出来的。

## 版面几何

所有位置都从画幅、平台安全区、页眉、章节条、字幕带算出来（`template/src/engine/layout.ts`，Python 侧的同一套公式在 `scripts/vp/layoutcheck.py`）：

```
画布 ─┬─ 平台安全区 video.safeArea（平台界面会挡住的边）
      ├─ 章节条 overlays.chapterBar（开启时，贴安全区上沿或下沿）
      └─ 页边距（按画幅比例）
           ├─ 页眉带（章节名 / 页码，风格 chrome.header 开启时）
           ├─ 内容区 content ← 场景只在这里摆内容
           └─ 字幕带（烧录字幕时；内容区的下边界在它上方，章节条在底部时字幕整体上移）
```

| 画幅 | 判定（宽/高） | 页边距（左右 / 上下） | 栅格 | 场景文字放大 |
|---|---|---|---|---|
| 横屏 landscape | ≥ 1.3 | 5.5% / 6.5% | 12 列 | 1.0 |
| 方形 square | 0.8 – 1.3 | 7% / 6% | 8 列 | 1.0 |
| 竖屏 portrait（含 3:4） | ≤ 0.8 | 7.5% / 4.5% | 6 列 | 1.2 |

- 字号、间距以**短边 1080 像素**为基准，乘单位 `unit`（短边 / 1080）；竖屏在手机上看、画面又高，场景里的文字和部件再整体放大 1.2 倍。
- 字幕带高度 = 字号 × 行高 × 行数 + 描边/底栏余量；字幕底边距画面底边 `captions.style.bottomPct`%（另加安全区）。
- 章节条高度 `overlays.chapterBar.height` × unit，离安全区边缘 14 × unit；它那一侧的页边距减半。

**渲染前的预检**（`vp.py check` / `build` 自动做）：内容区高度不到画面的 38%、字幕一行 `maxCharsPerLine` 个字放不下、章节太多每格放不下章节名，直接报错并给出该调哪个参数。

## 场景怎么排版

1. **每块内容放进算好的矩形。** 场景从 `useSlide().frame.content` 出发，用 `stackV` / `splitH` / `splitV` / `gridCells` / `reserve` 切出矩形，内容放进 `<Box rect name>` 或 `<Card rect name>`。不靠 margin、flex 把东西“挤”到位置上。
2. **文字先测量再排版。** 字号用 `useTextFit` / `useTextFitGroup` 在 [最小, 最大] 之间找能放进矩形的最大值，再用 `TextBlock` 逐行画出来：
   - 中文按词断行（浏览器内置 ICU 分词），不把“打开”拆成“打 / 开”；西文单词不拆；避头尾（，。）」不在行首，（「“ 不在行尾）；
   - 标题做行长平衡，最后一行不会只剩一两个字；
   - 同级元素（几个要点、几张卡片）用同一个字号，整齐；
   - 最小字号也放不下时标记溢出，版面检测会报错，不会悄悄缩成看不清的小字。
3. **位置一开始就固定。** 逐条出现的元素从第一帧起就占着自己的位置（只是透明），出现时不推挤别的内容；入场动画用 `Box` 的 `reveal`（位移只是视觉效果，检测按最终位置量）。
4. **按内容收紧，整组居中。** 卡片、步骤框按内容定高，不拉满整块区域；一组内容在区域里略高于正中（视觉中心）。
5. **按可行性选版式。** 场景先算“最小字号时能不能放下”，再决定横排 / 竖排 / 网格 / 分两栏（例如 `FlowSteps` 竖排放不下就排成网格，要点太多就分两栏）。
6. **装饰只在边距和背景里。** 主题的装饰（色块、线条、大号页码）画在页边距或极低不透明度的背景层，不进内容区、不压页眉。

## 版面检测

`vp.py layout` 在 Chrome 里实际渲染每个镜头的**中点**和**最后一帧**（逐条出现的元素此时都已出现），测量 DOM，报告：

| 问题 | 含义 |
|---|---|
| 越出（outside） | 槽位越出内容区（页眉槽位越出页眉带、嵌套槽位越出父槽位） |
| 压到字幕带（captions） | 顶层槽位和烧录字幕的区域重叠 |
| 内容超出槽位（overflow） | 槽位里的元素超出槽位（行内文字只查横向，行框由排版引擎算好） |
| 压盖（overlap） | 同一层的两个槽位互相重叠；水印等全局叠加层压到任何内容 |
| 放不下（text） | 文字在最小字号下也放不下 |

- 什么时候跑：`vp.py stills` 顺带检测并在输出里列出；`vp.py render`（成片）前自动跑，有问题就停下（`--skip-layout` 跳过，验收报告里仍会列出）；`vp.py qa` 把结果并入验收，检测后又改过时间轴、设置或组件会提示结果过期。
- 结果：`qa/layout.md`（人读）、`qa/layout.json`（机器读）。按“镜头 + 帧号 + 槽位名 + 位置”定位，改分镜里的文字长度、项数或场景参数后重跑。
- 换风格对比：`vp.py layout --style paper`、`vp.py stills --styles a,b,c`。

写自己的场景时让检测能看懂它：

| 属性 | 放在哪 | 作用 |
|---|---|---|
| `data-vp-box="名字"` | 每个内容槽位（`Box` / `Card` / `SourceNote` 自动带） | 参与越界、溢出、压盖检测；名字出现在报告里 |
| `data-vp-region="canvas"` | 全出血素材（`Box bleed`） | 允许铺满画布，不查字幕带 |
| `data-vp-layer="overlay"` | 有意叠放的槽位（`Box overlay`） | 不参与同层压盖检测 |
| `data-vp-clip="1"` | 有意裁切的视口（代码滚动、图片推近） | 里面的元素只算可见部分 |
| `data-vp-ignore="1"` | 装饰层（箭头、圆点、分隔线） | 不检测 |
| `data-vp-anim="1"` | 有入场位移的元素（`Box reveal` 自动带） | 测量时按最终位置 |

## 风格

风格 = `styles/<名字>/theme.json`（格式见 `styles/style.schema.json`，出处与授权见 `styles/README.md`）。字体全部是随项目安装的 npm 字体包（fontsource，OFL 授权），打包进渲染，Mac / Linux 渲染结果一致，不依赖系统字体、不联网。

| 风格 | 适合 | 标题 / 正文字体 |
|---|---|---|
| `midnight`（默认） | 深靛蓝柔光、毛玻璃卡片：技术讲解、产品介绍 | Inter / Inter + 思源黑体 |
| `paper` | 米白纸面、衬线标题、朱红强调：科普、人文、概念讲解 | Fraunces + 思源宋体 / 思源黑体 |
| `swiss` | 白底黑字、信号红、网格与几何块：观点、数据、结构化讲解 | Archivo Black / Inter |
| `bold-signal` | 炭黑渐变、橙色色块、大号页码：观点输出、强节奏内容 | Archivo Black / Space Grotesk |
| `electric` | 白底 + 电光蓝色带、描边卡片：产品、教程、干货清单 | Manrope / Manrope |
| `botanical` | 近黑底、暖金柔光、衬线标题：故事、人文、品牌 | Cormorant + 思源宋体 / 思源黑体 |
| `editorial` | 奶油纸、双线页眉、胭脂红：评论、历史、深度解读 | Fraunces + 思源宋体 / 思源黑体 |
| `pastel` | 雾蓝底、白色大圆角卡片、彩色色签：轻松科普、生活方式 | Plus Jakarta Sans / 同 |
| `terminal` | GitHub 暗色、等宽标题、终端绿：编程、算法、命令行 | JetBrains Mono / 思源黑体 |
| `neon` | 深海军蓝、青色洋红辉光、发光网格：科技前沿、游戏 | Syne / Inter |

选风格：`vp.py stills --styles a,b,c` 出三套静帧给用户挑；选定写进 `video.config.json` 的 `style`。

**新增或派生风格**：在项目里建 `styles/<名字>/theme.json`（复制一个最接近的改），`name` 与目录名一致，`vp.py build` 后可用。要求：

- 对比度：正文与背景、正文与卡片底 ≥ 4.5:1，弱化文字 ≥ 3:1，强调色底上的文字 `onAccent` ≥ 3:1；
- 最多三种字体家族（标题 / 正文 / 等宽）；中文字形靠思源黑体 / 思源宋体（`@fontsource-variable/noto-sans-sc`、`noto-serif-sc`）兜底，放在字体列表里西文字体的后面；
- 用到的字体包写进 `fonts.packages`（包名 → 固定版本），CSS 写进 `fonts.imports`，要预加载的字重写进 `fonts.faces`；`vp.py build` 会生成 `src/generated/fonts.ts` 并把字体包加进 `package.json`（下次渲染前自动安装）；
- 装饰（`decor`）只用主题提供的几种母题；`sectionNumber` 是背景里淡淡的大号页码。

## 章节条

B 站分段进度条、抖音顶部分段标签那样的效果：画面上方或下方一排格子，每格一个章节，当前章节高亮并显示本章播放进度，播完的章节标记完成。

```json
"overlays": {
  "chapterBar": { "enabled": true, "position": "top", "style": "filled", "widths": "equal", "showProgress": true, "height": 56 }
}
```

| 参数 | 说明 |
|---|---|
| `enabled` | 开关（默认关；只用于 produce 模式） |
| `position` | `top` 贴安全区上沿；`bottom` 贴下沿，字幕整体上移让开 |
| `style` | `filled` 色块 / `outline` 描边 / `underline` 只有下划线 |
| `widths` | `equal` 等宽；`duration` 按章节时长（每格至少平均宽度的 45%，短章节名也放得下） |
| `showProgress` | 当前格子里显示本章进度 |
| `height` | 高度（像素，短边 1080 基准） |

- 章节来自 storyboard 里镜头的 `chapter`：没写 `chapter` 的镜头归到前一章。
- 开了章节条，页眉不再重复章节名（只留页码），内容区、字幕带、水印都会自动让开。
- 章节名太长会显示省略号（预检会警告）；章节太多每格放不下会报错：合并章节或换更宽的画幅。
- 细进度条 `overlays.progressBar` 与章节条可以同时开，但一般二选一。
