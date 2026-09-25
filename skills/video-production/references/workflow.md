# 流程与检查点

`VP` 指 `python3 <本技能目录>/scripts/vp.py`。所有命令在项目目录里运行，或加 `--project <目录>`；加 `--json` 得到机器可读结果。

## 第 0 步：先问一次当前环境

不猜模型名字。写分镜之前，列出当前会话实际能调用的工具，只回答三件事，写进 `brief.md`：

- 生图：工具名，或「无」
- 生视频：工具名，或「无」
- 生语音：工具名，或「无」

三行里的 `TODO` 还在时，`vp.py status` 不算简报完成，不要往下选画面。

询问结果再决定每个镜头的 `source`。先写 `intent`（这一镜要看懂的关系），然后：

1. 关系是代码、数据、数字、图解，或必须卡在某个词上：用 React 场景。生视频能力也不改这条。
2. 否则，关系是一张不需要排字的静图（封面、物体、气氛），且生图那行有工具名：生成无字图，`source` 用 `image`。封面仍按 `cover.enabled: auto`。
3. 否则，关系是实拍或气氛运动，且生视频那行有工具名：片段放 `public/clips/`，`source` 用 `clip`。
4. 其余用场景。

配音全片一次决定，用生语音那一行：有工具名，就逐句放到 `audio/external/<句子id>.wav`，`voice.engine` 设为 `external`，用 whisper 对齐；是「无」才用 edge-tts 默认女声。

本机依赖仍要查：`VP presets` 能跑；`ffmpeg -version`、`node -v`、`python3 -c "import edge_tts"`。缺了按 troubleshooting.md 安装。

**视频生成不擅长信息类画面。** 中文文字、代码、图表、与口播精确对齐都留给场景。时间轴和合成是固定主干，变的只是每个镜头的画面来源。

## 三种入口

| 入口 | 什么时候 | 口播从哪来 |
|---|---|---|
| 从选题做起 | 用户只给了主题或素材 | 按类型包 GENRE.md 的讲解结构写口播稿，事实与数字只取自用户给的素材 |
| 按已有稿落地 | 用户给了完整文稿 | **口播逐字来自原稿**：只做断句和分镜；读法问题用 `say` 或 `voice.pronunciations` 解决，不改显示文字；删减、改写、补充都要先问用户 |
| 给已有视频加字幕 | 用户给了录屏、讲解视频 | `mode: footage`，whisper 转写 → 校对 → 烧字幕 / 软字幕 / 口播正文 |

## produce 模式

### 1. 建项目

```bash
VP init videos/20260924-dijkstra --title "Dijkstra 最短路径" --genre algorithm --preset landscape-1080p
```

一个视频就是一个项目目录，放在用户当前工作目录的 `videos/<日期>-<英文短名>/` 下（用户另有要求时从其要求）。`init` 会复制 Remotion 模板、安装基础类型包 concept-explainer 与主类型包，并按配置生成 `src/generated/*`。

### 2. 简报 → 检查点 1

填 `brief.md`：入口、选题、受众（他们已经知道什么）、看完能做到什么、平台与画幅、第 0 步的三行能力。和用户确认后记在“检查点记录”里，删掉对应的 TODO。

### 3. 口播稿与分镜 → 检查点 2

写 `storyboard.json`（格式见 storyboard.md），讲解结构按类型包 `genres/<类型>/GENRE.md`，画面选择按 explaining.md。正片第一镜用 `TitleCard` 写出主题，再进入例子。算法或逻辑关系用 diagram-compiler 导出 flowchart：视频风格 `dark` 为真时 `--theme midnight`，否则 `--theme default`，背景用该主题的 `backgroundColor`。导出的图用 `ImageText` 和判断句放在一起。算法类先写 `src/algo/<id>/code.*` 与 `trace.ts`，`VP trace` 跑出步骤后再绑定 `steps`。

```bash
VP check        # 校验配置、分镜、素材、场景注册；生成 script.md（带粗估时长）
```

把 `script.md` 给用户确认：口播每一句、每个镜头要表达的关系与画面形式。改稿改 `storyboard.json`，再 `VP check`。

### 4. 配音、时间轴、字幕

```bash
VP build
```

逐句配音（按“文本 + 音色 + 语速”缓存）→ 时间轴 → 拼接配音与混音 → 按意群切字幕 → 写出 `timeline.json`、`captions/`、`transcript.md`、`src/generated/*`。输出里的“字幕时间来源”应该都是 `word`（edge-tts 词边界）或 `whisper`；出现 `estimated` 说明那几句没有可靠的词级时间，看一眼字幕是否跟得上。

### 5. 画面 → 检查点 3

优先用类型包里的场景；需要新画面就在 `src/scenes/` 写组件并在 `src/scenes/index.ts` 登记（写法见 scenes.md）。

```bash
VP stills --styles midnight,paper,swiss     # 每个镜头一张静帧，按风格分目录，同时做版面检测
VP layout                                   # 版面检测：每个镜头的中点和最后一帧，结果在 qa/layout.md
```

