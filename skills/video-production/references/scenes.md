# 写场景（Remotion / React）

场景是一个 React 组件，按帧号画出这一镜在任意时刻的样子。Remotion 逐帧截图再编码，所以**同一帧永远画出同一张图**，机器快慢不影响结果。版面怎么算、检测查什么见 references/design.md。

## 放在哪、怎么登记

- 项目自己的场景：`src/scenes/<Name>.tsx`，在 `src/scenes/index.ts` 里 import 并加进 `scenes`。
- 类型包的场景：`src/genres/<类型>/`，由 `vp.py genre add` 安装、自动登记。项目里的类型包是副本，可以按项目需要修改。
- storyboard 里用 `"source": {"type": "scene", "component": "<Name>", "props": {…}}` 引用。

```tsx
import React from 'react';
import { Box, bodyStyle, SceneTitle, Slide, stackV, TextBlock, useRevealFrames, useRevealProgress, useSlide, useTextFitGroup, useTitleLayout } from '../engine';
import type { SceneProps } from '../engine';

type Props = { title: string; items: string[]; at?: string[] };

const Body: React.FC<{ props: Props }> = ({ props }) => {
  const { frame, theme, unit } = useSlide();            // 版面几何、风格、单位（短边 / 1080 × 画幅放大系数）
  const t = useTitleLayout(props.title);                 // 标题自动字号，返回标题矩形与剩下的正文区 t.body
  const rows = stackV(t.body, props.items.map(() => 'fill' as const), frame.gutter * 0.5);
  const style = bodyStyle(theme);
  const fits = useTextFitGroup(                          // 几项用同一个字号，保证每项都放得下
    props.items.map((text, i) => ({ text, width: rows[i].w, height: rows[i].h, maxLines: 3 })),
    { style, max: theme.type.h3 * unit, min: theme.type.small * unit },
  );
  const frames = useRevealFrames(props.items.length, props.at);  // 第 k 项：at[k] 提示点 → 第 k 句开始
  const progress = useRevealProgress(frames);
  const [pt] = useRevealProgress([0]);
  return (
    <>
      <SceneTitle layout={t} text={props.title} reveal={pt} />
      {props.items.map((text, i) => (
        <Box key={i} rect={rows[i]} name={`item-${i + 1}`} reveal={progress[i]}>
          <TextBlock fit={fits[i]} text={text} style={style} rect={{ x: 0, y: 0, w: rows[i].w, h: fits[i].height }} color={theme.colors.text} />
        </Box>
      ))}
    </>
  );
};

export const MyScene: React.FC<SceneProps<Props>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
```

## 硬规则

1. **所有动画由帧号计算。** 用 `useCurrentFrame()`、`useProgressFrom()`、`useRevealProgress()`、`interpolate()`；不用 CSS `transition` / `animation`、`setTimeout`、`requestAnimationFrame`——逐帧渲染时它们不会按时间走。
2. **不引入随机和时钟。** 不用 `Math.random()`、`Date.now()`；需要随机用 Remotion 的 `random(seed)`。
3. **时刻从镜头上下文取，不按秒数写死。** 用 `useCueFrame` / `useRevealFrames` / `useSentences` / `useStepIndex`，口播时长变了画面会自动跟上。
4. **最外层是 `<Slide>`。** Slide 画不透明的主题背景与装饰（转场时新画面盖住旧画面，不会透出底色闪一下）和页眉；`chrome={false}` 不要页眉（封面、章节页），`transparent` 不画背景。
5. **位置全部算出来。** 从 `frame.content` 切矩形，内容放进 `Box` / `Card`；不用 margin、flex 的自然流动去决定位置，不用 `translate(-50%)` 之类居中技巧（检测按布局位置量）。要全出血素材用 `<Box bleed>`。
6. **文字先测量再画。** 字号用 `useTextFit` / `useTextFitGroup` 算，画用 `TextBlock`；给 `min` 设一个看得清的下限，放不下交给版面检测报出来，不要自己再缩。
7. **逐个出现的元素从第一帧就占位。** 入场用 `Box` 的 `reveal`（和 `motion`），不要用“没出现就不渲染”让后面的内容上移。
8. **尺寸用主题和单位。** 字号 `theme.type.*`、间距 `frame.gutter`、`theme.space`，乘 `useSlide().unit`；横屏、竖屏、4K 下比例一致，竖屏自动放大 1.2 倍。
9. **字体随风格。** 用 `headingStyle(theme)` / `bodyStyle(theme)` / `monoStyle(theme)`，不写死字体名；字体由风格的 npm 字体包提供，所有场景都在字体加载完之后才渲染（测量才准）。
10. **素材放 `public/`**，用 `staticFile('clips/a.mp4')` 引用；不从网络加载任何东西。
11. **不在场景里画字幕、章节条、水印。** 这些由引擎统一叠加，版面几何已经给它们留好位置。
12. **写完跑 `VP stills` 或 `VP layout`**，版面检测通过才算完成。

## 引擎 API（`import { … } from '../engine'`）

### 页面与版面

