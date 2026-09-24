# video-production

让没有视频生成能力的模型也能做出完整的讲解视频：用 React（Remotion）写画面、逐帧渲染，用 edge-tts 免费配音并拿到词级时间，用 ffmpeg 混音、做响度标准化和验收。声音、画面、字幕共用一条时间轴，一个视频就是一个可重新渲染的项目目录。

## 能做什么

- **从口播稿到成片**：分镜里写清每个镜头要表达的关系和画面，配音、时间轴、字幕、混音、编码、验收由脚本完成。
- **一份 JSON 配参数**：画幅、帧率、编码、码率、色彩空间、音色、语速、字幕样式与切分、BGM 与压低、响度、水印、进度条、转场……都在 `video.config.json` 里。内置 B 站/YouTube 横屏、抖音竖屏、小红书 3:4、方形等 7 个预设，还支持用户级默认。
- **字幕按意群分块**：只在词边界断开，跟随口播出现和消失；显示文本和朗读文本分开存（`O(n²)` 照原样显示，读作“O n 平方”）。
- **算法逐行讲解**：算法用 TS 真实跑一遍并记录每一步，代码高亮、数据结构可视化（数组/柱状、表格、图、树、栈、队列）和口播读同一份记录；另有图形优先的概念场景（三步路线图、数组板、类比轴、代价曲线、区间阶梯）。
- **图形优先 + 可去文字**：`sceneText: "off"` 隐藏说明性文字，代码、数值、字幕和章节条仍在。`VP render --textless` 再关掉字幕和章节名，输出 `renders/final-textless.mp4`。配套的 **Mute Test**（`VP build --textless && VP stills`）用来检查每个镜头的图形骨架自己讲不讲得通。
- **类型与风格可扩展**：讲解类型（`genres/`）和视觉风格（`styles/`）可以任意组合；新增类型只需复制 `genres/_template`。
- **给已有视频加字幕**：whisper 词级转写 → 校对（只改字，时间不动）→ 烧录字幕 / 软字幕 / 口播正文。
- **可复现**：配音按句缓存并随项目保存，lockfile 保留；删掉 `node_modules` 之后仍能原样重新渲染。

## 快速开始

```bash
pip install edge-tts jieba              # jieba 可选
VP="python3 skills/video-production/scripts/vp.py"

$VP init videos/20260924-insertion-sort --title "插入排序" --genre algorithm
cd videos/20260924-insertion-sort
cp -r ../../skills/video-production/genres/algorithm/examples/algo/insertion-sort src/algo/
cp ../../skills/video-production/genres/algorithm/examples/storyboard.example.json storyboard.json
$VP check                   # 校验 + 生成 script.md
$VP build                   # 配音 → 时间轴 → 混音 → 字幕
$VP stills --styles midnight,paper,swiss   # 三套风格的静帧 + 版面检测
$VP render --preview        # 预览
$VP render                  # 成片 + 验收
$VP cleanup
```

在 Claude Code 里一般不用手敲这些命令，直接说“把这篇稿子做成一个 B 站横屏讲解视频”即可，流程见 SKILL.md。

## 目录

```
video-production/
├── SKILL.md                  编排：入口、流程、检查点、硬规则
├── config/                   video.config 的 schema、默认值、平台预设；storyboard 的 schema
├── scripts/vp.py + vp/       管线：配音、时间轴、字幕、混音、渲染、验收、项目管理
├── template/                 Remotion 项目模板（版面引擎、自动字号、版面检测、字幕、章节条、转场、代码组件）
├── genres/                   讲解类型包：_template / algorithm / concept-explainer
├── styles/                   10 套视觉风格（midnight、paper、swiss、bold-signal …）+ style.schema.json
└── references/               流程、分镜、讲解方法、场景、字幕、音频、配置、排错
```

## 依赖

Python 3.9+、Node.js 18+、pnpm（或 npm）、ffmpeg；Python 包 `edge-tts`（7.2+），可选 `jieba`、`faster-whisper`。首次渲染时 Remotion 会自动下载 Chrome Headless Shell。

## 授权

本技能以 MIT 发布。渲染依赖的 [Remotion](https://www.remotion.dev) 使用自己的授权：个人、员工不超过 3 人的营利组织、非营利组织可以免费使用（包括商用）；超过这个规模的营利组织需要购买 Company License（见 [remotion.pro](https://www.remotion.pro/license)）。团队使用前请自行确认。

内置风格中有 8 套改编自 [frontend-slides](https://github.com/zarazhangrui/frontend-slides) 的风格预设（MIT，© zarazhangrui）；字体来自 Fontsource 的 npm 包（SIL OFL 1.1），随视频项目安装。详见 `styles/README.md`。

edge-tts 是非官方客户端，调用微软 Edge 的朗读服务，免费但没有稳定性保障；本技能会缓存每一句配音，并提供 `say`（macOS）兜底、外部音频和不配音几种替代方式。
