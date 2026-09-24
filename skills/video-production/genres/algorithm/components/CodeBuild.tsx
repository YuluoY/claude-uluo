// 代码逐步写出来：versions 依次过渡（没变的 token 平移，删掉的淡出，新增的淡入）。
// 第 k 个版本（k ≥ 1）在 at[k-1] 提示点出现；没给 at 时在第 k+1 句开始念时出现。
import React from 'react';
import { CodeMorph, fontStack, Stage, useRevealFrames, useTheme, useUnit } from './deps';
import type { SceneProps } from '../../engine';

export type CodeBuildProps = {
  versions: string[];
  lang: string;
  /** 第 2、3…个版本出现的提示点 id */
  at?: string[];
  title?: string;
  /** 代码面板顶部文件名 */
  codeTitle?: string;
  fontSize?: number;
};

export const CodeBuild: React.FC<SceneProps<CodeBuildProps>> = ({ props }) => {
  const theme = useTheme();
  const unit = useUnit();
  const n = props.versions.length;
  const reveal = useRevealFrames(n, [undefined, ...(props.at ?? [])]);
  const switchFrames: number[] = [];
  for (let k = 1; k < n; k++) {
    switchFrames.push(Math.max(reveal[k], switchFrames[k - 2] ?? 0));
  }
  return (
    <Stage padding={72}>
      {props.title ? (
        <div style={{ fontFamily: fontStack(theme.fonts.heading), fontSize: theme.type.h3 * unit, fontWeight: 700, marginBottom: theme.space * unit }}>
          {props.title}
        </div>
      ) : null}
      <CodeMorph versions={props.versions} lang={props.lang} switchFrames={switchFrames} fontSize={props.fontSize} title={props.codeTitle} />
    </Stage>
  );
};
