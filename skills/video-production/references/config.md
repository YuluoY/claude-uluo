# 配置参数（video.config.json）

> 本文件由 `vp.py config --doc` 生成，不要手改；改 `config/video.config.schema.json` 或 `config/defaults.json` 后重新生成。

项目根目录的 `video.config.json` 只写想改的字段，其余按下面的顺序逐层合并：

1. 技能默认值 `config/defaults.json`
2. 用户级默认 `~/.config/video-production/defaults.json`（或环境变量 `VP_USER_DEFAULTS` 指向的文件），适合放个人常用音色、水印
3. 平台预设 `preset`（只覆盖画幅、安全区、字幕尺寸这类平台相关字段）
4. 项目 `video.config.json`

对象逐键合并，数组和标量整体替换。合并结果按 schema 校验，再检查跨字段约束（例如 crf 与 videoBitrate 只能设一个）。
`vp.py config` 打印某个项目合并后的完整配置。

最小示例：

```json
{
  "title": "Dijkstra 最短路径",
  "preset": "landscape-1080p",
  "genre": "algorithm",
  "style": "midnight",
  "voice": { "voice": "zh-CN-YunxiNeural", "rate": "+5%" },
  "audio": { "bgm": { "file": "public/audio/bgm.mp3", "volumeDb": -26 } }
}
```

## 全部参数

