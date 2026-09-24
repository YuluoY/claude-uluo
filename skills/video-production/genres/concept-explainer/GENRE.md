# 概念讲解（concept-explainer）

适用：解释一个概念、原理、机制、事件、产品功能。它也是基础类型包，每个项目都会装，片头、要点、对比、定义这些镜头哪类视频都用得上。

## 讲解结构

按“建构”的顺序：先给具体经验，再给抽象概念。

1. **现象**：观众见过、能感到疑惑的具体场景（“第二次打开网页为什么快多了？”）。
2. **原理**：用一个关系讲清机制（先后、因果、对比、组成），配最能表达这个关系的画面。
3. **术语**：观众看懂了再命名（“这叫缓存命中”），不要一上来堆名词。
4. **反例 / 边界**：什么时候不成立、常见误解（“缓存里的内容也会过期”）。
5. **小结**：一句话或三个关键词。

## 先定关系，再选画面

写每个镜头时，先在 `intent` 里写清这一镜要让观众看懂的关系，再从下表选画面形式：

| 要表达的关系 | 画面形式 | 场景 |
|---|---|---|
| 抛出问题、点题 | 标题 / 一句大字 | `TitleCard` / `Statement` |
| 并列的几点 | 要点逐条出现 | `BulletList` |
| 先后、因果、流程 | 步骤框 + 箭头 | `FlowSteps` |
| 两者差异 | 左右对比 | `Compare` |
| 一个概念是什么 | 术语 → 释义 → 例子 | `Definition` |
| 多少、大小（必须有出处） | 大数字 / 柱状图 | `BigNumber` / `BarChart` |
| 随时间的变化 | 时间线 | `EventLine` |
| 图中的局部 | 图片推近 + 标注 | `ImageFocus` |
| 一段代码 | 代码高亮随口播移动 | `CodeSnippet` |
| 原话 | 引用 | `Quote` |
| 要记住的结论 | 大字，关键词变色 | `Statement` |

没有合适的就在项目 `src/scenes/` 里写新场景（见 references/scenes.md）。同一种新画面在两个以上视频里用到，就值得提炼成类型包组件。

## 数字与事实

- 素材里没有的数字不许编。`BigNumber` / `BarChart` 的 `source` 必填，画面上会显示“来源：…”。
- 没有出处的数字，改成定性的说法（“慢很多”“多了一个数量级”也要有依据），或者删掉。
- 引用（`Quote`）必须是原话，`by` / `source` 写清出处。

## 场景参数

所有“逐个出现”的元素都一样：第 k 项在 `at[k]` 提示点出现；没给 `at` 就在镜头第 k 句开始念时出现。

| 场景 | 参数 |
|---|---|
| `TitleCard` | `title`（必填）、`subtitle`、`kicker`（标题上方小字）、`align`：center / left |
| `Statement` | `text`（必填）、`emphasis`：要变色的词数组、`at`：变色的提示点、`align` |
| `BulletList` | `items`（必填）、`title`、`at`、`numbered` |
| `FlowSteps` | `steps`：`[{label, detail?}]`（必填）、`title`、`at`、`direction`：auto / row / column |
| `Compare` | `left` / `right`：`{title, points[]}`（必填）、`title`、`at`（第 k 行两边一起出现）、`verdict`：结论、`verdictAt` |
| `Definition` | `term`、`definition`（必填）、`example`、`at`：术语 / 释义 / 例子依次出现的提示点 |
| `BigNumber` | `value`、`label`、`source`（必填）、`decimals`、`prefix`、`suffix`、`at`：开始数数的提示点 |
| `BarChart` | `data`：`[{label, value}]`、`source`（必填）、`title`、`unit`、`highlight`：高亮哪一项的 label、`at` |
| `EventLine` | `events`：`[{date, label}]`（必填）、`title`、`at` |
| `ImageFocus` | `file`（相对 public/，必填）、`fit`、`focus`：`[{x, y, w, h, at?, label?}]`（0–1 相对坐标，依次推近） |
| `CodeSnippet` | `code`、`lang`（必填）、`title`、`codeTitle`、`highlights`：`[{lines: [行号], at?}]`、`dimInactive` |
| `Quote` | `text`（必填）、`by`、`source` |

## 示例

`examples/storyboard.example.json`：一分钟讲清“缓存”，7 个镜头，按现象 → 原理 → 术语 → 对比 → 反例 → 小结展开。
