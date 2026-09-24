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
  fontFamily: string[];
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
    success: string;
    warning: string;
    danger: string;
  };
  background: { type: 'solid' | 'gradient' | 'grid' | 'dots'; colors: string[]; opacity?: number };
  fonts: { heading: string[]; body: string[]; mono: string[] };
  /** 字号（像素），以短边 1080 为基准，按实际画幅等比缩放 */
  type: { display: number; h1: number; h2: number; h3: number; body: number; small: number; code: number };
  radius: number;
  space: number;
  motion: { easing: [number, number, number, number]; durationSec: number; staggerSec: number };
  code: { theme: string; background: string; lineHighlight: string; lineNumber: string };
  viz: { node: string; nodeText: string; edge: string; marks: Record<MarkName, string> };
};

export type FontSpec = { family: string; file: string; weight?: string; style?: 'normal' | 'italic' };

export type Settings = {
  mode: 'produce' | 'footage';
  title: string;
  language: string;
  video: { width: number; height: number; fps: number; safeArea: SafeArea };
  captions: { burn: boolean; maxLines: number; style: CaptionStyle };
  overlays: {
    watermark: { enabled: boolean; text: string; image: string | null; position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; opacity: number; size: number };
    progressBar: { enabled: boolean; position: 'top' | 'bottom'; height: number; showChapters: boolean };
  };
  fonts: FontSpec[];
  styleName: string;
  themes: Record<string, Theme>;
  cover: { width: number; height: number };
  footage: null | { width: number; height: number; fps: number; scale: number; durationSec: number };
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