| 参数 | 类型 / 取值 | 默认值 | 说明 |
|---|---|---|---|
| `mode` | "produce" / "footage" | "produce" | produce：从口播/分镜制作新视频；footage：给已有视频转写并烧字幕 |
| `preset` | string | "landscape-1080p" | 平台预设名，见 config/presets.json；只覆盖画幅、安全区、字幕尺寸这类平台相关字段 |
| `title` | string | "" | 视频标题，用于口播正文标题与进度条 |
| `language` | string（格式 `^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$`） | "zh-CN" | BCP 47 语言标签，如 zh-CN、en-US |
| `genre` | string（格式 `^[a-z0-9][a-z0-9-]*$`） | "concept-explainer" | 主类型包名（genres/<name>），决定讲解结构与可用组件 |
| `style` | string（格式 `^[a-z0-9][a-z0-9-]*$`） | "midnight" | 视觉风格包名（styles/<name> 或项目内 styles/<name>） |
| `video.width` | integer（≥16，≤7680） | 1920 | 成片宽度（像素），通常由 preset 决定 |
| `video.height` | integer（≥16，≤7680） | 1080 | 成片高度（像素），通常由 preset 决定 |
| `video.fps` | integer（≥1，≤120） | 30 | 帧率。讲解类 30 足够，动画多可用 60 |
| `video.codec` | "h264" / "h265" / "vp9" / "prores" | "h264" | h264/h265 → mp4，vp9 → webm，prores → mov |
| `video.crf` | integer 或 null（≥0，≤63） | null | null 用编码器默认（h264 为 18）；与 videoBitrate 互斥 |
| `video.videoBitrate` | string 或 null（格式 `^[0-9]+(\.[0-9]+)?[kKmM]$`） | null | 如 "8M"、"6000k"；与 crf 互斥 |
| `video.x264Preset` | null / "ultrafast" / "superfast" / "veryfast" / "faster" / "fast" / "medium" / "slow" / "slower" / "veryslow" | null | 仅 h264 可设 |
| `video.pixelFormat` | "yuv420p" / "yuv444p" / "yuv420p10le" | "yuv420p" | prores 时忽略；yuv420p10le 仅 h265/vp9 |
| `video.colorSpace` | "bt709" / "bt601" / "bt2020-ncl" | "bt709" | bt709：标准有限范围（网络平台通用，推荐）；bt601：Remotion 4 的旧默认，JPEG 帧会输出全范围 yuvj420p，部分播放器发灰；bt2020-ncl：HDR 用 |
| `video.proresProfile` | "4444-xq" / "4444" / "hq" / "standard" / "light" / "proxy" | "hq" | 仅 codec=prores 时生效 |
| `video.imageFormat` | "jpeg" / "png" | "jpeg" | 逐帧截图格式：jpeg 快，png 无损但慢 |
| `video.jpegQuality` | integer（≥1，≤100） | 92 | imageFormat=jpeg 时逐帧截图的质量 |
| `video.safeArea` | 对象 |  | 平台界面遮挡区，按画面百分比（top/bottom 相对高度，left/right 相对宽度）。场景布局与字幕都会避开 |
| `video.safeArea.top` | number（≥0，≤40） | 0 | 顶部被平台界面挡住的比例（%） |
| `video.safeArea.bottom` | number（≥0，≤40） | 0 | 底部被平台界面挡住的比例（%），字幕会再往上让 |
| `video.safeArea.left` | number（≥0，≤40） | 0 | 左侧遮挡比例（%） |
| `video.safeArea.right` | number（≥0，≤40） | 0 | 右侧遮挡比例（%），竖屏平台的点赞评论栏在右侧 |
| `audio.sampleRate` | 44100 / 48000 | 48000 | 采样率（Hz） |
| `audio.channels` | 1 / 2 | 2 | 声道数：1 单声道 / 2 立体声 |
| `audio.bitrate` | string（格式 `^[0-9]+[kK]$`） | "192k" | 成片音频码率，如 192k |
| `audio.gainDb` | number（≥-30，≤40） | 0 | 整体增益（dB），在响度标准化之前施加；footage 模式口播太小时调高 |
| `audio.loudness.enabled` | boolean | true | 是否做响度标准化（两遍 loudnorm） |
| `audio.loudness.targetLufs` | number（≥-40，≤-5） | -16 | 目标整体响度（LUFS）。网络视频常用 -16，广播 -23 |
| `audio.loudness.truePeakDb` | number（≥-9，≤0） | -1.5 | 真峰值上限（dBTP） |
| `audio.loudness.lra` | number（≥1，≤20） | 11 | 响度范围目标（LU） |
| `audio.bgm.file` | string 或 null | null | 相对项目根目录的音频路径，null 为不加 BGM |
| `audio.bgm.volumeDb` | number（≥-60，≤0） | -24 | BGM 基础音量（dB），建议 -20 到 -28 |
| `audio.bgm.duck` | boolean | true | 有口播时自动压低 BGM（sidechain） |
| `audio.bgm.duckRatio` | number（≥1，≤20） | 6 | 有人声时 BGM 的压缩比，越大压得越低 |
| `audio.bgm.fadeInSec` | number（≥0，≤30） | 1.5 | BGM 开头淡入时长 |
| `audio.bgm.fadeOutSec` | number（≥0，≤30） | 2.5 | BGM 结尾淡出时长 |
| `audio.bgm.loop` | boolean | true | BGM 比成片短时循环播放 |
| `voice.engine` | "edge-tts" / "external" / "say" / "none" | "edge-tts" | edge-tts：默认免费；external：模型/用户已生成的逐句音频；say：macOS 系统语音；none：不配音，字幕按阅读速度计时 |
| `voice.voice` | string | "zh-CN-YunxiNeural" | edge-tts 音色，如 zh-CN-YunxiNeural、zh-CN-XiaoxiaoNeural |
| `voice.rate` | string（格式 `^[+-][0-9]+%$`） | "+0%" | 语速，edge-tts 格式 +10% / -5% |
| `voice.volume` | string（格式 `^[+-][0-9]+%$`） | "+0%" | 音量调整，edge-tts 格式 +0% / -10% |
| `voice.pitch` | string（格式 `^[+-][0-9]+Hz$`） | "+0Hz" | 音高调整，edge-tts 格式 +0Hz / -5Hz |
| `voice.fallbackEngine` | "say" / null | "say" | edge-tts 多次重试仍失败时的降级引擎 |
| `voice.sayVoice` | string | "Tingting" | macOS say 的音色名（中文如 Tingting） |
| `voice.retries` | integer（≥0，≤10） | 3 | 每句合成失败后的重试次数（指数退避） |
| `voice.timeoutSec` | integer（≥5，≤600） | 60 | 每句合成的超时时间 |
| `voice.pronunciations` | object |  | 显示文本 → 朗读文本的替换表（字幕照原文显示，TTS 按替换后读）。长键优先 |
| `voice.externalDir` | string | "audio/external" | engine=external 时逐句音频目录（相对项目根），文件名 <句子id>.(wav\|mp3\|m4a\|aiff\|flac) |
| `voice.align` | "auto" / "whisper" / "estimate" | "auto" | 无词级时间戳的引擎（external/say）如何得到字幕时间：auto=装了 whisper 就对齐，否则按字数估算 |
| `voice.readingCharsPerSec` | number（≥2，≤12） | 4.5 | engine=none 时的阅读速度（每秒汉字数，西文字母按半个字），决定每句显示多久 |
| `asr` | 对象 |  | 语音识别（whisper）：footage 模式转写，以及 produce 模式给没有词级时间的配音做对齐 |
| `asr.engine` | "auto" / "faster-whisper" / "openai-whisper" | "auto" | auto：优先 faster-whisper，其次 openai-whisper |
| `asr.model` | string | "small" | whisper 模型名：tiny/base/small/medium/large-v3 等 |
| `asr.language` | string | "zh" | whisper 语言代码，如 zh、en |
| `asr.initialPrompt` | string | "以下是普通话的句子，使用简体中文和标点。" | 引导 whisper 输出简体与标点 |
| `asr.boostBelowMeanDb` | number（≥-90，≤0） | -40 | 识别前探测平均音量，低于此值另存一份抬高音量的音频专供识别 |
| `asr.boostDb` | number（≥0，≤40） | 20 | 识别前抬高音量的幅度（dB），只影响识别用的音频 |
| `pacing` | 对象 |  | 节奏：句间停顿、镜头切换停顿、片头片尾留白 |
| `pacing.leadInSec` | number（≥0，≤10） | 0.4 | 片头第一句口播前的留白 |
| `pacing.tailSec` | number（≥0，≤30） | 1.2 | 片尾最后一句之后的留白 |
| `pacing.sentencePauseSec` | number（≥0，≤5） | 0.3 | 同一镜头内句与句之间的停顿 |
| `pacing.shotPauseSec` | number（≥0，≤5） | 0.6 | 换镜头时的停顿（给画面切换留时间） |
| `pacing.headPadSec` | number（≥0，≤1） | 0.05 | 每句裁掉前导静音后保留的头部余量 |
| `pacing.tailPadSec` | number（≥0，≤1） | 0.2 | 每句裁掉尾部静音后保留的尾部余量 |
| `pacing.visualLeadSec` | number（≥0，≤2） | 0.2 | 画面比口播提前多久切到下一镜 |
| `captions.enabled` | boolean | true | 是否生成字幕（关掉后既不烧录也不导出 SRT） |
| `captions.render` | "burn" / "soft" / "both" | "burn" | burn：画进画面；soft：只封装字幕轨；both：两者都要 |
| `captions.maxCharsPerLine` | number（≥4，≤60） | 16 | 每行最大宽度，按汉字计（西文字母/数字按半个字） |
| `captions.maxLines` | 1 / 2 | 1 | 每块字幕最多几行 |
| `captions.minChars` | number（≥0，≤20） | 4 | 短于此宽度的字幕块尽量与相邻块合并 |
| `captions.minDurationSec` | number（≥0，≤5） | 0.7 | 每块字幕最短显示时间，不够就在不压到下一块的前提下延长 |
| `captions.gapSec` | number（≥0，≤1） | 0.06 | 相邻两条字幕之间的最小空隙 |
| `captions.lingerSec` | number（≥0，≤2） | 0.25 | 一句话最后一块字幕在说完后多停留的时间 |
| `captions.punctuation` | "keep" / "trim" / "subtitle" | "subtitle" | keep：保留原标点；trim：去掉块尾的逗号句号等；subtitle：trim 且块内中文逗号句号换成全角空格 |
| `captions.style.fontFamily` | array 或 null | null | 字体回退列表；null（默认）用风格的正文字体（随项目打包，任何系统渲染一致） |
| `captions.style.fontSize` | number（≥8，≤400） | 54 | 像素（按成片分辨率） |
| `captions.style.fontWeight` | integer（≥100，≤900） | 700 | 字重 100–900 |
| `captions.style.color` | string | "auto" | 文字颜色；auto 按风格（深色风格白字，浅色风格用风格正文色） |
| `captions.style.strokeColor` | string | "auto" | 描边颜色；auto 按风格（深色风格黑描边，浅色风格用背景色描边） |
| `captions.style.strokeWidth` | number（≥0，≤40） | 6 | 描边宽度（像素），0 为不描边 |
| `captions.style.shadow` | boolean | true | 是否加投影 |
| `captions.style.background` | string 或 null | null | 底栏颜色，null 为无底栏（默认） |
| `captions.style.bottomPct` | number（≥0，≤60） | 7 | 字幕底边距画面底边的距离（百分比，另加 safeArea.bottom） |
| `captions.style.maxWidthPct` | number（≥20，≤100） | 86 | 字幕最大宽度（占画面宽度的百分比） |
| `captions.style.lineHeight` | number（≥1，≤2.5） | 1.3 | 行高倍数 |
| `captions.style.highlightWords` | boolean | false | 逐词高亮当前正在读的词（仅 produce 模式） |
| `captions.style.highlightColor` | string | "auto" | highlightWords 开启时当前词的颜色；auto 用风格强调色 |
| `transition` | 对象 |  | 镜头切换：新镜头盖在旧镜头上进入，旧镜头在转场结束前一直保留（防闪） |
| `transition.type` | "cut" / "fade" / "slide" / "wipe" | "cut" | 默认转场：cut 硬切 / fade 淡入 / slide 滑入 / wipe 擦除（都是新镜头盖在旧镜头上进入） |
| `transition.durationSec` | number（≥0，≤3） | 0.35 | 转场时长 |
| `overlays.watermark.enabled` | boolean | false | 是否显示水印 |
| `overlays.watermark.text` | string | "" | 水印文字（image 为空时使用） |
| `overlays.watermark.image` | string 或 null | null | 相对 public/ 的图片路径 |
| `overlays.watermark.position` | "top-left" / "top-right" / "bottom-left" / "bottom-right" | "top-right" | 水印位置（自动避开安全区） |
| `overlays.watermark.opacity` | number（≥0，≤1） | 0.6 | 水印不透明度 |
| `overlays.watermark.size` | number（≥4，≤400） | 28 | 文字字号或图片高度（像素） |
| `overlays.progressBar` | 对象 |  | 细进度条：贴着安全区上沿或下沿的一条线（按章节分段）；需要带章节名的格子请用 chapterBar |
| `overlays.progressBar.enabled` | boolean | false | 是否显示进度条 |
| `overlays.progressBar.position` | "top" / "bottom" | "top" | 进度条在顶部还是底部 |
| `overlays.progressBar.height` | number（≥1，≤60） | 6 | 进度条粗细（像素，短边 1080 基准） |
| `overlays.progressBar.showChapters` | boolean | true | 按 storyboard 的 chapter 分段并显示当前章节名 |
| `overlays.chapterBar` | 对象 |  | 章节条：画面上方或下方的一排格子，每格一个章节（storyboard 镜头的 chapter），当前章节高亮并显示本章播放进度。开启后内容区与字幕带自动让开。footage 模式忽略 |
| `overlays.chapterBar.enabled` | boolean | false | 是否显示章节条 |
| `overlays.chapterBar.position` | "top" / "bottom" | "top" | 贴着安全区上沿还是下沿（下沿时字幕整体上移） |
| `overlays.chapterBar.style` | "filled" / "outline" / "underline" | "filled" | filled 实色格（当前章节强调色）/ outline 描边格 / underline 文字 + 下划进度线 |
| `overlays.chapterBar.widths` | "equal" / "duration" | "equal" | equal 等宽 / duration 按章节时长分宽（每格至少为平均宽度的 45%） |
| `overlays.chapterBar.showProgress` | boolean | true | 在当前章节格子里显示本章播放进度 |
| `overlays.chapterBar.height` | number（≥24，≤160） | 56 | 格子高度（像素，短边 1080 基准） |
| `fonts` | array | [] | 需要随项目加载的本地字体文件（放在 public/ 下）。Linux 渲染中文必须提供 |
| `cover.enabled` | "auto" / true / false | "auto" | auto：模型有生图能力才做封面；false：不做；true：必须做（无生图能力时报告无法完成） |
| `cover.aspect` | string（格式 `^[0-9]+:[0-9]+$`） | "16:9" | 封面宽高比，如 16:9、9:16、3:4；短边固定 1080 像素 |
| `render.concurrency` | integer 或 null（≥1，≤64） | null | 并行渲染标签页数，null 由 Remotion 决定 |
| `render.outputName` | string（格式 `^[A-Za-z0-9._-]+$`） | "final" | 成片文件名（不含扩展名），SRT 也用这个名字 |
| `render.preview.scale` | number（>0，≤1） | 0.5 | 预览缩放比例，0.5 即半分辨率 |
| `render.preview.maxSeconds` | number 或 null（>0） | 30 | 预览只渲染前 N 秒，null 为全片 |
| `footage` | 对象 |  | mode=footage 专用 |
| `footage.source` | string 或 null | null | 源视频路径（相对项目根或绝对路径）。成片沿用源视频的分辨率和帧率，字幕尺寸按源视频与 video.width/height 的比例缩放 |
| `footage.copySource` | boolean | true | init 时把源视频复制进项目 footage/ 目录，之后 source 指向副本 |
| `qa` | 对象 |  | 验收阈值 |
| `qa.blackMinSec` | number（>0，≤30） | 0.5 | 连续黑帧超过多久报告 |
| `qa.blackPixelThreshold` | number（≥0，≤1） | 0.05 | blackdetect 的 pix_th：亮度低于此比例的像素算黑 |
| `qa.freezeWarnSec` | number（>0，≤120） | 8 | 画面静止超过多久报告（讲解视频允许短暂静止） |
| `qa.loudnessToleranceLu` | number（≥0.1，≤10） | 1.5 | 成片整体响度与 audio.loudness.targetLufs 的允许偏差 |
| `qa.stills` | boolean | true | 验收时从成片每个镜头中点抽一帧到 renders/stills/final/ |
| `cleanup.removeNodeModules` | boolean | true | 清理时删除 node_modules（lockfile 保留，可原样重装） |
| `cleanup.removeWorkDir` | boolean | true | 删除 renders/_work、renders/_seq 中间文件 |
| `cleanup.removePreview` | boolean | false | 清理时删除 renders/preview.mp4 |

