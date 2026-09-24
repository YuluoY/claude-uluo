# 分镜：storyboard.json

分镜就是**声画字关联表**：每个镜头写清要表达的关系、画面形式和画面来源，再挂上这一镜要念的句子。句子的时长来自配音，镜头的时长来自句子，所以不需要也不允许手填时长，更不会平均分配。完整字段见 `config/storyboard.schema.json`（编辑器里 `$schema` 会给补全）。

```json
{
  "shots": [
    {
      "id": "walk-1",
      "chapter": "逐行走一遍",
      "intent": "代码每一行在数据上做了什么",
      "visual": "左边代码逐行高亮，右边柱状数组随步骤变化",
      "source": { "type": "scene", "component": "AlgoScene", "props": { "trace": "insertion-sort" } },
      "transition": { "type": "fade", "durationSec": 0.4 },
      "sentences": [
        { "text": "往左比：5 比 2 大，5 就往右挪一格。", "steps": [3, 6],
          "cues": [{ "id": "cmp", "at": "5 比 2 大", "step": 4 }] }
      ]
    }
  ]
}
```

## 镜头

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | 全片唯一，字母数字 `-` `_` |
| `chapter` | | 章节名；相邻同名镜头属于同一章，进度条按章分段 |
| `intent` | 是 | **这一镜要让观众看懂的关系**。先写它，再选画面（explaining.md） |
| `visual` | 是 | 画面形式：用什么画、怎么动 |
| `source` | 是 | 画面来源，见下 |
| `sentences` | 是 | 本镜要念的句子，可以为空数组（纯画面镜头） |
| `transition` | | 进入本镜的转场 `cut` / `fade` / `slide` / `wipe`，缺省用配置里的 `transition` |
| `holdSec` | | 最后一句念完后画面多停一会儿 |
| `minDurationSec` | | 镜头最短时长（动画需要展开时间时用），不够就延长停留 |
| `durationSec` | | **只用于没有句子的镜头**；有句子的镜头写了会报错 |

画面来源 `source`：

| type | 字段 | 用途 |
|---|---|---|
| `scene`（默认选择） | `component`、`props` | React 场景：类型包里的场景或项目 `src/scenes/` 里自己写的 |
| `clip` | `file`（相对 public/）、`trimStartSec`、`fit`、`volume`（默认 0 静音）、`loop`、`playbackRate`、`background` | 视频片段：视频生成模型的产出、现成素材、录屏。片段比镜头短时停在最后一帧（`loop: true` 则循环） |
| `image` | `file`、`fit`、`kenBurns`、`background` | 图片，`kenBurns` 缓慢推近 |

## 句子

| 字段 | 说明 |
|---|---|
| `text` | 显示文本，字幕照此显示 |
| `id` | 全片唯一；缺省自动生成 `<镜头id>-<序号>`（外部音频按 id 找文件时建议手写） |
| `say` | 朗读文本，TTS 按此朗读；缺省为 `text` 套用 `voice.pronunciations` 后的结果 |
| `rate` | 本句语速，如 `-10%`，覆盖 `voice.rate` |
| `pauseAfterSec` | 本句之后的停顿，覆盖句间/镜头间停顿 |
| `steps` | 算法类：本句覆盖的 trace 步骤 `[起, 止]`，需要镜头 `source.props.trace` |
| `cues` | 画面提示点，见下 |

**显示与朗读分开存。** `O(n log n)` 屏幕上照原样显示，TTS 要读“O n log n”；`a[1]` 要读“a 1”。能统一处理的写进 `voice.pronunciations`（如 `{"O(n²)": "O n 平方"}`，长键优先），个别句子用 `say`。`say` 必须和 `text` 说的是同一件事：字幕按 `text` 显示、按 `say` 的词级时间对齐，两者差太多时字幕时间会退回估算（build 会给警告）。

**一句多长。** 一句是一口气能说完的完整意思，12–35 个字为宜。太长的句子字幕会切成好几块，画面也难以跟上；太短会碎。

## 提示点（cues）

提示点把画面事件钉在某个词上：念到 `at` 这几个字时触发，场景里用 `useCueFrame(id)` 取到帧号。

| 字段 | 说明 |
|---|---|
| `id` | 镜头内唯一 |
| `at` | 本句 `text` 里的一段原文 |
| `occurrence` | `at` 在本句第几次出现，默认 1 |
| `edge` | `start`（开始念，默认）/ `end`（念完） |
| `offsetSec` | 再提前（负）或推后（正）一点 |
| `step` | 算法类：到这个时刻切到第几步 |

很多场景的“逐个出现”参数（`at: [...]`）接收的就是提示点 id；不给提示点时默认在第 k 句开始念时出现第 k 项。所以**句子与画面元素一一对应时不用写提示点**，要精确到词时才写。

## 算法步骤（steps）

- 句子的 `steps: [a, b]` 表示念这句期间画面从第 a 步走到第 b 步；默认在这句的有声区间内按步号均匀分布。
- 用 `cues[].step` 把关键步骤钉到词上，其余步骤在提示点之间按步号插值。
- 相邻句子首尾相接（上一句止于 k，下一句从 k+1 开始），跳过的步骤观众看不到。
- 步号超出 trace 范围、提示点的步骤顺序与时间顺序相反，build 都会报错。

## 规则（校验会检查）

- 镜头 id、句子 id 全片唯一；提示点 id 镜头内唯一；`at` 必须能在本句 `text` 中找到。
- `text` / `say` 必须有可朗读的文字。
- 有句子的镜头不能写 `durationSec`；没有句子的镜头必须写。
- clip / image 的文件必须存在于 `public/`。
- 场景组件名要么在已安装类型包里，要么在 `src/scenes/index.ts` 登记（`VP check` 会提示）。

## 排布规则（build 自动完成）

- 句子起点对齐到帧；每句配音裁掉首尾静音，保留 `pacing.headPadSec` / `tailPadSec`。
- 句间停顿 `pacing.sentencePauseSec`，镜头间停顿 `pacing.shotPauseSec`；片头留白 `leadInSec`，片尾 `tailSec`。
- 镜头画面比它第一句口播提前 `pacing.visualLeadSec` 出现，但不早于上一镜口播结束。
- 镜头首尾相接铺满全片；转场是后一镜盖在前一镜上进入，前一镜在转场结束前保持显示（防闪）。
