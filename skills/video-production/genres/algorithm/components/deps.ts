// 本类型包用到的引擎与 Remotion 能力，集中从这里导入，方便整体替换。
export {
  Box,
  bodyStyle,
  CodeMorph,
  CodePanel,
  codePanelHeight,
  fitCodeFontSize,
  monoStyle,
  SceneTitle,
  Slide,
  splitH,
  stackV,
  TextBlock,
  textWidth,
  useRevealFrames,
  useRevealProgress,
  useSlide,
  useTextFitGroup,
  useTitleLayout,
  withAlpha,
} from '../../engine';
export type { Rect, TextStyle } from '../../engine';
export { useVideoConfig } from 'remotion';
