// 代码逐步写出来：versions 依次过渡（没变的 token 平移，删掉的淡出，新增的淡入）。
// 第 k 个版本（k ≥ 1）在 at[k-1] 提示点出现；没给 at 时在第 k+1 句开始念时出现。
// 面板宽度铺满内容区，字号按所有版本里最宽最长的一版算，高度按最长的一版定，整块垂直居中。
import React from 'react';
import { Box, CodeMorph, codePanelHeight, fitCodeFontSize, SceneTitle, Slide, useRevealFrames, useRevealProgress, useSlide, useTitleLayout } from './deps';
import type { SceneProps } from '../../engine';

export type CodeBuildProps = {
  versions: string[];
  lang: string;
  /** 第 2、3…个版本出现的提示点 id */
  at?: string[];
  title?: string;
  /** 代码面板顶部文件名 */
  codeTitle?: string;
  /** 最大字号（短边 1080 基准）；实际字号会自动缩到放得下 */
  fontSize?: number;
};

const Body: React.FC<{ props: CodeBuildProps; switchFrames: number[] }> = ({ props, switchFrames }) => {
  const { frame, theme } = useSlide();
  const unit = frame.unit;
  const codeMax = props.fontSize ?? theme.type.code * frame.typeScale;
  const t = useTitleLayout(props.title);
  const body = t.body;
  const title = Boolean(props.codeTitle);
  const fs = Math.min(
    ...props.versions.map((v) => fitCodeFontSize({ code: v.replace(/\n+$/, ''), lang: props.lang, theme, unit, width: body.w, height: body.h, max: codeMax, lineNumbers: false, title })),
  );
  const longest = props.versions.reduce((a, v) => (v.replace(/\n+$/, '').split('\n').length > a.split('\n').length ? v.replace(/\n+$/, '') : a), '');
  const h = Math.min(body.h, codePanelHeight({ code: longest, fontSize: fs, unit, title }));
  const rect = { x: body.x, y: body.y + (body.h - h) * 0.4, w: body.w, h };
  const [pt, pc] = useRevealProgress([0, 3]);
  return (
    <>
      <SceneTitle layout={t} text={props.title} reveal={pt} />
      <Box rect={rect} name="code" reveal={pc}>
        <CodeMorph versions={props.versions} lang={props.lang} switchFrames={switchFrames} fontSize={codeMax} width={rect.w} height={rect.h} title={props.codeTitle} />
      </Box>
    </>
  );
};

export const CodeBuild: React.FC<SceneProps<CodeBuildProps>> = ({ props }) => {
  if (!Array.isArray(props.versions) || props.versions.length === 0) {
    throw new Error('CodeBuild：versions 至少要有一个代码版本');
  }
  const n = props.versions.length;
  const reveal = useRevealFrames(n, [undefined, ...(props.at ?? [])]);
  const switchFrames: number[] = [];
  for (let k = 1; k < n; k++) {
    switchFrames.push(Math.max(reveal[k], switchFrames[k - 2] ?? 0));
  }
  return (
    <Slide>
      <Body props={props} switchFrames={switchFrames} />
    </Slide>
  );
};
