// 算法讲解主场景：左边（竖屏在上）代码逐行高亮，右边（竖屏在下）数据结构随同一份 trace 变化，
// 下方变量面板与步骤说明。步骤推进由 storyboard 里句子的 steps / 提示点的 step 决定，和口播同步。
import React from 'react';
import { CodePanel, fontStack, Stage, useContentBox, useTheme, useUnit, useVideoConfig } from './deps';
import type { SceneProps } from '../../engine';
import { useTrace } from './useTrace';
import { VarsPanel } from './VarsPanel';
import { VizPanel } from './VizPanel';
import type { VizState } from './viz-types';

export type AlgoSceneProps = {
  /** src/algo/<id> 的 id */
  trace: string;
  title?: string;
  layout?: 'auto' | 'code-left' | 'code-right' | 'code-top' | 'code-only' | 'viz-only';
  /** 显示哪些数据结构（trace 里 viz 的键），按顺序从上到下；缺省显示当前步骤的全部 */
  viz?: string[];
  /** 变量面板：true 全部、数组只显示这些、false 不显示 */
  vars?: boolean | string[];
  /** 显示步骤说明（trace 里 t.step 的 note） */
  note?: boolean;
  /** 代码面板顶部的文件名 */
  codeTitle?: string;
  codeFontSize?: number;
  /** 压暗非当前行 */
  dimInactive?: boolean;
  /** 在代码行尾显示变量当前值：变量名 → 行号 */
  annotate?: Record<string, number>;
};

export const AlgoScene: React.FC<SceneProps<AlgoSceneProps>> = ({ props }) => {
  const theme = useTheme();
  const unit = useUnit();
  const { width, height } = useVideoConfig();
  const tv = useTrace(props.trace);
  const box = useContentBox(72);

  const layout = props.layout && props.layout !== 'auto' ? props.layout : width >= height ? 'code-left' : 'code-top';
  const gap = theme.space * unit;
  const titleH = props.title ? theme.type.h3 * unit * 1.6 : 0;
  const hasNotes = props.note !== false && tv.trace.steps.some((s) => s.note);
  const noteH = hasNotes ? theme.type.body * unit * 1.9 : 0;
  const showVars = props.vars !== false && tv.trace.steps.some((s) => s.vars && Object.keys(s.vars).length > 0);
  const varsH = showVars ? theme.type.small * unit * 2.8 : 0;
  const availH = box.height - titleH;
  const extras = (noteH ? noteH + gap : 0) + (varsH ? varsH + gap : 0);

  let codeW = 0;
  let codeH = 0;
  let vizW = 0;
  let vizH = 0;
  let direction: 'row' | 'row-reverse' | 'column' = 'row';
  if (layout === 'code-left' || layout === 'code-right') {
    codeW = (box.width - gap) * 0.5;
    codeH = availH;
    vizW = box.width - gap - codeW;
    vizH = availH - extras;
    direction = layout === 'code-left' ? 'row' : 'row-reverse';
  } else if (layout === 'code-top') {
    codeW = box.width;
    codeH = (availH - extras - gap) * 0.45;
    vizW = box.width;
    vizH = availH - extras - gap - codeH;
    direction = 'column';
  } else if (layout === 'code-only') {
    codeW = box.width;
    codeH = availH - extras;
    direction = 'column';
  } else {
    vizW = box.width;
    vizH = availH - extras;
    direction = 'column';
  }

  const viz = (tv.step.viz ?? {}) as Record<string, VizState>;
  const prevViz = (tv.prev?.viz ?? {}) as Record<string, VizState>;
  const keys = (props.viz ?? Object.keys(viz)).filter((k) => k in viz);
  const each = keys.length ? (vizH - gap * (keys.length - 1)) / keys.length : 0;

  // 说明沿用最近一条：只在关键步骤写 note，中间步骤不会把说明清空（避免文字一闪一闪）
  let noteText = '';
  for (let k = tv.index; k >= 0; k--) {
    const n = tv.trace.steps[k].note;
    if (n) {
      noteText = n;
      break;
    }
  }

  const annotations: Record<number, string> = {};
  for (const [name, line] of Object.entries(props.annotate ?? {})) {
    const v = tv.step.vars?.[name];
    if (v !== undefined) {
      annotations[line] = `${name} = ${typeof v === 'string' ? v : JSON.stringify(v)}`;
    }
  }

  const code =
    layout === 'viz-only' ? null : (
      <CodePanel
        code={tv.trace.code}
        lang={tv.trace.lang}
        activeLines={tv.step.lines}
        prevActiveLines={tv.prev?.lines ?? null}
        progress={tv.progress}
        height={codeH}
        fontSize={props.codeFontSize}
        dimInactive={props.dimInactive}
        annotations={annotations}
        title={props.codeTitle}
        style={{ width: codeW, flex: 'none' }}
      />
    );

  const vizColumn =
    layout === 'code-only' ? null : (
      <div style={{ width: vizW, display: 'flex', flexDirection: 'column', gap, flex: 'none' }}>
        {keys.map((k) => (
          <VizPanel key={k} state={viz[k]} prev={prevViz[k] ?? null} progress={tv.progress} width={vizW} height={each} />
        ))}
      </div>
    );

  return (
    <Stage padding={72}>
      {props.title ? (
        <div style={{ height: titleH, fontFamily: fontStack(theme.fonts.heading), fontSize: theme.type.h3 * unit, fontWeight: 700, color: theme.colors.text }}>
          {props.title}
        </div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: direction, gap, height: availH }}>
        {code}
        <div style={{ display: 'flex', flexDirection: 'column', gap, flex: 1, minWidth: 0 }}>
          {vizColumn}
          {showVars ? (
            <VarsPanel
              vars={tv.step.vars}
              prevVars={tv.prev?.vars}
              progress={tv.progress}
              only={Array.isArray(props.vars) ? props.vars : undefined}
              style={{ minHeight: varsH, boxSizing: 'border-box' }}
            />
          ) : null}
          {hasNotes ? (
            <div
              style={{
                minHeight: noteH,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 20 * unit,
                borderLeft: `${6 * unit}px solid ${theme.colors.accent}`,
                fontSize: theme.type.body * unit,
                color: theme.colors.text,
              }}
            >
              {noteText}
            </div>
          ) : null}
        </div>
      </div>
    </Stage>
  );
};
