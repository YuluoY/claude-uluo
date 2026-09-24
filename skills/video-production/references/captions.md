# 字幕

字幕从时间轴生成，不手写时间。produce 模式用 React 画进画面（字体样式与画面统一），同时导出 `captions/<outputName>.srt` 给需要外挂字幕的平台；footage 模式把每个字幕块渲染成透明图叠到原视频上（不依赖 ffmpeg 的 libass）。

## 切分规则

- **一块是一个短意群，不放整句整段。** 横屏每行不超过 16 个字，竖屏 12 个字（`captions.maxCharsPerLine`，汉字计 1，西文字母/数字计 0.5），默认一行（`maxLines`）。
- **块不跨句。**
- **在哪断：** 句号问号 > 冒号 > 逗号 > 右括号引号 > 顿号（列举尽量不拆开）≈ 空格 > 词与词之间。一个分句尽量自成一块；太长的分句拆开时两块长度尽量均衡。
- **绝不拆开一个词。** edge-tts 按词返回时间，词与词之间就是边界。没有词级时间（按字估算、whisper 的单字）时，装了 `jieba` 就用它判断词边界（`pip install jieba`），没装时会尽量在标点处断。
- **时间：** 每块从第一个词开始念时出现，到最后一个词念完时消失；一句最后一块多停 `lingerSec`；相邻两块至少空 `gapSec`（0.04–0.08 秒，避免闪成一片）；短于 `minDurationSec` 的块在不压到下一块的前提下延长；句间停顿里不显示字幕。
- **标点：** `punctuation: "subtitle"`（默认）去掉块尾的逗号句号，块内的中文逗号句号换成全角空格；`trim` 只去块尾；`keep` 保留原样。问号叹号引号括号始终保留。

## 样式（`captions.style`）

字体、字号（按成片像素）、颜色、描边（两层叠放，不吃笔画）、阴影、底栏（`background`）、离底距离（`bottomPct`，另加安全区）、最大宽度、行高；`highlightWords: true` 时当前正在念的词变成 `highlightColor`（仅 produce 模式）。完整参数见 config.md。

## 一致性检查（build 与 qa 都会做）

- 每句的字幕块拼起来（忽略标点空白）必须与原文一致；
- 块与块不重叠、每块时长大于 0；
- 每行宽度不超限（单个超长词除外）；
- 每块落在所属句子的口播时间内（加上停留时长）。

## 显示文本与朗读文本

字幕显示 `text`，配音读 `say`。对齐时把显示文本逐字对到朗读文本上：一样的字一一对应，被替换的片段整块对应（例如显示 `O(n²)` 对应朗读“O n 平方”，这几个字符共用那几个词的时间）。所以：

- 读法替换放在 `voice.pronunciations` 或 `say`，**不要为了读音去改显示文字**；
- 数字、公式、代码、英文缩写都可以原样显示。

## 语速与字幕

字幕本身没有速度，它跟着配音走：

- 有配音时，能调的是 `voice.rate`（全局）或句子的 `rate`；时间轴自动重算，字幕随之更新。能调的字幕参数是每块多长（`maxCharsPerLine`、`maxLines`）和停留（`lingerSec`、`minDurationSec`）。
- 不配音（`voice.engine: "none"`）时，每句显示时长 = 字数 ÷ `voice.readingCharsPerSec`（中文 4–5 字/秒），最短 1.2 秒。

## footage：校对

`VP asr` 生成 `captions/transcript.proof.json`：

```json
{ "segments": [ { "id": "p0001", "text": "识别结果，给人改", "asr": "识别原文，不要改", "drop": false } ] }
```

- 只改 `text`：错字、标点、专有名词写法；不改 `id` 和 `asr`，不增删段落；
- 不要的段落（口误、闲聊）设 `"drop": true`；
- 时间来自识别结果，build 时把 `text` 对齐回 `asr` 的词时间，改字不影响时间；
- 字幕、SRT、`transcript.md` / `.txt` 都来自这一份校对稿。

重新识别用 `VP asr --force`（会覆盖校对结果）。
