# 写场景（Remotion / React）

场景是一个 React 组件，按帧号画出这一镜在任意时刻的样子。Remotion 逐帧截图再编码，所以**同一帧永远画出同一张图**，机器快慢不影响结果。

## 放在哪、怎么登记

- 项目自己的场景：`src/scenes/<Name>.tsx`，在 `src/scenes/index.ts` 里 import 并加进 `scenes`。
- 类型包的场景：`src/genres/<类型>/`，由 `vp.py genre add` 安装、自动登记。项目里的类型包是副本，可以按项目需要修改。
- storyboard 里用 `"source": {"type": "scene", "component": "<Name>", "props": {…}}` 引用。

```tsx
import React from 'react';
import { fadeUp, fontStack, Stage, useCueFrame, useProgressFrom, useTheme, useUnit } from '../engine';
import type { SceneProps } from '../engine';

type Props = { title: string; highlight?: string };

export const MyScene: React.FC<SceneProps<Props>> = ({ props, shot }) => {
  const theme = useTheme();
  const unit = useUnit();                           // 短边 1080 为基准的像素单位
  const titleIn = useProgressFrom(0);               // 镜头开始后按主题动效淡入
  const hit = useCueFrame('hit', shot.durationInFrames); // 提示点帧号；缺省给个兜底
  const p = useProgressFrom(hit);
  return (
    <Stage>
      <div style={{ fontFamily: fontStack(theme.fonts.heading), fontSize: theme.type.h1 * unit, ...fadeUp(titleIn, 30 * unit) }}>
        {props.title}
      </div>
      <div style={{ color: theme.colors.accent, opacity: p }}>{props.highlight}</div>
    </Stage>
  );
};
```

## 硬规则

1. **所有动画由帧号计算。** 用 `useCurrentFrame()`、`useProgressFrom()`、`interpolate()`；不用 CSS `transition` / `animation`、`setTimeout`、`requestAnimationFrame`——逐帧渲染时它们不会按时间走。
2. **不引入随机和时钟。** 不用 `Math.random()`、`Date.now()`；需要随机用 Remotion 的 `random(seed)`。
3. **时刻从镜头上下文取，不按秒数写死。** 用 `useCueFrame` / `useRevealFrames` / `useSentences` / `useStepIndex`，口播时长变了画面会自动跟上。
4. **包在 `<Stage>` 里。** Stage 画不透明的主题背景（转场时新画面盖住旧画面，不会透出底色闪一下），内容区避开平台安全区和底部字幕。确实要全屏素材时用 `<Stage padding={0}>` 或 `transparent`，自己保证不透明。
5. **尺寸用主题和 `useUnit()`。** 字号用 `theme.type.*`，乘 `useUnit()`；同一组件在横屏、竖屏、4K 下比例一致。需要像素尺寸算布局时用 `useContentBox()`。
6. **中文字体。** macOS 自带 PingFang；Linux 渲染必须在 `video.config.json` 的 `fonts` 里声明字体文件（放在 `public/fonts/`），并把它的 family 放到风格字体列表前面，否则中文会变成方块或回退到难看的字体。
7. **素材放 `public/`**，用 `staticFile('clips/a.mp4')` 引用；不从网络加载任何东西。
8. **不在场景里画字幕。** 字幕由引擎统一叠加。

## 引擎 API（`import { … } from '../engine'`）

| 名称 | 用途 |
|---|---|
| `Stage` | 场景底板：主题背景 + 安全区 + 字幕占位；`padding`、`transparent`、`style` |
| `useTheme()` | 当前风格：`colors`、`fonts`、`type`、`radius`、`space`、`motion`、`code`、`viz` |
| `useUnit()` | 尺寸单位（短边像素 / 1080） |
| `useContentBox(padding)` | 内容区实际像素宽高（扣掉安全区、内边距、字幕占位） |
| `useSafeInsets()` | 平台安全区像素 |
| `useShot()` | 当前镜头数据：`id`、`durationInFrames`、`sentences`、`cues`、`steps` |
| `useCueFrame(id, fallback?)` | 提示点帧号（相对镜头起点） |
| `useCueProgress(id, sec?)` | 从提示点开始的 0→1 进度（主题缓动） |
| `useProgressFrom(frame, sec?)` | 从某帧开始的 0→1 进度 |
| `useRevealFrames(n, cueIds?)` | 第 k 项出现的帧：`cueIds[k]` 提示点 → 第 k 句开始 → 均匀分布 |
| `useSentences()` / `useActiveSentenceIndex()` | 本镜句子（含每个词的帧号）/ 当前正在念第几句 |
| `useWordFrame(sentenceId, text)` | 句中某段文字开始念的帧 |
| `useStepIndex()` | 当前算法步骤号（按 storyboard 的 steps） |
| `fadeUp(p, px)` / `popIn(p)` | 常用入场样式 |
| `lerp(frame, [a,b], [x,y])` | 夹紧两端的插值 |
| `mixColor(a, b, p)` / `withAlpha(hex, a)` | 颜色过渡 / 透明度 |
| `CodePanel` | 语法着色代码 + 当前行高亮（高亮框平滑移动、长代码自动滚动）+ 行尾注释 |
| `CodeMorph` | 代码版本之间的变形动画（按帧确定） |
| `getTrace(id)` | 读取算法 trace |

## 转场与镜头衔接

- 转场在 storyboard 里按镜头设置；场景本身只管自己的入场动画。
- 同一个画面分成两个镜头续讲时，后一镜用 `cut`，避免同画面淡入。
- 镜头内的变化（逐条出现、高亮移动）比频繁切镜头更容易看懂。

## 调试

- `VP studio` 打开 Remotion Studio，拖动时间轴逐帧看。
- `VP stills` 每个镜头一张静帧，快速检查布局。
- 场景组件名写错、提示点不存在、trace 不存在，渲染时会直接报错并列出可用项。
