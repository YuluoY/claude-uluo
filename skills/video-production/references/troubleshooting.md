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
- **中文显示成方块或字体不对（Linux）**：把中文字体文件（如 NotoSansSC-Regular.otf）放到 `public/fonts/`，在 `video.config.json` 里声明：`"fonts": [{"family": "Noto Sans SC", "file": "fonts/NotoSansSC-Regular.otf"}]`，并在风格和 `captions.style.fontFamily` 的列表前面加上 `"Noto Sans SC"`。
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
