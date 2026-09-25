# 算法讲解（algorithm）

适用：算法、数据结构、逐行讲代码（排序、查找、图、树、动态规划、双指针、栈与队列……）。

核心做法：把算法用 TypeScript 真实跑一遍，每一步记录“执行到展示代码的哪些行 + 此刻的数据结构和变量”（trace）。展示代码必须格式化：一条语句一行，`if` / `for` 的花括号展开，不要把条件和赋值挤在同一行。一步逻辑跨多行时，`t.step` 传行号数组，代码面板高亮整段。可视化面板按同一份记录画图，口播句子绑定到其中的若干步。三者读的是同一份数据，所以不会对不上，图也不会画错。

通用镜头（片头、要点、对比、定义）用 concept-explainer 的场景，每个项目都装了。

## 讲解结构

按“建构”的顺序展开，观众先有具体经验，再拿到抽象概念：

**图形负责关系，结论写在画面上。** 每个镜头先决定用哪几个几何元素。正常成片必须有一行能读的结论（场景 `title`，或 trace 的 `note`），口播把这句展开，不能只存在于配音里。Mute Test（`VP build --textless && VP stills`）只用来检查图形骨架还在不在，不是把这句结论从正片里拿掉。数值、代码、变量留在画面上。只画文字、没有图形的场景（BulletList / Statement / Definition / Compare）不能单独承担“解释为什么”。

**正片第一镜是标题页**（`TitleCard`）：标题写这支片子的主题，口播把主题说出来，然后再进入下面的例子。不要用“今天只做一件事”这类句子代替标题页。

1. **问题（现象）**：一个观众能手算的小例子，先问“你会怎么做”。这一镜接在标题页后面，不要一上来给定义、复杂度，也不要默认铺一张路线图（ArrayBoard 或同类图形）。
2. **直觉**：核心想法画出图形或生活类比。生活类比一定要画出来，不要只在口播里说。`Roadmap` 只在关系是「整条路径」时用，步数按内容定，不规定三步。
3. **逐行走代码**：在小例子上跑一遍（AlgoScene）。展示代码按语句换行。一步逻辑跨多行时 `t.step` 传行号数组，高亮整段。走进代码之前，用 diagram-compiler 导出一张 flowchart，再用 `ImageText` 把图和判断句放在一起。
4. **术语后置**：观众看到了现象再命名（“这个保证，叫做不变量”）；命名时让图形元素本身承担指代（ArrayBoard 的区间括号）。
5. **为什么对**：关键不变式或性质，用图形表示“它一直没破”（ArrayBoard / RangeLadder）。
6. **代价**：复杂度从 trace 里真实发生的比较/移动次数说起，再推广到 n；用曲线而不是数字列表（GrowthCurves）；不凭空报数字。
7. **反例与边界**：把错误写法也画出来——区间不缩小、漏掉一个元素，都要能看见（ArrayBoard 的 stuck / 单格区间）。
8. **小结**：写出这片的结论，换一种画面。不要把开场的 `Roadmap` 再亮一遍。

## 图形优先（硬要求）

- **判断句留在画面上**：每个逻辑镜头除了图形，还要有 1 到 3 条短句写在 `title`、`points` 或 trace 的 `note` 上，和口播是同一件事。底部字幕会换走，不算这几条。正片不要把这几条关掉。
- **Mute Test**：`VP build --textless && VP stills`，遮住说明文字后图形骨架还在。这是检查，不是正片的样子。
- **数值与代码留在画面上**：数组里的数、变量、代码行保留。
- **不要用只画文字的场景**（BulletList / Statement / Definition / Compare）单独承担“解释为什么”。

60 秒左右的短视频可以只保留 1、3、6、8。

## 分镜套路

