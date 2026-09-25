# 概念讲解（concept-explainer）

适用：解释一个概念、原理、机制、事件、产品功能。它也是基础类型包，每个项目都会装，片头、要点、对比、定义这些镜头哪类视频都用得上。

## 讲解结构

按“建构”的顺序：先给具体经验，再给抽象概念。正片第一镜用 `TitleCard` 写出主题，口播把主题说出来，然后再进入现象。不要用“今天只做一件事”这类预告句代替标题页。

1. **现象**：观众见过、能感到疑惑的具体场景（“第二次打开网页为什么快多了？”）。
2. **原理**：用一个关系讲清机制（先后、因果、对比、组成），配最能表达这个关系的画面。
3. **术语**：观众看懂了再命名（“这叫缓存命中”），不要一上来堆名词。
4. **反例 / 边界**：什么时候不成立、常见误解（“缓存里的内容也会过期”）。
5. **小结**：一句话或三个关键词。

## 先定关系，再选画面

写每个镜头时，先在 `intent` 里写清这一镜要让观众看懂的关系，再从下表选画面形式：

| 要表达的关系 | 画面形式 | 场景 |
|---|---|---|
| 片头、结尾 | 标题卡 | `TitleCard` |
| 全片结构 | 目录（缺省列出全部章节） | `Agenda` |
| 进入新的一部分 | 章节页（大号序号 + 章节标题） | `Section` |
| 抛出问题、要记住的结论 | 一句大字，关键词随口播变色 | `Statement` |
| 并列的几点 | 要点逐条出现 | `BulletList` |
| 并列的几类、几个方面 | 卡片网格 | `CardGrid` |
| 先后、因果、流程 | 步骤框 + 箭头 | `FlowSteps` |
| 两者差异 | 左右对比 + 结论条 | `Compare` |
| 一个概念是什么 | 术语 → 释义 → 例子 | `Definition` |
| 一个关键数字（必须有出处） | 大数字计数 | `BigNumber` |
| 几个关键数字（必须有出处） | 数据卡片 | `StatGrid` |
| 多少、大小的比较（必须有出处） | 柱状图 | `BarChart` |
| 随时间的变化 | 时间线 | `EventLine` |
| 配图讲解 | 一侧图片、一侧文字 | `ImageText` |
| 图中的局部 | 图片推近 + 标注 | `ImageFocus` |
| 一段代码 | 代码高亮随口播移动 + 说明卡 | `CodeSnippet` |
| 原话 | 引用 | `Quote` |

所有场景都按版面几何算位置和字号（references/design.md）：换画幅、换风格不用改分镜；文字太多放不下时版面检测会指出是哪个镜头的哪一块，按提示删减文字或拆镜头。

没有合适的就在项目 `src/scenes/` 里写新场景（见 references/scenes.md）。同一种新画面在两个以上视频里用到，就值得提炼成类型包组件。

## 数字与事实

- 素材里没有的数字不许编。`BigNumber` / `BarChart` 的 `source` 必填，画面上会显示“来源：…”。
- 没有出处的数字，改成定性的说法（“慢很多”“多了一个数量级”也要有依据），或者删掉。
- 引用（`Quote`）必须是原话，`by` / `source` 写清出处。

## 场景参数

所有“逐个出现”的元素都一样：第 k 项在 `at[k]` 提示点出现；没给 `at` 就在镜头第 k 句开始念时出现。文字长度建议：标题 ≤ 16 字，要点 / 卡片说明 ≤ 30 字，Statement ≤ 40 字——更长也能排下，但字号会变小。

| 场景 | 参数 |
|---|---|
| `TitleCard` | 正片第一镜。`title` 写主题名。`subtitle` 写一句具体要看什么。`kicker` 只放短词。不画页眉和页码 |
| `ImageText` | 逻辑图用这个放 diagram-compiler 导出的 PNG。`file` 相对 public/。`title` 和 `points` 写判断句。深色视频导出用 `--theme midnight`，浅色用 `--theme default` |
| `Agenda` | `title`（缺省“目录”）、`items`（缺省为全片章节）、`highlight`：高亮第几项（从 1 开始）、`columns`：1 / 2 |
| `Section` | `title`（必填）、`subtitle`、`number`（缺省按章节顺序自动编号 01、02…）、`label`（缺省 CHAPTER 01） |
| `Statement` | `text`（必填）、`emphasis`：要变色的词数组、`at`：变色的提示点、`align`、`kicker` |
| `BulletList` | `items`（必填）、`title`、`at`、`numbered`、`columns`：1 / 2（缺省自动：横屏 6 项以上或一栏放不下时分两栏） |
| `CardGrid` | `cards`：`[{title, text?, tag?}]`（必填，2–8 张）、`title`、`at`、`columns`（最多几列）、`numbered`（缺省显示序号，`tag` 替换序号） |
| `FlowSteps` | `steps`：`[{label, detail?}]`（必填）、`title`、`at`、`direction`：auto / row / column / grid（auto 按放不放得下自动选） |
| `Compare` | `left` / `right`：`{title, points[]}`（必填）、`title`、`at`（第 k 行两边一起出现）、`verdict`：结论条、`verdictAt` |
| `Definition` | `term`、`definition`（必填）、`alias`（英文名等）、`example`、`label`（缺省“术语”）、`at`：术语 / 释义 / 例子依次出现的提示点 |
| `BigNumber` | `value`、`label`、`source`（必填）、`decimals`、`prefix`、`suffix`、`group`（千分位，缺省 ≥ 10000 时开）、`at`：开始计数的提示点 |
| `StatGrid` | `stats`：`[{value, label, prefix?, suffix?, decimals?, group?}]`、`source`（必填）、`title`、`at` |
| `BarChart` | `data`：`[{label, value}]`、`source`（必填）、`title`、`unit`、`decimals`、`highlight`：高亮哪一项的 label、`at` |
| `EventLine` | `events`：`[{date, label}]`（必填）、`title`、`at`、`direction`：auto / row / column |
| `ImageText` | `file`（相对 public/，必填）、`title`、`kicker`、`text`：段落、`points`：要点（逐条出现）、`side`：图片在 left / right（竖屏为上 / 下）、`fit`：cover / contain、`caption`：图注、`at` |
| `ImageFocus` | `file`（必填）、`fit`（缺省 contain）、`frame`：card（缺省，放在内容区的圆角框里）/ bleed（铺满画布）、`focus`：`[{x, y, w, h, at?, label?}]`（相对图片本身的 0–1 坐标，依次推近） |
| `CodeSnippet` | `code`、`lang`（必填）、`title`、`codeTitle`、`highlights`：`[{lines: [行号], at?, note?}]`（note 显示在说明卡里）、`dimInactive` |
| `Quote` | `text`（必填）、`by`、`source` |

## 示例

`examples/storyboard.example.json`：一分钟讲清“缓存”，7 个镜头，按现象 → 原理 → 术语 → 对比 → 反例 → 小结展开。