## 平台预设（preset）

| 名称 | 说明 | 覆盖的字段 |
|---|---|---|
| `landscape-1080p` | 横屏 1920×1080：B 站、YouTube、西瓜视频等 | video.width=1920，video.height=1080，video.safeArea.top=0，video.safeArea.bottom=0，video.safeArea.left=0，video.safeArea.right=0，captions.maxCharsPerLine=16，captions.style.fontSize=54，captions.style.bottomPct=7，cover.aspect="16:9" |
| `landscape-720p` | 横屏 1280×720：体积小，适合快速草稿 | video.width=1280，video.height=720，video.safeArea.top=0，video.safeArea.bottom=0，video.safeArea.left=0，video.safeArea.right=0，captions.maxCharsPerLine=16，captions.style.fontSize=36，captions.style.strokeWidth=4，captions.style.bottomPct=7，cover.aspect="16:9" |
| `landscape-1440p` | 横屏 2560×1440：录屏/代码讲解需要更清晰的文字 | video.width=2560，video.height=1440，video.safeArea.top=0，video.safeArea.bottom=0，video.safeArea.left=0，video.safeArea.right=0，captions.maxCharsPerLine=16，captions.style.fontSize=72，captions.style.strokeWidth=8，captions.style.bottomPct=7，cover.aspect="16:9" |
| `landscape-4k` | 横屏 3840×2160 | video.width=3840，video.height=2160，video.safeArea.top=0，video.safeArea.bottom=0，video.safeArea.left=0，video.safeArea.right=0，captions.maxCharsPerLine=16，captions.style.fontSize=108，captions.style.strokeWidth=12，captions.style.bottomPct=7，cover.aspect="16:9" |
| `portrait-1080x1920` | 竖屏 1080×1920：抖音、快手、视频号、YouTube Shorts。安全区为经验值，按平台实际界面微调 | video.width=1080，video.height=1920，video.safeArea.top=8，video.safeArea.bottom=16，video.safeArea.left=4，video.safeArea.right=12，captions.maxCharsPerLine=12，captions.style.fontSize=64，captions.style.strokeWidth=7，captions.style.bottomPct=6，captions.style.maxWidthPct=84，cover.aspect="9:16" |
| `portrait-3x4` | 竖版 1080×1440：小红书图文视频 | video.width=1080，video.height=1440，video.safeArea.top=4，video.safeArea.bottom=8，video.safeArea.left=4，video.safeArea.right=4，captions.maxCharsPerLine=13，captions.style.fontSize=56，captions.style.strokeWidth=6，captions.style.bottomPct=6，captions.style.maxWidthPct=88，cover.aspect="3:4" |
| `square-1080` | 方形 1080×1080：信息流、朋友圈 | video.width=1080，video.height=1080，video.safeArea.top=0，video.safeArea.bottom=0，video.safeArea.left=0，video.safeArea.right=0，captions.maxCharsPerLine=13，captions.style.fontSize=52，captions.style.strokeWidth=6，captions.style.bottomPct=7，captions.style.maxWidthPct=88，cover.aspect="1:1" |