- 一个 AlgoScene 镜头覆盖一段连续步骤；同一画面继续推进时，下一镜用 `"transition": {"type": "cut"}`，避免同一画面做淡入闪一下。
- 句子的 `steps` 首尾相接：上一句止于 k，下一句从 k+1 开始。跳过的步骤观众看不到。
- 关键时刻用提示点精确对齐：`{"id": "cmp", "at": "5 比 2 大", "step": 4}` 表示念到“5 比 2 大”时切到第 4 步；同一句里其余步骤在提示点之间按步号均匀插值。
- 一句覆盖太多步（超过 6 步左右）画面会像快进。要么拆句，要么只细讲有代表性的一轮，其余轮次明说“后面几个数同理”，再快速带过（示例里的 walk-2）。
- 竖屏（portrait-*）自动改成上代码下图形；代码超过 14 行左右时，考虑只展示核心函数，或用 CodeSnippet 聚焦片段。
- 变量值最好直接写在代码行尾：`"annotate": {"key": 3, "j": 4}`（变量名 → 展示代码行号）。

## trace 怎么写

目录：`src/algo/<id>/code.<扩展名>`（展示给观众的代码，任何语言都行）+ `src/algo/<id>/trace.ts`（它的 TypeScript 镜像实现）。

```ts
import type { MarkName } from '../../engine/types';
import { defineTrace } from '../../genres/algorithm/tracer';

export default defineTrace((t) => {
  const a = [5, 2, 4];
  t.step(1, { viz: { a: t.array(a) }, vars: { n: a.length }, note: '输入 3 个数' });
  // …在展示代码对应的位置调用 t.step(行号, …)
});
```

- `t.step(行号 | [行号…], { viz?, vars?, note? })`：行号从 1 开始，指向 code 文件。一步里的判断和赋值跨了多行，就传 `[起, 止]`，面板会把这一段都高亮。`note` 写这一步的判断，正片上要能读到。
- `viz` 按键合并：只传变化了的结构，其余沿用上一步。`vars` 传了就整体替换，不传就沿用。`note` 是这一步的说明，画面上一直显示最近一条。
- 每一步都会深拷贝，之后再改原数组不影响已记录的步骤；`Infinity` 记成 `"∞"`。
- 构造可视化状态：`t.array(values, {marks, pointers, ids, bars, label})`、`t.grid(rows, {marks, rowLabels, colLabels})`、`t.graph(nodes, edges, {directed, marks: {nodes, edges}, badges})`、`t.tree(root)` / `t.binaryTree(root, {id, label, left, right})`、`t.stack(items)`、`t.queue(items)`、`t.marks([[下标, 标记]…])`。
- **镜像必须一致**：trace.ts 的分支和循环顺序要与展示代码一致，每个 `t.step` 的行号就是展示代码此刻正在执行的那一行。循环条件判为假退出时也要记一步（示例在 while 退出后记了第 5 行）。
- 输入规模让观众跟得上：数组 5–8 个元素，图 5–7 个节点；总步数控制在 200 以内（上限 5000）。
- 写完运行 `vp.py trace`，按打印出的步数和 note 检查，再写 storyboard 的 `steps`。

标记（marks）的语义与颜色由风格统一定义：

| 标记 | 含义 |
|---|---|
| `active` | 正在处理的元素 |
| `compare` | 正在比较 |
| `swap` | 交换、移动、被修改 |
| `found` | 命中、放到位 |
| `done` | 已确定、已完成 |
| `visited` | 访问过 |
| `path` | 结果路径 |
| `muted` | 暂不相关（压暗） |

可视化状态：