| 名称 | 用途 |
|---|---|
| `Slide` | 页面底板：背景、装饰、页眉；`chrome`、`decor`、`sectionNumber`、`transparent` |
| `useSlide()` | `{ frame, theme, unit }`：`frame.content` 内容区、`frame.gutter` 间距、`frame.aspect` 画幅、`frame.typeScale` 等 |
| `Box` | 版面槽位：`rect`、`name`（报告里的名字）、`reveal`（入场进度）、`motion`（up / down / left / right / pop / fade）、`bleed`、`overlay` |
| `Card` | 带风格外观的槽位（flat / outline / elevated / glass / filled）；`padding`、`accent`（描边高亮） |
| `cardPadding(theme, unit)` | 卡片内边距 |
| `useTitleLayout(text, area?, opts?)` / `SceneTitle` | 区域顶部的标题（自动字号、最多两行、行长平衡、风格的标题装饰），返回 `titleRect` 与剩下的 `body` |
| `stackV(r, sizes, gap)` | 纵向切分：数字是固定高度，`'fill'` 平分剩余 |
| `splitH(r, ratios, gap)` / `splitV(r, ratios, gap)` | 按比例横向 / 纵向切分 |
| `gridCells(r, n, gap, aspect?, maxCols?)` | 自动选行列数排 n 个格子（最后一行居中） |
| `gridLayout(r, n, cols, gap)` | 固定列数排格子 |
| `reserve(r, h, gap, side?)` | 从底部（或顶部）切出一条，返回 `[剩余, 切出的]` |
| `place(r, w, h, ax?, ay?)` / `inset(r, d)` / `cols(frame, r, start, span)` | 在矩形里放一块 / 内缩 / 按栅格取列 |

### 文字

| 名称 | 用途 |
|---|---|
| `headingStyle(theme)` / `bodyStyle(theme, weight?)` / `monoStyle(theme)` | 风格的标题 / 正文 / 等宽文字样式 |
| `useTextFit({ text, width, height, style, max, min, maxLines?, balance? })` | 能放进盒子的最大字号与断行结果 |
| `useTextFitGroup(items, { style, max, min })` | 一组文字用同一个字号 |
| `TextBlock` | 按测量结果逐行画文字；`align`、`valign`、`emphasis`（强调词变色） |
| `FitText` | `useTextFit` + `TextBlock` 的简写 |
| `textWidth(text, fontSize, style)` | 测一段文字的宽度 |
| `Label` | 小号大写标签（kicker、分类名） |

### 部件

| 名称 | 用途 |
|---|---|
| `NumberBadge` | 序号徽标（01、02…），`active` / `muted` |
| `Bullet` / `Arrow` / `Rule` | 列表圆点 / 箭头 / 强调短线（装饰层，不参与检测） |
| `SourceNote` / `sourceNoteHeight` | 数据来源注记（放在 `reserve` 出来的底部矩形里） |
| `NumberText` / `fitNumberSize` | 大数字：数字位等宽（计数动画时不左右晃）、单位自动缩小 |
| `useImageSize(src)` / `fittedRect(box, img, fit)` | 图片原始尺寸 / 按 contain、cover 放进框后的实际位置 |
| `CodePanel` | 语法着色代码 + 当前行高亮 + 行尾注释；给 `width`、`height` 自动算字号，放不下就滚动 |
| `fitCodeFontSize` / `codePanelHeight` | 代码能放进盒子的字号 / 某字号下刚好放下全部代码的高度 |
| `CodeMorph` | 代码版本之间的变形动画（按帧确定） |

### 时间

| 名称 | 用途 |
|---|---|
| `useShot()` | 当前镜头数据：`id`、`chapter`、`durationInFrames`、`sentences`、`cues`、`steps` |
| `useCueFrame(id, fallback?)` | 提示点帧号（相对镜头起点） |
| `useCueProgress(id, sec?)` / `useProgressFrom(frame, sec?)` | 从提示点 / 某帧开始的 0→1 进度（主题缓动） |
| `useRevealFrames(n, cueIds?)` | 第 k 项出现的帧：`cueIds[k]` 提示点 → 第 k 句开始 → 均匀分布 |
| `useRevealProgress(frames, sec?)` / `useCurrentIndex(frames)` | 每项的入场进度 / 已经出现到第几项 |
| `useSentences()` / `useActiveSentenceIndex()` | 本镜句子（含每个词的帧号）/ 当前正在念第几句 |
| `useWordFrame(sentenceId, text)` | 句中某段文字开始念的帧 |
| `useStepIndex()` | 当前算法步骤号（按 storyboard 的 steps） |
| `mixColor(a, b, p)` / `withAlpha(hex, a)` | 颜色过渡 / 透明度 |
| `getTrace(id)` | 读取算法 trace |

旧写法 `Stage`（Slide + 一个铺满内容区的 flex 槽位）仍可用，适合快速试验；正式场景按上面的方式算矩形。

## 转场与镜头衔接

- 转场在 storyboard 里按镜头设置；场景本身只管自己的入场动画。
- 同一个画面分成两个镜头续讲时，后一镜用 `cut`，避免同画面淡入。
- 镜头内的变化（逐条出现、高亮移动）比频繁切镜头更容易看懂。

## 调试

- `VP studio` 打开 Remotion Studio，拖动时间轴逐帧看。
- `VP stills` 每个镜头一张静帧，并做版面检测；`VP layout` 检测每个镜头的中点和最后一帧。
- 场景组件名写错、提示点不存在、trace 不存在，渲染时会直接报错并列出可用项。
