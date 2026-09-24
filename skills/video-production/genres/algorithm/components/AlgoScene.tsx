// 算法讲解主场景：一侧（竖屏在上）代码逐行高亮，另一侧（竖屏在下）数据结构随同一份 trace 变化，
// 下方变量面板与步骤说明。步骤推进由 storyboard 里句子的 steps / 提示点的 step 决定，和口播同步。
// 所有区域按内容区算好矩形：代码面板自动字号，变量面板和说明条的高度取整个 trace 里最大的，切步骤时版面不跳。
import React from 'react';
import {
  Box,
  bodyStyle,
  CodePanel,
  codePanelHeight,
  fitCodeFontSize,
  SceneTitle,
  Slide,
  splitH,
  stackV,
  TextBlock,
  useRevealProgress,
  useSlide,
  useTextFitGroup,
  useTitleLayout,
  withAlpha,
} from './deps';
import type { Rect } from './deps';
import type { SceneProps } from '../../engine';
import { useTrace } from './useTrace';
import { VarsPanel, varsMetrics } from './VarsPanel';
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
  /** 代码最大字号（短边 1080 基准）；实际字号会自动缩到放得下 */
  codeFontSize?: number;
  /** 压暗非当前行 */
  dimInactive?: boolean;
  /** 在代码行尾显示变量当前值：变量名 → 行号 */
  annotate?: Record<string, number>;
};