| type | 画法 | 常用字段 |
|---|---|---|
| `array` | 一排格子；`bars: true` 画成柱状 | `values`、`marks{下标: 标记}`、`pointers{名字: 下标}`、`ids`（给了就能做交换位移动画）|
| `grid` | 二维表（DP 表、矩阵、棋盘） | `rows`、`marks{"行,列": 标记}`、`rowLabels`、`colLabels` |
| `graph` | 节点 + 边；节点给 `x/y`（0–1）按给定位置，否则排成一圈 | `nodes`、`edges{from,to,weight}`、`directed`、`marks{nodes, edges}`（边键 `a->b` 或无向 `a-b`）、`badges`（节点旁小字，如距离）|
| `tree` | 分层树；二叉树空孩子占位，左右不会错 | `root{id,label,children}`、`marks`、`badges` |
| `stack` / `queue` | 栈竖排（顶在上）/ 队列横排（队首在左） | `items`、`marks` |

## 场景

### AlgoScene

| 参数 | 说明 |
|---|---|
| `trace` | 必填，`src/algo/<id>` 的 id |
| `title` | 左上标题 |
| `layout` | `auto`（横屏左右、竖屏上下）/ `code-left` / `code-right` / `code-top` / `code-only` / `viz-only` |
| `viz` | 显示哪些结构（viz 的键），从上到下；缺省显示全部 |
| `vars` | `true` 显示全部变量 / 字符串数组只显示这些 / `false` 不显示 |
| `note` | 是否显示步骤说明，默认 true |
| `codeTitle` | 代码面板顶部文件名，如 `insertion_sort.py` |
| `codeFontSize` | 代码最大字号（短边 1080 基准）；实际字号按面板宽高自动缩到最长一行（含行尾注释的最长取值）放得下 |
| `dimInactive` | 压暗非当前行 |
| `annotate` | 行尾显示变量值：`{"变量名": 行号}` |

步骤推进完全由 storyboard 决定：镜头里句子的 `steps` 与提示点的 `step`。镜头开始前、第一步之前显示该镜头的第一步。

版面：代码面板、数据结构、变量面板、说明条各占一块算好的矩形；变量面板与说明条的高度取整个 trace 里最大的一步，切步骤时版面不跳。

### CodeBuild

代码逐步写出来：`versions` 是依次出现的代码版本，版本之间没变的 token 平移、删掉的淡出、新增的淡入。

| 参数 | 说明 |
|---|---|
| `versions` | 代码版本数组（至少 1 个） |
| `lang` | 语言（typescript / python / java / cpp / go / rust …，不认识的按纯文本） |
| `at` | 第 2、3…个版本出现的提示点 id；不给就在第 2、3…句开始时出现 |
| `title` / `codeTitle` / `fontSize` | 标题、文件名、最大字号（实际按所有版本里最宽最长的一版自动算） |

### 图形优先的概念场景

这些场景不读 trace，按 props 直接画图，用来讲“为什么”和“代价”。

#### Roadmap

把全片步骤画成 N 个矢量图标块，只在关系是整条路径时用一次。不规定步数，结尾不要再把这张图亮一遍。

| 参数 | 说明 |
|---|---|
| `steps` | `[{glyph, label}]`；`glyph` 取 `scan` / `halve` / `check` / `target` / `search` / `hash` / `sort` / `done` |
| `at` | 第 k 块出现的提示点 id；不给就按句子均分 |
| `active` | 指定当前亮到第几块（从 0 计）。不要为了小结把全部点亮再放一遍 |
| `title` | 标题（无文字模式下不画） |

#### ArrayBoard

一格一格画数组，用“可能区间”的收缩讲二分/双指针这类不变量。范围外的格子自动压暗；`stuck` 画红色循环箭头表示区间不再收缩。

| 参数 | 说明 |
|---|---|
| `values` | 数组内容（数字） |
| `target` | 目标值，画在左上角 |
| `frames` | `[{lo, hi, mid?, verdict?, at?}]`；第 k 帧在提示点 `at` 出现，帧之间区间会连续收缩 |
| `verdict` | `lt`（a[mid] < target，往右）/ `gt`（往左）/ `eq`（命中） |
| `stuck` | 死循环演示：区间宽度不变 + 红色循环箭头 |
| `question` | 画一个大问号（提问题用） |
| `answer` | 指定的下标画成“已找到” |

