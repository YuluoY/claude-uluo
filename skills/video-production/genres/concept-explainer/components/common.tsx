// 本类型包共用的小部件与工具。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fadeUp, fontStack, useProgressFrom, useTheme, useUnit } from '../../engine';

export const SceneTitle: React.FC<{ text?: string; startFrame?: number }> = ({ text, startFrame = 0 }) => {
  const theme = useTheme();
  const unit = useUnit();
  const p = useProgressFrom(startFrame);
  if (!text) {
    return null;
  }
  return (
    <div
      style={{
        fontFamily: fontStack(theme.fonts.heading),
        fontSize: theme.type.h2 * unit,
        fontWeight: 700,
        color: theme.colors.text,
        marginBottom: theme.space * unit * 1.2,
        ...fadeUp(p, 24 * unit),
      }}
    >
      {text}
    </div>
  );
};

/** 当前帧已经出现到第几项（-1 表示一项都没出现） */
export const useRevealedIndex = (frames: number[]): number => {
  const frame = useCurrentFrame();
  let idx = -1;
  frames.forEach((f, i) => {
    if (frame >= f) {
      idx = i;
    }
  });
  return idx;
};

/** 数据来源角标：用了数字就必须写来源（素材里没有的数字不许编） */
export const SourceNote: React.FC<{ text: string }> = ({ text }) => {
  const theme = useTheme();
  const unit = useUnit();
  return (
    <div style={{ marginTop: 'auto', paddingTop: 16 * unit, fontSize: theme.type.small * unit * 0.85, color: theme.colors.textMuted }}>
      来源：{text}
    </div>
  );
};

export const requireText = (value: unknown, name: string, scene: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${scene}：缺少 ${name}`);
  }
  return value;
};
