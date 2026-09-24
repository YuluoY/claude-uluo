import type { TextStyle } from '../text';
import { fontStack } from '../theme';
import type { Theme } from '../types';

/** 代码用的等宽字体样式（与 CodePanel 渲染一致） */
export const monoStyleOf = (theme: Theme): TextStyle => ({ family: fontStack(theme.fonts.mono), weight: 400, lineHeight: 1.6 });
