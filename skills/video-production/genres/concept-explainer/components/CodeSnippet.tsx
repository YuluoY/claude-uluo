import React from 'react';
import { useCurrentFrame } from 'remotion';
import { CodePanel, Stage, useContentBox, useProgressFrom, useTheme, useUnit } from '../../engine';
import type { SceneProps } from '../../engine';
import { SceneTitle } from './common';

export type CodeSnippetProps = { code: string; lang: string; title?: string; codeTitle?: string; highlights?: Array<{ lines: number[]; at?: string }>; dimInactive?: boolean };

/** 代码片段：高亮框按 highlights 依次移动（第 k 段在 at 提示点或第 k+1 句开始时） */
export const CodeSnippet: React.FC<SceneProps<CodeSnippetProps>> = ({ props, shot }) => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const unit = useUnit();
  const box = useContentBox();
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
  const titleH = props.title ? theme.type.h2 * unit * 1.8 : 0;
  return (
    <Stage>
      <SceneTitle text={props.title} />
      <CodePanel
        code={props.code}
        lang={props.lang}
        activeLines={idx >= 0 ? hs[idx].lines : []}
        prevActiveLines={idx > 0 ? hs[idx - 1].lines : null}
        progress={idx > 0 ? progress : 1}
        height={box.height - titleH}
        dimInactive={props.dimInactive}
        title={props.codeTitle}
      />
    </Stage>
  );
};
