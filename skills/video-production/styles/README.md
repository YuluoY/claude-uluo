# 风格

每个子目录一套风格：`<名字>/theme.json`，格式由 `style.schema.json` 规定（颜色、背景、装饰、页眉、字体包、字号、卡片、标题样式、动效、代码与可视化配色）。怎么选、怎么派生新风格见 `../references/design.md`。

| 风格 | 说明 | 出处 |
|---|---|---|
| midnight | 深色科技：深靛蓝柔光背景、毛玻璃卡片、冷蓝强调 | 本技能原创 |
| paper | 暖纸编辑：米白纸面、衬线标题、朱红强调 | 本技能原创 |
| swiss | 瑞士国际主义：纯白底、黑色粗体、信号红、网格与几何块 | 改编自 frontend-slides「Swiss Modern」 |
| bold-signal | 强信号：炭黑渐变、橙色色块、超粗标题与大号页码 | 改编自 frontend-slides「Bold Signal」 |
| electric | 电光蓝：白底 + 左侧电光蓝色带、描边卡片 | 改编自 frontend-slides「Electric Studio」 |
| botanical | 暗夜植物：近黑底、暖金与粉色柔光、衬线标题 | 改编自 frontend-slides「Dark Botanical」 |
| editorial | 复古杂志：奶油纸、双线页眉、衬线大标题、胭脂红 | 改编自 frontend-slides「Vintage Editorial / Paper & Ink」 |
| pastel | 粉彩几何：雾蓝底、白色大圆角卡片、右侧彩色色签 | 改编自 frontend-slides「Pastel Geometry」 |
| terminal | 终端绿：GitHub 暗色底、等宽标题、终端绿、四角括号 | 改编自 frontend-slides「Terminal Green」 |
| neon | 霓虹赛博：深海军蓝、青色与洋红辉光、发光网格 | 改编自 frontend-slides「Neon Cyber」 |

## 授权

- 改编的风格取自 [frontend-slides](https://github.com/zarazhangrui/frontend-slides) 的风格预设（MIT License，© zarazhangrui）：沿用了配色、字体搭配与装饰母题的设计思路，改写成本技能的主题格式，并按视频场景重新调了字号、对比度与版面。每个改编风格的 `theme.json` 里 `credit` 字段注明了出处。
- 字体全部来自 [Fontsource](https://fontsource.org/) 的 npm 包，字体本身为 SIL Open Font License 1.1：Inter、Noto Sans SC、Noto Serif SC、JetBrains Mono、Archivo Black、Space Grotesk、Manrope、Cormorant、Fraunces、Plus Jakarta Sans、Syne。字体随视频项目安装（`package.json`），不随本技能分发。