**出片前先定风格**：按内容挑 3 个风格（`VP styles` 列出全部，各自适合什么见 design.md），给用户看三套静帧（`renders/stills/styles/<风格>/`）。需要别的样子就在项目 `styles/<名字>/theme.json` 里派生（复制一个再改，要求见 design.md），`VP build` 后即可用。用户选定后写进 `video.config.json` 的 `style` 与 brief。

**版面检测必须通过**：`VP stills` 输出里列出的压盖、越界、溢出、放不下，按报告里的镜头和槽位名去改——删减文字、减少项数、拆成两个镜头，或换更合适的场景；不要靠调小最小字号硬塞。章节条默认开着（刻度尺 `ruler`，也可换成一排分段格子），内容区和字幕会自动让开。不要刻度就写 `overlays.chapterBar.enabled: false`。

拖动预览：`VP studio`（Remotion Studio，可以逐帧看每个镜头）。

### 6. 预览 → 检查点 4

```bash
VP render --preview       # 半分辨率、前 render.preview.maxSeconds 秒 → renders/preview.mp4
```

确认节奏、字幕、画面后再出正式版。只想看某一段：`VP render --preview --frames 900-1200`。

### 7. 成片与验收

```bash
VP render                 # 先做版面检测，通过后出成片 → renders/<outputName>.<mp4|webm|mov>，随后自动验收
```

版面检测不通过时不渲染成片（报告在 `qa/layout.md`）；确认是误报才加 `--skip-layout`。验收（`qa/report.md`）的**错误**必须修：参数不符、时长与时间轴不一致、字幕与原文不一致、口播越出镜头、版面压盖越界等。**警告**要看一眼判断是否有意为之：黑屏、长时间静止画面、响度偏差、估算的字幕时间。每个镜头中点的抽帧在 `renders/stills/final/`，逐张看一遍。

### 8. 封面（有生图能力才做）

用生图工具按 `cover.aspect` 生成**不含文字**的背景图（中文字交给排版），存为 `cover/background.png`：

```bash
VP cover --subtitle "一句副标题"     # 背景 + 标题 → cover/cover.png
```

没有生图能力：`cover.enabled` 为 `auto`（默认）时跳过，在 brief 里记一句“无生图能力，未做封面”。

### 9. 清理

```bash
VP cleanup --dry-run      # 先看会删什么
VP cleanup                # 删 node_modules、renders/_work、renders/_seq 等可再生成的文件
```

保留：lockfile、`audio/tts/`（配音服务以后可能用不了，删了补不回来）、素材、源码、`timeline.json`、字幕、成片。`VP status` 查看每个阶段是否完成。

## footage 模式

```bash
VP init videos/20260924-talk --title "录屏讲解" --mode footage --source ~/Movies/talk.mp4
VP asr                    # whisper 词级转写 → audio/asr/asr.json + captions/transcript.proof.json
# 校对 transcript.proof.json：只改 text 里的错字、标点、专有名词写法；不改 id、asr；不要的段设 drop: true
VP build                  # 校对稿 → 字幕块（时间仍来自识别结果）→ captions/*.srt、transcript.md
VP render --preview       # 前 N 秒低分辨率预览
VP render                 # 成片（字幕叠到原视频上），自动验收
```

- 校对只改字不改时间：build 时把校对后的 text 逐字对齐回识别原文，时间不受影响。
- 字幕与口播正文（transcript.md / .txt）来自同一份校对稿。
- 口播声音小：`audio.gainDb` 抬高成片音量，`audio.loudness` 做响度标准化；识别前音量太低会自动另存一份抬高音量的音频专供识别（`asr.boostBelowMeanDb`）。
- 成片沿用源视频的分辨率和帧率，字幕尺寸按源视频与 `video.width/height` 的比例缩放。
- 只要软字幕：`captions.render: "soft"`，视频流直接复制不重新编码。

## 改动连带表

改了什么，就重跑什么。`VP build` 会按签名自动跳过没变的部分：

| 改动 | 需要 | 说明 |
|---|---|---|
| 某句口播文字、`say`、`rate`、音色、语速 | `VP build` | 只重新配音这几句，之后时间轴、混音、字幕自动更新 |
| 句子顺序、增删句子、停顿（pacing / pauseAfterSec） | `VP build` | 配音走缓存，时间轴、混音、字幕重算 |
| 字幕样式、每行字数、标点处理 | `VP build` | 不重新配音、不重新混音 |
| BGM、音量、响度 | `VP build` | 只重新混音 |
| 场景代码、风格、镜头 props | 直接 `VP render` | 画面不影响时间轴（render 前会自动 build，都命中缓存） |
| 算法 trace（`src/algo/*`） | `VP build` | 重新运行 trace；步数变了要同步检查 storyboard 的 steps |
| 画幅、帧率、编码参数 | `VP render` | 帧率变化会重算帧号（build 自动） |
