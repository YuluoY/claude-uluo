import React from 'react';
import { useCurrentFrame } from 'remotion';
import {
  Box,
  bodyStyle,
  Card,
  cardPadding,
  CodePanel,
  codePanelHeight,
  fitCodeFontSize,
  Label,
  labelSize,
  reserve,
  SceneTitle,
  Slide,
  splitH,
  TextBlock,
  useProgressFrom,
  useRevealProgress,
  useShot,
  useSlide,
  useTextFitGroup,
  useTitleLayout,
} from '../../engine';
import type { Rect, SceneProps } from '../../engine';
import { requireText } from './common';

type Highlight = { lines: number[]; at?: string; note?: string };
export type CodeSnippetProps = { code: string; lang: string; title?: string; codeTitle?: string; highlights?: Highlight[]; dimInactive?: boolean };

const Body: React.FC<{ props: CodeSnippetProps }> = ({ props }) => {
  const { frame: f, theme, unit } = useSlide();
  const shot = useShot();
  const frame = useCurrentFrame();
  const code = requireText(props.code, 'code', 'CodeSnippet');
  const t = useTitleLayout(props.title);
  const g = f.gutter;
  const hs = props.highlights ?? [];
  const starts = hs.map((h, k) => {
    if (h.at) {
      const c = shot.cues[h.at];
      if (c === undefined) {
        throw new Error(`CodeSnippet：镜头 ${shot.id} 没有提示点 ${h.at}`);
      }
      return c;
    }
    return shot.sentences[k]?.startFrame ?? 0;
  });
  let idx = -1;
  starts.forEach((s, k) => {
    if (frame >= s) {
      idx = k;
    }
  });
  const progress = useProgressFrom(idx >= 0 ? starts[idx] : 0);
  const notes = hs.map((h) => h.note ?? '');
  const hasNotes = notes.some(Boolean);
  const side = hasNotes && f.aspect === 'landscape';
  const pad = cardPadding(theme, unit);
  const lH = labelSize(theme, unit) * 1.5;
  const bs = bodyStyle(theme);
  // 说明卡：横屏放右侧，其他画幅放代码下方；所有说明用同一字号，卡片按最长的一条定高，切换时不跳
  const noteArea: Rect = side ? splitH(t.body, [8, 4], g * 1.2)[1] : { ...t.body, h: t.body.h * 0.3 };
  const noteFits = useTextFitGroup(
    notes.map((text) => ({ text, width: noteArea.w - 2 * pad, height: Math.max(1, noteArea.h - 2 * pad - lH - g * 0.4), maxLines: 8 })),
    { style: bs, max: theme.type.body * unit, min: theme.type.small * unit * 0.85 },
  );
  const noteH = hasNotes ? 2 * pad + lH + g * 0.4 + Math.max(...noteFits.map((x) => x.height)) : 0;
  let codeArea: Rect;
  let noteRect: Rect | null = null;
  if (!hasNotes) {
    codeArea = t.body;
  } else if (side) {
    const [a, b] = splitH(t.body, [8, 4], g * 1.2);
    codeArea = a;
    noteRect = { x: b.x, y: b.y + (b.h - noteH) * 0.4, w: b.w, h: noteH };
  } else {
    const [a, b] = reserve(t.body, noteH, g);
    codeArea = a;
    noteRect = b;
  }
  // 代码面板按内容定高（放得下就不留大片空白），在区域内垂直居中；说明卡在下方时和代码作为一组居中
  const codeMax = theme.type.code * f.typeScale;
  const fs = fitCodeFontSize({ code, lang: props.lang, theme, unit: f.unit, width: codeArea.w, height: codeArea.h, max: codeMax, title: Boolean(props.codeTitle) });
  const panelH = Math.min(codeArea.h, codePanelHeight({ code, fontSize: fs, unit: f.unit, title: Boolean(props.codeTitle) }));
  let codeRect: Rect = { x: codeArea.x, y: codeArea.y + (codeArea.h - panelH) * 0.4, w: codeArea.w, h: panelH };
  if (noteRect && !side) {
    const y0 = t.body.y + (t.body.h - (panelH + g + noteH)) * 0.4;
    codeRect = { ...codeRect, y: y0 };
    noteRect = { ...noteRect, y: y0 + panelH + g };
  }
  const [pt, pc] = useRevealProgress([0, 3]);
  const noteIdx = Math.max(0, idx);
  const noteP = useProgressFrom(idx >= 0 ? starts[idx] : 0);
  return (
    <>
      <SceneTitle layout={t} text={props.title} reveal={pt} />
      <Box rect={codeRect} name="code" reveal={pc}>
        <CodePanel
          code={code}
          lang={props.lang}
          width={codeRect.w}
          height={codeRect.h}
          activeLines={idx >= 0 ? hs[idx].lines : []}
          prevActiveLines={idx > 0 ? hs[idx - 1].lines : null}
          progress={idx > 0 ? progress : 1}
          dimInactive={props.dimInactive}
          title={props.codeTitle}
          fontSize={codeMax}
        />
      </Box>
      {noteRect && hasNotes ? (
        <Card rect={noteRect} name="note" padding={pad} reveal={idx >= 0 && notes[noteIdx] ? 1 : 0} motion="fade" accent={theme.colors.accent}>
          <Label rect={{ x: 0, y: 0, w: noteRect.w - 2 * pad, h: lH }} text={idx >= 0 ? `第 ${hs[noteIdx].lines.join('、')} 行` : ''} />
          <div style={{ position: 'absolute', left: 0, top: lH + g * 0.4, opacity: noteP }}>
            <TextBlock fit={noteFits[noteIdx]} text={notes[noteIdx]} style={bs} rect={{ x: 0, y: 0, w: noteRect.w - 2 * pad, h: noteFits[noteIdx].height }} color={theme.colors.text} />
          </div>
        </Card>
      ) : null}
    </>
  );
};

/**
 * 代码片段：自动字号（最长一行放得下），高亮框按 highlights 依次移动（第 k 段在 at 提示点或第 k 句开始时）。
 * highlights[k].note 会显示在说明卡里（横屏在右侧，其他画幅在代码下方）。
 */
export const CodeSnippet: React.FC<SceneProps<CodeSnippetProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
