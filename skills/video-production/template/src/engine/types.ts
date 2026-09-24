// 数据结构：与 vp.py 写出的 src/generated/*.json 一一对应。改这里要同步改 scripts/vp 里的生成逻辑。
import type React from 'react';

export type TransitionType = 'cut' | 'fade' | 'slide' | 'wipe';

export type SceneSource = {
  type: 'scene';
  component: string;
  props?: Record<string, unknown>;
};

export type ClipSource = {
  type: 'clip';
  file: string;
  trimStartSec?: number;
  fit?: 'cover' | 'contain';
  volume?: number;
  loop?: boolean;
  playbackRate?: number;
  background?: string;
  /** vp.py 用 ffprobe 算出的片段可用帧数（已扣除 trimStartSec、按 playbackRate 换算） */
  clipDurationInFrames?: number;
};

export type ImageSource = {
  type: 'image';
  file: string;
  fit?: 'cover' | 'contain';
  kenBurns?: boolean;
  background?: string;
};

export type ShotSource = SceneSource | ClipSource | ImageSource;

/** 词元：字幕与提示点的最小时间单位。帧号相对所在镜头的起点。span 是它在句子显示文本中的 [起, 止) 下标 */
export type TokenData = {
  text: string;
  span: [number, number];
  startFrame: number;
  endFrame: number;
};

/** 句子：帧号相对所在镜头的起点 */
export type SentenceData = {
  id: string;
  text: string;
  startFrame: number;
  endFrame: number;
  tokens: TokenData[];
};

export type StepMark = { step: number; frame: number };

export type ShotData = {
  id: string;
  index: number;
  chapter: string | null;
  /** 在全片中的起始帧 */
  from: number;
  /** 到下一镜出现为止的帧数（不含下一镜进入转场期间的叠加） */
  durationInFrames: number;
  /** 进入本镜的转场 */
  transition: { type: TransitionType; durationInFrames: number };
  source: ShotSource;
  sentences: SentenceData[];
  /** 提示点 id → 帧号（相对镜头起点） */
  cues: Record<string, number>;
  /** 算法步骤切换时刻（相对镜头起点），按帧号排序 */
  steps: StepMark[];
};

export type ChapterData = { title: string; startFrame: number; endFrame: number };

export type TimelineData = {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  title: string;
  /** 相对 public/ 的整片音轨，没有配音和 BGM 时为 null */
  audio: string | null;
  chapters: ChapterData[];
  shots: ShotData[];
};

export type CaptionPiece = { text: string; startFrame?: number; endFrame?: number };

/** 字幕块：帧号是全片帧号；lines 是行，每行由词元片段和分隔片段组成 */
export type CaptionBlock = {
  id: string;
  startFrame: number;
  endFrame: number;
  lines: CaptionPiece[][];
};

export type CaptionsData = { blocks: CaptionBlock[] };

export type CaptionStyle = {
  /** null 时用风格的正文字体 */
  fontFamily: string[] | null;
  fontSize: number;
  fontWeight: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  shadow: boolean;
  background: string | null;
  bottomPct: number;
  maxWidthPct: number;
  lineHeight: number;
  highlightWords: boolean;
  highlightColor: string;
};

export type SafeArea = { top: number; bottom: number; left: number; right: number };

export type MarkName = 'active' | 'compare' | 'done' | 'visited' | 'path' | 'swap' | 'found' | 'muted';

export type Theme = {
  name: string;
  description: string;
  /** 出处说明（改编自哪个开源预设） */
  credit?: string;
  dark: boolean;
  colors: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    accent2: string;
    /** 强调色底上的文字颜色 */
    onAccent: string;
    success: string;
    warning: string;
    danger: string;
  };
  background: {
    type: 'solid' | 'linear' | 'radial' | 'mesh' | 'split' | 'grid' | 'dots';
    colors: string[];
    angle?: number;
    opacity?: number;
    /** split：第一种颜色占画面宽度的比例 */
    split?: number;
  };
  decor: {
    motif: 'none' | 'orbs' | 'circles' | 'lines' | 'brackets' | 'bars' | 'halftone' | 'tabs' | 'glow-grid' | 'blocks';
    grain: number;
    accentBar: 'none' | 'left' | 'top';
    sectionNumber: boolean;
    frame: boolean;
  };
  chrome: { header: boolean; chapter: boolean; pageNumber: boolean };
  fonts: {
    heading: string[];
    body: string[];
    mono: string[];
    headingWeight: number;
    bodyWeight: number;
    packages: Record<string, string>;
    imports: string[];
    faces: Array<{ family: string; weights: number[]; style?: string }>;
  };
  /** 字号（像素），以短边 1080 为基准，按实际画幅等比缩放 */
  type: {
    display: number;
    h1: number;
    h2: number;
    h3: number;
    body: number;
    small: number;
    code: number;
    lineHeight: number;
    headingLineHeight: number;
    /** 标题字距（em） */
    headingTracking: number;
  };
  radius: number;
  space: number;
  card: { style: 'flat' | 'outline' | 'elevated' | 'glass' | 'filled'; shadow: string };
  title: { style: 'plain' | 'underline' | 'bar' | 'kicker'; case: 'none' | 'upper' };
  motion: { easing: [number, number, number, number]; durationSec: number; staggerSec: number };
  code: { theme: string; background: string; lineHighlight: string; lineNumber: string };
  viz: { node: string; nodeText: string; edge: string; marks: Record<MarkName, string> };
};

