---
name: video-production
version: 2.1.0
description: >-
  让没有视频生成能力的模型也能做出完整的讲解视频：前端（React/Remotion）写画面、逐帧渲染，edge-tts 免费配音并拿到词级时间，
  ffmpeg 混音、响度标准化与验收；声音、画面、字幕共用一条时间轴。一个视频就是一个项目目录，全部素材留存、可重新渲染。
  画面像精排的 PPT：10 套风格（深色科技、瑞士、杂志、终端……），位置和字号按画幅计算，渲染前自动做版面检测，不压盖、不越界；
  可开章节条（B 站 / 抖音那样的分段格子 + 播放进度）。一份 video.config.json 配置画幅、编码、音色、语速、字幕样式、BGM、水印等全部参数，
  内置 B 站横屏、抖音竖屏、小红书 3:4 等预设；讲解类型（算法逐行讲解 + 数据结构可视化、概念讲解……）与视觉风格可无限扩展。也能给已有视频转写、校对并加字幕。
  Use when the user wants to 做视频、出片、做讲解视频、算法讲解视频、科普短视频、口播视频、把文章/口播稿做成视频、
  给录屏或视频加字幕/烧字幕、生成字幕文件或口播文稿、make an explainer video, turn a script into a video,
  add subtitles to a video. 模型本身能生成视频或语音时，同样用本技能的时间轴与合成，只把对应镜头的画面或配音换成模型的产出。
license: MIT
---

# 视频制作：口播稿 → 视频项目

本文件是编排器：定入口、走流程、守规则。细节在 `references/`，能确定的事交给 `scripts/vp.py`。
下文 `VP` 指 `python3 <本技能目录>/scripts/vp.py`；所有命令在视频项目目录里运行（或加 `--project <目录>`），`--json` 输出机器可读结果。

## 它怎么工作

```
内容   选题或已有稿 → 口播稿 + 分镜 storyboard.json（每个镜头：要表达的关系 → 画面形式 → 画面来源）
时间   edge-tts 逐句配音（词级时间）→ timeline.json（全片唯一的时间来源）
画面   每个镜头一个来源：React 场景（默认）/ 视频生成片段 / 图片素材；版面几何算位置与字号，Remotion 逐帧渲染
合成   配音按采样位置拼接 → BGM 自动压低 → 响度标准化 → 字幕按意群切块画进画面 + 导出 SRT → 按配置编码
验收   版面检测（压盖、越界、溢出）、参数、声画字对应、响度、黑屏、长时间静止，逐镜头抽帧
```

依赖：Python 3.9+、Node.js 18+、pnpm 或 npm、ffmpeg、`pip install edge-tts`；可选 `jieba`（切字幕按词断开）、`faster-whisper`（给已有视频转写、给外部音频对齐）。缺什么见 references/troubleshooting.md。Remotion 的授权见本目录 README.md。

## 入口

| 用户给了 | 入口 | 要点 |
|---|---|---|
| 主题或素材 | 从选题做起 | 按类型包的讲解结构写口播；事实和数字只取自素材 |
| 完整文稿 | 按已有稿落地 | **口播逐字来自原稿**，只断句与分镜；读法用 `say` / `voice.pronunciations` 解决；删改补充先问用户 |
| 已有视频 | 加字幕（`--mode footage`） | whisper 转写 → 校对（只改字不改时间）→ 字幕 / 软字幕 / 口播正文 |

## 流程（produce）

完整说明见 references/workflow.md。四个检查点都要等用户确认，结论记进 `brief.md`。

0. **能力盘点**：看当前能调用哪些工具——视频生成、图片生成、更好的 TTS。有视频生成也只用于氛围、实拍感的镜头；文字、代码、图表、需要和口播精确对齐的镜头仍用场景。没有生图能力就跳过封面。
1. **建项目**：`VP init videos/<日期>-<英文短名> --title "…" --genre <类型> [--style <风格>] [--preset <预设>]`。类型：`VP genre list`；风格：`VP styles`；预设：`VP presets`。
2. **简报 → 检查点 1**：填 `brief.md`（选题、受众、看完能做到什么、平台、能力盘点）。
3. **口播稿与分镜 → 检查点 2**：读 `genres/<类型>/GENRE.md` 与 references/explaining.md，写 `storyboard.json`（references/storyboard.md）；算法类先写 `src/algo/<id>/` 并 `VP trace`。`VP check` 生成 `script.md` 给用户确认。
4. **配音与时间轴**：`VP build`。
5. **画面 → 检查点 3**：优先用类型包场景，缺的在 `src/scenes/` 写（references/scenes.md）。按内容挑 3 个风格，`VP stills --styles a,b,c` 给用户看静帧，定下风格；输出里的版面问题必须改到零（references/design.md）。
6. **预览 → 检查点 4**：`VP render --preview`。
7. **成片与验收**：`VP render`（先版面检测，再出片，再自动验收）。`qa/report.md` 的错误必须修，警告逐条判断，抽帧逐张看。
8. **封面**：有生图能力时生成无字背景图 `cover/background.png`，`VP cover`；没有就跳过。
9. **清理**：`VP cleanup`。保留 lockfile、`audio/tts/`、素材、源码、成片。

