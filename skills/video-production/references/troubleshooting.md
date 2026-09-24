# 常见问题

## 依赖

| 依赖 | 安装 | 用途 |
|---|---|---|
| Python 3.9+ | 系统自带或 python.org | vp.py |
| Node.js 18+ | nodejs.org / `brew install node` | Remotion |
| pnpm（推荐）或 npm | `npm i -g pnpm` | 装项目依赖（pnpm 全局缓存让删掉 node_modules 后重装很快） |
| ffmpeg / ffprobe | `brew install ffmpeg` / `apt install ffmpeg` | 探测、混音、响度、footage 合成、验收 |
| edge-tts 7.2+ | `pip install edge-tts` | 默认配音 |
| jieba（可选） | `pip install jieba` | 没有词级时间时按词边界切字幕 |
| faster-whisper（可选） | `pip install faster-whisper` | footage 转写、给外部音频对齐 |

`ffmpeg` 不需要 libass：字幕由 React 渲染。

## 渲染

- **首次渲染会下载 Chrome Headless Shell**（Remotion 自动完成）。网络受限时可指定已有的 Chromium：`export VP_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell`。
- **pnpm 提示 build scripts 被忽略**：模板已在 package.json 里允许 esbuild；其他提示可以忽略。
- **字体**：风格用的字体（含思源黑体 / 思源宋体）都是 npm 字体包，随项目安装、打包进渲染，Mac / Linux 结果一致，不需要系统里装中文字体。改风格后 `VP build` 会更新 `src/generated/fonts.ts` 并把缺的字体包加进 `package.json`，下次渲染前自动安装。报“字体没有加载成功”时运行 `VP setup` 重装依赖。想用自己的字体文件：放到 `public/fonts/`，在 `video.config.json` 的 `fonts` 里声明，再在项目风格的字体列表或 `captions.style.fontFamily` 里把它放在最前。
- **版面检测报问题**：看 `qa/layout.md` 里的镜头、帧号、槽位名。“放不下”“内容超出槽位”是文字太多：删减文字、减少项数或拆镜头；“越出内容区”“压到字幕带”多半是自己写的场景没按内容区算矩形（references/scenes.md）；“与 X 压盖”是两个槽位的矩形重叠。确认是误报时 `VP render --skip-layout`，验收报告里仍会列出。
- **版面预检报错（build / check 时）**：字幕一行放不下就按提示调小 `captions.style.fontSize` 或 `captions.maxCharsPerLine`；内容区太小就减少字幕行数、关掉章节条或换没有页眉的风格。
- **颜色发灰**：`video.colorSpace` 保持 `bt709`（默认）。`bt601` 配合 JPEG 帧会输出全范围 `yuvj420p`，部分播放器显示不正常，验收会报错。
- **渲染慢**：`render.concurrency` 调高；预览用 `--preview`（半分辨率、前 N 秒）或 `--frames`；`video.imageFormat: "jpeg"` 比 png 快。
- **场景组件未注册 / 提示点不存在 / trace 不存在**：渲染会报错并列出可用项，按提示修 storyboard 或 `src/scenes/index.ts`。

## 配音

- **edge-tts 报 403 / 连接失败**：服务端限流或网络问题。已成功的句子有缓存，稍后重跑 `VP build` 只会补失败的句子；macOS 上会自动用 `say` 兜底；也可以换 `voice.engine: "external"`。
- **字幕时间是 estimated**：这几句没有拿到可靠的词级时间（外部音频没装 whisper、`say` 引擎、`say` 与 `text` 差太多）。装 faster-whisper 或把 `say` 改得与显示文本一致。
- **读音不对**：在 `voice.pronunciations` 里加替换（如 `{"Dijkstra": "迪克斯特拉"}`），或给这一句写 `say`。显示文字不用改。

## footage

- **识别出繁体**：`asr.initialPrompt` 保持简体提示；仍是繁体就在校对稿里改（时间不受影响）。
- **声音太小识别差**：识别前会自动抬高音量（`asr.boostBelowMeanDb`、`asr.boostDb`）；成片音量用 `audio.gainDb` 和 `audio.loudness` 控制。
- **校对稿报 asr 字段被改动**：`asr` 字段必须保持识别原文，改字改 `text`。

## 项目

- **换电脑后重新渲染**：`VP setup`（按 lockfile 装依赖）→ `VP render`。配音走 `audio/tts/` 缓存，不需要联网。
- **类型包组件更新了想同步到项目**：`VP genre add <类型> --force`（会覆盖项目里的副本，改过的先备份）。
- **看项目进度**：`VP status`。
