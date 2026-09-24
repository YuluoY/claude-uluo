# 配音与混音

## 配音引擎（`voice.engine`）

| 引擎 | 什么时候 | 词级时间 |
|---|---|---|
| `edge-tts`（默认） | 免费，中文音色好（`zh-CN-YunxiNeural` 男声、`zh-CN-XiaoxiaoNeural` 女声等） | 有：显式请求 `WordBoundary`（7.2 起默认只给句级，脚本已处理） |
| `external` | 模型或用户用别的 TTS 生成好了逐句音频 | 没有：按 `voice.align` 用 whisper 对齐或按字数估算 |
| `say` | macOS 自带，离线兜底 | 没有：同上 |
| `none` | 不要配音，只要字幕和画面 | 句长按阅读速度 `readingCharsPerSec` |

- 音色列表：`edge-tts --list-voices`。语速 `voice.rate` 如 `+10%`，单句用句子的 `rate`；音量 `volume`、音高 `pitch`。
- `external`：文件放 `audio/external/<句子id>.(wav|mp3|m4a|aiff|flac)`（目录可用 `voice.externalDir` 改），句子 id 建议在 storyboard 里手写。音频内容变了会自动重新对齐（按文件哈希缓存）。
- `voice.align`：`auto` 装了 whisper（`pip install faster-whisper`）就对齐，否则估算；`whisper` 必须对齐；`estimate` 直接估算。对齐时把朗读文本当作 whisper 的提示词，识别结果更贴近原文。

## 缓存与留存

- 每句配音存为 `audio/tts/<句子id>.mp3|aiff` + `<句子id>.json`（引擎参数与朗读文本算出的 key、时长、有声区间、词时间）。key 不变就不重新合成：改一句只重配这一句。
- **`audio/tts/` 是素材，不要删。** edge-tts 是非官方客户端，调用微软 Edge 的朗读服务，没有稳定性保障，可能限流或因接口变动失效；到那时已合成的音频补不回来。
- 失败处理：每句重试 `voice.retries` 次（指数退避）；仍失败且 `fallbackEngine: "say"` 时在 macOS 上改用 `say` 合成这几句（下次 edge-tts 恢复后会自动换回）；其他系统上报错，已成功的句子保留缓存，稍后重跑即可。
- 需要代理访问时设环境变量 `VP_TTS_PROXY=http://…`。

## 拼接与混音

- `public/audio/narration.wav`：按时间轴把每句裁好的配音写到精确的采样位置（逐句解码为 PCM 再写入，没有累计误差，也不会被 amix 平均掉音量）。
- `public/audio/mix.wav`：narration 施加 `audio.gainDb` → 可选 BGM（循环、淡入淡出、有人声时 sidechain 压低 `duckRatio`）→ 两遍 `loudnorm` 到 `audio.loudness.targetLufs`（默认 -16 LUFS，适合网络平台）。Remotion 渲染时用它作为整片音轨。
- BGM 文件放项目里（如 `public/audio/bgm.mp3`），`audio.bgm.file` 写相对项目根的路径；`volumeDb` 建议 -20 到 -28。
- 只改 BGM 或响度不会重新配音；只改画面不会重新混音。

## footage 模式的音频

原视频的音轨：`gainDb` 与 `loudness` 都不需要时直接复制；否则施加增益 + 两遍 loudnorm 后编码为 AAC。

## 其他 TTS

模型能调用更好的 TTS（有工具、MCP 或 API key）时：逐句生成音频存到 `audio/external/<句子id>.wav`，把 `voice.engine` 设为 `external`。它们大多不给词级时间戳，装上 faster-whisper 后字幕仍能对齐到词。
