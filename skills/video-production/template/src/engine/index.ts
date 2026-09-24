// 场景与类型包组件从这里取引擎能力：import { Slide, Box, Card, useSlide, … } from '../engine';
export { auditDom, LayoutProbe, type LayoutIssue } from './audit';
export { ChapterBar, chapterSegments } from './ChapterBar';
export { CodeMorph, type CodeMorphProps } from './code/CodeMorph';
export { CodePanel, codePanelHeight, fitCodeFontSize, type CodePanelProps } from './code/CodePanel';
export { columns, highlighter, langOrText, THEMES as CODE_THEMES, tokenize } from './code/highlighter';
export { captions, getTheme, getTrace, settings, timeline, traces } from './data';
export { ensureFonts, FontGate } from './fonts';
export {
  aspectOf,
  captionBand,
  cols,
  computeFrameLayout,
  gridCells,
  gridLayout,
  inset,
  intersects,
  MARGINS,
  rectStyle,
  splitH,
  splitV,
  stackV,
  TYPE_SCALE,
  useFrameLayout,
  type Aspect,
  type FrameLayout,
  type Rect,
} from './layout';
export {
  affixScale,
  Arrow,
  Bullet,
  fitNumberSize,
  fittedRect,
  Label,
  labelSize,
  labelStyle,
  NumberBadge,
  NumberText,
  numberWidth,
  place,
  relative,
  reserve,
  Rule,
  SourceNote,
  sourceNoteHeight,
  Text,
  useCurrentIndex,
  useImageSize,
  useRevealProgress,
} from './kit';
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
  useShotOptional,
  useStepIndex,
  useWordFrame,
} from './shot';
export {
  Background,
  Box,
  bodyStyle,
  Card,
  cardPadding,
  cardStyle,
  Chrome,
  Decor,
  headingStyle,
  monoStyle,
  motionStyle,
  SceneTitle,
  Slide,
  useSlide,
  useTitleLayout,
  withoutHeader,
  type BoxProps,
  type Motion,
  type SlideProps,
  type TitleLayout,
} from './slide';
export { Stage, useCaptionReserve, useContentBox, useSafeInsets } from './Stage';
export { atomize, FitText, fitText, fitTextGroup, TextBlock, textWidth, useTextFit, useTextFitGroup, wrapText, type GroupItem, type TextFit, type TextStyle } from './text';
export { fontStack, ThemeProvider, useTheme, useUnit } from './theme';
export type * from './types';
