import { mixColor } from '../../engine';
import type { MarkName, Theme } from '../../engine';

/** 元素底色：有标记用标记色，没有用默认节点色；从上一步颜色按进度过渡 */
export const markColor = (theme: Theme, mark: MarkName | undefined, prevMark: MarkName | undefined, progress: number, base?: string): string => {
  const b = base ?? theme.viz.node;
  const to = mark ? theme.viz.marks[mark] : b;
  const from = prevMark ? theme.viz.marks[prevMark] : b;
  return mixColor(from, to, progress);
};

/** 深浅底色上的文字颜色 */
export const textOn = (theme: Theme, mark: MarkName | undefined): string => {
  if (!mark || mark === 'muted' || mark === 'visited') {
    return mark === 'muted' ? theme.colors.textMuted : theme.viz.nodeText;
  }
  return theme.dark ? '#0B1020' : '#FFFFFF';
};