footage 模式：`VP init <目录> --mode footage --source <视频>` → `VP asr` → 校对 `captions/transcript.proof.json` → `VP build` → `VP render --preview` → `VP render`。

## 硬规则

- **声画字共用一条时间轴。** 画面切换、字幕、配音都从 `timeline.json` 来；不手写字幕时间，不给有口播的镜头填时长（镜头时长来自句子，自然不会平均分配）。
- **先定关系再选画面。** 每个镜头的 `intent` 写清要让观众看懂的关系，画面形式服务于它。
- **不编造。** 素材里没有的数字、引语、事实不写；数字场景必须写出处。
- **显示与朗读分开。** 字幕照原文显示，读音问题用 `say` 或 `voice.pronunciations`，不改显示文字。
- **字幕按意群分块**，只在词边界断开，跟随口播出现消失，不放整段（references/captions.md）。
- **场景逐帧确定。** 动画只由帧号计算；不用 CSS 动画、`Math.random`、`Date`；时刻从提示点/句子取，不按秒写死。
- **位置和字号是算出来的。** 场景放在 `Slide` 上，每块内容放进从内容区算出的矩形，文字用自动字号排版；逐条出现的元素一开始就占位。版面检测（压盖、越界、溢出、放不下）不通过不出成片。
- **转场防闪。** 新画面盖在旧画面上进入，旧画面在转场结束前保持显示；同一画面续讲用 `cut`。
- **字体随风格打包。** 风格字体是 npm 字体包（含思源黑体 / 宋体），随项目安装，Mac / Linux 渲染一致；渲染时不从网络加载任何资源。
- **先预览后成片**，成片必须过验收。
- **配音音频不删。** `audio/tts/` 是素材，edge-tts 以后可能用不了。

## 改动之后重跑什么

`VP build` 按签名只重跑受影响的部分：改某句文字或语速只重配那一句；改字幕样式不重新配音、不重新混音；只改画面直接 `VP render`。完整对照表见 references/workflow.md。

## 配置

项目根目录的 `video.config.json` 只写想改的字段，按“技能默认 → 用户级默认 → 平台预设 → 项目配置”合并并校验（`VP config` 看合并结果）。全部参数与预设见 references/config.md（由 `VP config --doc` 生成）。常用：

| 想要 | 改 |
|---|---|
| 换平台画幅 | `preset`：landscape-1080p / landscape-720p / landscape-1440p / landscape-4k / portrait-1080x1920 / portrait-3x4 / square-1080 |
| 换音色、语速 | `voice.voice`、`voice.rate`（单句用句子的 `rate`） |
| 不要配音 | `voice.engine: "none"`，字幕按 `voice.readingCharsPerSec` 计时 |
| 用别的 TTS | `voice.engine: "external"`，音频放 `audio/external/<句子id>.wav` |
| 字幕样式、每行字数 | `captions.style`、`captions.maxCharsPerLine` |
| 软字幕 / 只要 SRT | `captions.render: "soft"` 或 `"both"` |
| BGM | `audio.bgm.file`、`audio.bgm.volumeDb` |
| 编码 | `video.codec`、`video.crf` 或 `video.videoBitrate`、`video.fps` |
| 章节条（上方或下方的分段格子 + 播放进度） | `overlays.chapterBar.enabled: true`，`position`：top / bottom（references/design.md） |
| 水印、细进度条 | `overlays.watermark`、`overlays.progressBar` |
| 字幕颜色 | `captions.style.color` / `strokeColor`：缺省 `auto` 按风格（深色白字黑描边，浅色深字浅描边） |

## 类型与风格可扩展

- **类型包**（讲什么、怎么讲）：`genres/<名字>/`，含 `GENRE.md`（讲解结构、分镜套路、场景参数）、`genre.json`、`components/`。新增类型：复制 `genres/_template` 填写即可，本文件不用改。当前：`algorithm`（算法逐行讲解 + 可视化，trace 驱动）、`concept-explainer`（通用讲解，所有项目都装）。
- **风格**（长什么样）：`styles/<名字>/theme.json`，格式见 `styles/style.schema.json`；项目内 `styles/<名字>/` 可覆盖或新增。当前 10 套：`midnight`（默认，深色科技）、`paper`、`swiss`、`bold-signal`、`electric`、`botanical`、`editorial`、`pastel`、`terminal`、`neon`，各自适合什么见 references/design.md。
- 做完一个新领域的视频，把能复用的场景提炼进类型包，类型库会越用越全。

## references

| 文件 | 内容 |
|---|---|
| workflow.md | 能力盘点、三种入口、每一步命令与检查点、footage 流程、改动连带表 |
| storyboard.md | storyboard.json 字段、提示点、算法步骤绑定、校验与排布规则 |
| explaining.md | 讲解方法：现象→原理→术语→反例、先关系后画面、不编数字、节奏 |
| design.md | 版面几何、排版规则、版面检测、10 套风格与派生规则、章节条 |
| scenes.md | 写场景的硬规则与引擎 API（Slide / Box / Card / 自动字号 / 时间 hooks） |
| captions.md | 字幕切分规则、样式、显示与朗读、语速、footage 校对 |
| audio.md | 配音引擎、缓存、失败处理、混音与响度、其他 TTS |
| config.md | 全部配置参数与平台预设（生成的） |
| troubleshooting.md | 依赖、渲染、配音、footage 常见问题 |
