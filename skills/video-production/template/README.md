# {{title}}

video-production 视频项目（{{mode}}，创建于 {{date}}）。一个视频就是一个项目：口播稿、分镜、配音、时间轴、字幕、场景代码、素材和成片都在这里，删掉 `node_modules` 之后仍然可以原样重新渲染。

## 重新渲染

需要 Python 3.9+、Node.js 18+、ffmpeg。`VP` 指 video-production 技能目录下的 `scripts/vp.py`。

```bash
python3 $VP setup                 # 按 lockfile 安装依赖（pnpm install / npm install）
python3 $VP build                 # 配音走缓存，不会重新合成；重算时间轴、混音、字幕
python3 $VP render --preview      # 低分辨率预览前 N 秒 → renders/preview.mp4
python3 $VP layout                # 版面检测（压盖、越界、溢出）→ qa/layout.md
python3 $VP render                # 先版面检测，再出成片 → renders/，并自动验收 → qa/report.md
python3 $VP cleanup               # 删掉 node_modules 与中间文件
```

拖动时间轴看画面：`python3 $VP studio`（Remotion Studio）。

## 目录

| 路径 | 内容 | 谁来改 |
|---|---|---|
| `video.config.json` | 视频参数（画幅、编码、音色、语速、字幕样式……），只写想改的字段 | 人 / 模型 |
| `brief.md` | 选题、受众、风格决定，每个检查点的确认记录 | 模型 |
| `storyboard.json` | 分镜 + 声画字关联表：镜头要表达的关系、画面形式与来源、口播句子、提示点 | 模型 |
| `script.md` | 口播稿（由 storyboard 生成，每句有编号，配音后带时间） | 生成 |
| `audio/tts/` | 逐句配音与词级时间（缓存，**不要删**：配音服务以后可能用不了） | 生成 |
| `timeline.json` | 全片唯一的时间来源 | 生成 |
| `captions/` | 字幕块 `captions.json`、`<outputName>.srt` | 生成 |
| `transcript.md` / `.txt` | 口播正文 | 生成 |
| `src/scenes/` | 自己写的场景组件，`index.ts` 是注册表 | 模型 |
| `src/genres/` | 类型包组件（从技能复制来的副本，项目内可改） | 生成 / 模型 |
| `src/algo/<id>/` | 算法类：展示代码 `code.*` + 记录步骤的 `trace.ts` | 模型 |
| `src/generated/` | 给 Remotion 读的数据与当前风格的字体引入（`fonts.ts`） | 生成 |
| `public/` | 图片、视频片段、字体、BGM；`public/audio/mix.wav` 是整片音轨 | 人 / 模型 / 生成 |
| `styles/<name>/theme.json` | 项目自定义风格（可选，覆盖技能自带的同名风格） | 模型 |
| `renders/` | `preview.mp4`、成片、`stills/` 抽帧 | 生成 |
| `qa/` | 验收报告 `report.md`、版面检测 `layout.md` | 生成 |
| `cover/` | 封面背景图与成品（没有生图能力时跳过） | 模型 / 生成 |
| `package.json` + lockfile | 依赖锁定，保证以后能原样重装 | 生成 |