export type FontSpec = { family: string; file: string; weight?: string; style?: 'normal' | 'italic' };

export type Settings = {
  mode: 'produce' | 'footage';
  title: string;
  language: string;
  /** 画面文字总开关：auto = 正常；off = 隐藏所有说明性文字，只留代码、数值、字幕与章节条 */
  sceneText: 'auto' | 'off';
  video: { width: number; height: number; fps: number; safeArea: SafeArea };
  captions: { burn: boolean; maxLines: number; style: CaptionStyle };
  overlays: {
    /** 右上角页码（章节条在顶部时页眉只剩它）；false 就完全不画 */
    pageNumber: boolean;
    /** 页眉带：页码关掉后它会是空白带，false 就不预留这块高度 */
    header: boolean;
    /** 背景里那个大号镜头序号（主题 decor.sectionNumber）；false 连它一起不画 */
    sectionNumber: boolean;
    watermark: { enabled: boolean; text: string; image: string | null; position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; opacity: number; size: number };
    progressBar: { enabled: boolean; position: 'top' | 'bottom'; height: number; showChapters: boolean };
    chapterBar: {
      enabled: boolean;
      position: 'top' | 'bottom';
      style: 'ruler' | 'filled' | 'outline' | 'underline';
      widths: 'equal' | 'duration';
      showProgress: boolean;
      height: number;
      /** ruler：轨尺贴哪边（top 刻度朝下 / bottom 刻度朝上） */
      tickPosition: 'top' | 'bottom';
      /** ruler：大刻度长度（像素，短边 1080 基准） */
      tickLength: number;
      /** ruler：刻度线宽（像素，短边 1080 基准） */
      tickWidth: number;
      /** ruler：已播刻度颜色（auto = 主题强调色，或 #RRGGBB） */
      tickColor: string;
      /** ruler：未播刻度颜色（auto = 弱化文字色） */
      tickColorIdle: string;
      /** ruler：除章节边界外，每隔多少像素补一根大刻度；0 = 只画章节边界 */
      tickEvery: number;
      /** ruler：是否画贴边线 */
      rail: boolean;
      /** ruler：贴边线粗细（像素，短边 1080 基准） */
      railThickness: number;
      /** ruler：贴边线颜色（auto = 弱化文字色） */
      railColor: string;
      /** ruler：进度长方形色块高度（像素，短边 1080 基准） */
      progressThickness: number;
      /** ruler：进度色块颜色（auto = 主题强调色） */
      progressColor: string;
      /** ruler：轨道颜色（未播部分，auto = 弱化文字色） */
      trackColor: string;
      /** ruler：章节名距线的距离（像素，短边 1080 基准） */
      labelGap: number;
      /** ruler：章节名在区间里居中还是靠左 */
      labelAlign: 'center' | 'start';
      /** ruler：章节名字号（像素，短边 1080 基准）；0 = 自动 */
      labelSize: number;
      /** 是否画章节名（sceneText=off 时通常也不需要） */
      showLabels: boolean;
    };
  };
  fonts: FontSpec[];
  styleName: string;
  themes: Record<string, Theme>;
  cover: { width: number; height: number };
  footage: null | { width: number; height: number; fps: number; scale: number; durationSec: number };
  /** 本片用到的全部字符（字体按它加载对应的 unicode-range 分片） */
  glyphs: string;
};

/** 算法 trace 的一步（由 src/algo/<id>/trace.ts 记录） */
export type TraceStep = {
  lines: number[];
  vars?: Record<string, unknown>;
  viz?: Record<string, unknown>;
  note?: string;
};

export type TraceData = { id: string; lang: string; code: string; steps: TraceStep[] };

export type SceneProps<P = Record<string, unknown>> = {
  /** storyboard 里 source.props 的内容 */
  props: P;
  shot: ShotData;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SceneComponent = React.ComponentType<SceneProps<any>>;
