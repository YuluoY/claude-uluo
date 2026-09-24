// 场景与类型包组件从这里取引擎能力：import { Stage, useTheme, useCueFrame, … } from '../engine';
export { captions, getTheme, getTrace, settings, timeline, traces } from './data';
export { ease, fadeUp, lerp, mixColor, popIn, withAlpha } from './motion';
export {
  ShotProvider,
  useActiveSentenceIndex,
  useCueFrame,
  useCueProgress,
  useProgressFrom,
  useRevealFrames,
  useSentences,
  useShot,
  useStepIndex,
  useWordFrame,
} from './shot';
export { Background, Stage, useCaptionReserve, useContentBox, useSafeInsets } from './Stage';
export { ThemeProvider, fontStack, useTheme, useUnit } from './theme';
export type * from './types';
export { CodeMorph, type CodeMorphProps } from './code/CodeMorph';
export { CodePanel, type CodePanelProps } from './code/CodePanel';
export { columns, highlighter, langOrText, THEMES as CODE_THEMES, tokenize } from './code/highlighter';
