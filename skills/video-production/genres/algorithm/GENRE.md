# 算法讲解（algorithm）

适用：算法、数据结构、逐行讲代码（排序、查找、图、树、动态规划、双指针、栈与队列……）。

核心做法：把算法用 TypeScript 真实跑一遍，每一步记录“执行到展示代码的第几行 + 此刻的数据结构和变量”（trace）。代码面板按这份记录高亮当前行，可视化面板按同一份记录画图，口播句子绑定到其中的若干步。三者读的是同一份数据，所以不会对不上，图也不会画错。

通用镜头（片头、要点、对比、定义）用 concept-explainer 的场景，每个项目都装了。

## 讲解结构

按“建构”的顺序展开，观众先有具体经验，再拿到抽象概念：

1. **问题（现象）**：一个观众能手算的小例子，先问“你会怎么做”。不要一上来给定义或复杂度。
2. **直觉**：一句话核心想法，最好有生活类比（Statement / FlowSteps）。
3. **逐行走代码**：在小例子上跑一遍（AlgoScene）。每句口播先说“这一步在做什么”，再说“为什么”。
4. **术语后置**：观众看到了现象再命名（“这段一直有序的前缀，叫已排序区”），用 Definition。
5. **为什么对**：关键不变式或性质，一句话讲清。
6. **代价**：复杂度从 trace 里真实发生的比较/移动次数说起，再推广到 n；不凭空报数字。
7. **反例与边界**：什么时候不适用、会出错（Compare / BulletList）。
8. **小结**：压成三个动作或一句话（Statement）。

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

- `t.step(行号 | [行号…], { viz?, vars?, note? })`：行号从 1 开始，指向 code 文件。
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
| `codeFontSize` | 代码字号（短边 1080 基准） |
| `dimInactive` | 压暗非当前行 |
| `annotate` | 行尾显示变量值：`{"变量名": 行号}` |

步骤推进完全由 storyboard 决定：镜头里句子的 `steps` 与提示点的 `step`。镜头开始前、第一步之前显示该镜头的第一步。

### CodeBuild

代码逐步写出来：`versions` 是依次出现的代码版本，版本之间没变的 token 平移、删掉的淡出、新增的淡入。

| 参数 | 说明 |
|---|---|
| `versions` | 代码版本数组（至少 1 个） |
| `lang` | 语言（typescript / python / java / cpp / go / rust …，不认识的按纯文本） |
| `at` | 第 2、3…个版本出现的提示点 id；不给就在第 2、3…句开始时出现 |
| `title` / `codeTitle` / `fontSize` | 标题、文件名、字号 |

## 示例

- `examples/storyboard.example.json`：插入排序，约 80 秒，6 个镜头，演示 steps 与提示点绑定、同画面硬切续讲、复杂度要点、结论大字。
- `examples/algo/insertion-sort/`：展示代码 `code.py` 与 trace `trace.ts`（54 步）。

复制到项目：`cp -r <技能目录>/genres/algorithm/examples/algo/insertion-sort <项目>/src/algo/`。