const Body: React.FC<{ props: AlgoSceneProps }> = ({ props }) => {
  const { frame, theme, unit } = useSlide();
  const tv = useTrace(props.trace);
  const t = useTitleLayout(props.title, undefined, { max: theme.type.h3 * 1.1, maxLines: 1 });
  const body = t.body;
  const g = frame.gutter;
  const layout = props.layout && props.layout !== 'auto' ? props.layout : frame.aspect === 'portrait' ? 'code-top' : 'code-left';
  const steps = tv.trace.steps;
  const showCode = layout !== 'viz-only';
  const showViz = layout !== 'code-only';
  const hasNotes = props.note !== false && steps.some((s) => s.note);
  const only = Array.isArray(props.vars) ? props.vars : undefined;
  const showVars = props.vars !== false && steps.some((s) => s.vars && Object.keys(s.vars).length > 0);

  // 行尾注释：取整个 trace 里最长的一版参与字号计算，保证每一步都放得下
  const annotationsAt = (k: number): Record<number, string> => {
    const out: Record<number, string> = {};
    for (const [name, line] of Object.entries(props.annotate ?? {})) {
      const v = steps[k].vars?.[name];
      if (v !== undefined) {
        out[line] = `${name} = ${typeof v === 'string' ? v : JSON.stringify(v)}`;
      }
    }
    return out;
  };
  const widestAnn: Record<number, string> = {};
  steps.forEach((_, k) => {
    for (const [line, text] of Object.entries(annotationsAt(k))) {
      const n = Number(line);
      if (!widestAnn[n] || text.length > widestAnn[n].length) {
        widestAnn[n] = text;
      }
    }
  });

  // 区域划分
  const side = layout === 'code-left' || layout === 'code-right';
  const [c0, c1] = side ? splitH(body, [1, 1], g * 1.2) : [body, body];
  const codeCol = side ? (layout === 'code-left' ? c0 : c1) : body;
  const infoCol = side ? (layout === 'code-left' ? c1 : c0) : body;
  const vm = varsMetrics(
    steps.map((s) => s.vars),
    only,
    infoCol.w,
    theme,
    unit,
  );
  const varsH = showVars ? vm.height : 0;
  const bs = bodyStyle(theme);
  const noteBar = 6 * unit;
  const notePad = 18 * unit;
  const notes = hasNotes ? steps.map((s) => s.note ?? '') : [];
  const noteFits = useTextFitGroup(
    notes.map((text) => ({ text, width: infoCol.w - noteBar - 2 * notePad, height: body.h * 0.2, maxLines: 3 })),
    { style: bs, max: theme.type.body * unit, min: theme.type.small * unit * 0.85 },
  );
  const noteH = hasNotes ? Math.max(...noteFits.map((f) => f.height)) + 2 * notePad : 0;

  // CodePanel 的字号以短边 1080 为基准（frame.unit），竖屏的放大系数折进最大字号里
  const codeMax = props.codeFontSize ?? theme.type.code * frame.typeScale;
  const codeFs = (w: number, h: number) =>
    fitCodeFontSize({ code: tv.trace.code, lang: tv.trace.lang, theme, unit: frame.unit, width: w, height: h, max: codeMax, title: Boolean(props.codeTitle), annotations: widestAnn });
  const codeNatural = (w: number, h: number) => codePanelHeight({ code: tv.trace.code, fontSize: codeFs(w, h), unit: frame.unit, title: Boolean(props.codeTitle) });

  let codeRect: Rect | null = null;
  let vizRect: Rect | null = null;
  let varsRect: Rect | null = null;
  let noteRect: Rect | null = null;
  const extras = (h: number) => (h > 0 ? [h] : []);
  if (side) {
    codeRect = { ...codeCol, h: Math.min(codeCol.h, codeNatural(codeCol.w, codeCol.h)) };
    const parts = stackV(infoCol, ['fill', ...extras(varsH), ...extras(noteH)], g);
    vizRect = parts[0];
    varsRect = varsH ? parts[1] : null;
    noteRect = noteH ? parts[parts.length - 1] : null;
  } else {
    const rest = body.h - (varsH ? varsH + g : 0) - (noteH ? noteH + g : 0);
    const codeH = !showCode ? 0 : showViz ? Math.min(codeNatural(body.w, rest * 0.5), rest * 0.5) : Math.min(codeNatural(body.w, rest), rest);
    const sizes: Array<number | 'fill'> = [];
    if (showCode) {
      sizes.push(showViz ? codeH : 'fill');
    }
    if (showViz) {
      sizes.push('fill');
    }
    const parts = stackV(body, [...sizes, ...extras(varsH), ...extras(noteH)], g);
    let i = 0;
    if (showCode) {
      codeRect = parts[i++];
      if (!showViz) {
        codeRect = { ...codeRect, h: Math.min(codeRect.h, codeNatural(codeRect.w, codeRect.h)) };
      }
    }
    if (showViz) {
      vizRect = parts[i++];
    }
    varsRect = varsH ? parts[i++] : null;
    noteRect = noteH ? parts[i++] : null;
  }

  const viz = (tv.step.viz ?? {}) as Record<string, VizState>;
  const prevViz = (tv.prev?.viz ?? {}) as Record<string, VizState>;
  const keys = (props.viz ?? Object.keys(viz)).filter((k) => k in viz);
  const vizCells = vizRect && keys.length ? stackV(vizRect, keys.map(() => 'fill' as const), g) : [];

  // 说明沿用最近一条：只在关键步骤写 note，中间步骤不会把说明清空（避免文字一闪一闪）
  let noteIdx = -1;
  for (let k = tv.index; k >= 0; k--) {
    if (steps[k].note) {
      noteIdx = k;
      break;
    }
  }
  const [pt, pc, pv] = useRevealProgress([0, 3, 6]);

  return (
    <>
      <SceneTitle layout={t} text={props.title} reveal={pt} />
      {codeRect ? (
        <Box rect={codeRect} name="code" reveal={pc}>
          <CodePanel
            code={tv.trace.code}
            lang={tv.trace.lang}
            width={codeRect.w}
            height={codeRect.h}
            activeLines={tv.step.lines}
            prevActiveLines={tv.prev?.lines ?? null}
            progress={tv.progress}
            fontSize={codeMax}
            dimInactive={props.dimInactive}
            annotations={annotationsAt(tv.index)}
            title={props.codeTitle}
          />
        </Box>
      ) : null}
      {keys.map((k, i) => (
        <Box key={k} rect={vizCells[i]} name={`viz-${k}`} reveal={pv}>
          <VizPanel state={viz[k]} prev={prevViz[k] ?? null} progress={tv.progress} width={vizCells[i].w} height={vizCells[i].h} />
        </Box>
      ))}
      {varsRect ? <VarsPanel rect={varsRect} metrics={vm} vars={tv.step.vars} prevVars={tv.prev?.vars} progress={tv.progress} only={only} theme={theme} unit={unit} /> : null}
      {noteRect ? (
        <Box rect={noteRect} name="note" style={{ borderLeft: `${noteBar}px solid ${theme.colors.accent}`, backgroundColor: withAlpha(theme.colors.accent, theme.dark ? 0.1 : 0.06), boxSizing: 'border-box' }}>
          {noteIdx >= 0 ? (
            <TextBlock fit={noteFits[noteIdx]} text={notes[noteIdx]} style={bs} rect={{ x: notePad, y: notePad, w: noteRect.w - noteBar - 2 * notePad, h: noteFits[noteIdx].height }} color={theme.colors.text} />
          ) : null}
        </Box>
      ) : null}
    </>
  );
};

export const AlgoScene: React.FC<SceneProps<AlgoSceneProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