#### GuessRange

生活类比轴：一条 `min..max` 的刻度轴，每次猜测画一根探针 + 落点 + 方向箭头，区间括号随之收缩，并显示“范围里还剩几个数”。用来把“每猜一次少一半”画出来。

| 参数 | 说明 |
|---|---|
| `min` / `max` | 轴的范围（如 1 / 100） |
| `steps` | `[{value, verdict, at?}]`；`verdict` 取 `low`（小了→往上）/ `high`（大了→往下）/ `eq`（命中） |

#### GrowthCurves

代价曲线：把“最多要看多少次”画成两条曲线（线性 vs 对数），游标随扫描推进，两个数字实时跟着走。只有曲线、刻度与数字，没有文字也看得懂。

| 参数 | 说明 |
|---|---|
| `maxN` | 横轴右端（建议 32–128） |
| `curves` | `[{fn, color?}]`；`fn` 取 `n`（线性）或 `logn`（`log2(n)+1`），`color` 取 `accent` / `accent2` |
| `at` | 开始扫描的提示点 id |

#### RangeLadder

区间阶梯：每一步“还要看的数量”画成一根横条，长度逐级减半，右端标出剩余数量。这是 O(log n) 的直觉来源。

| 参数 | 说明 |
|---|---|
| `bars` | `[{n, label?, at?}]`；横条长度按第一根的 `n` 归一 |
| `title` | 标题（无文字模式下不画） |

#### BucketMap

一排哈希桶：桶顶是前缀和，桶里是这个和出现过的次数。`need` 命中哪个桶，就从里面拿走次数，用来看“为什么一个数能加上好几个答案”。

| 参数 | 说明 |
|---|---|
| `frames` | `[{buckets, need?, hit?, gained?, at?}]`；`buckets` 为 `[{key, count}]` |
| `title` | 标题（无文字模式下不画） |

#### Odometer

里程表：后面的读数减去前面的读数等于这一段路的长度。用来锚定“前缀和相减得到子数组和”。

| 参数 | 说明 |
|---|---|
| `a` / `b` | 两个读数 |
| `max` | 轴的右端，缺省取较大的读数 |
| `at` | 三个揭示点：先出现第一个窗，再出现第二个，最后出现差值 |
| `title` | 标题（无文字模式下不画） |

#### PrefixBridge

上面是 `nums`，下面是 `prefix`，`prefix[t]` 对齐在相邻两格的缝上。两根落线从 `prefix[i]`、`prefix[j]` 垂到括号，括号上的差值就是 `nums[i..j-1]`。

| 参数 | 说明 |
|---|---|
| `values` | 原数组 |
| `k` | 目标和，可选 |
| `frames` | `[{i, j, mode?, at?}]`；`mode` 取 `build`（正在累加前缀）或 `diff`（取差值，默认） |
| `title` | 标题（无文字模式下不画） |

#### WindowSweep

两行同步扫描，各自一条和值。上排全是正数，窗口变长和只增不减；下排有负数，和会掉下去。用来说明滑动窗口在有负数时为什么失效。

| 参数 | 说明 |
|---|---|
| `rows` | `[{values, tone}]`；`tone` 取 `good` / `bad` |
| `k` | 目标和，可选 |
| `at` | 开始扫描的提示点 |
| `progress` | 0–1，指定扫到哪；不给就按句子推进 |
| `title` | 标题（无文字模式下不画） |

## 示例

- `examples/storyboard.example.json`：插入排序，约 80 秒，6 个镜头，演示 steps 与提示点绑定、同画面硬切续讲、复杂度要点、结论大字。
- `examples/algo/insertion-sort/`：展示代码 `code.py` 与 trace `trace.ts`（54 步）。

复制到项目：`cp -r <技能目录>/genres/algorithm/examples/algo/insertion-sort <项目>/src/algo/`。
