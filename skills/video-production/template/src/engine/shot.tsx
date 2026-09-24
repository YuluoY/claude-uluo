// 镜头上下文与时间 hooks。场景里所有“什么时候发生”都从这里取，不要自己按秒数写死。
// 帧号都相对镜头起点（在镜头内 useCurrentFrame() 返回的就是相对帧）。
import React, { createContext, useContext } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { ease } from './motion';
import { useTheme } from './theme';
import type { SentenceData, ShotData } from './types';

const ShotContext = createContext<ShotData | null>(null);

export const ShotProvider: React.FC<{ shot: ShotData; children: React.ReactNode }> = ({ shot, children }) => (
  <ShotContext.Provider value={shot}>{children}</ShotContext.Provider>
);

export const useShot = (): ShotData => {
  const shot = useContext(ShotContext);
  if (!shot) {
    throw new Error('useShot 只能在镜头场景内使用');
  }
  return shot;
};

/** 提示点的帧号（storyboard 里 sentences[].cues[].id）。缺失时用 fallback，没给 fallback 就报错 */
export const useCueFrame = (id: string, fallback?: number): number => {
  const shot = useShot();
  const f = shot.cues[id];
  if (f === undefined) {
    if (fallback !== undefined) {
      return fallback;
    }
    const known = Object.keys(shot.cues);
    throw new Error(`镜头 ${shot.id} 没有提示点 ${id}；已有：${known.join(', ') || '（无）'}`);
  }
  return f;
};

/** 从提示点开始的动画进度 0→1（按主题的缓动与时长） */
export const useCueProgress = (id: string, durationSec?: number, fallback?: number): number => {
  const frame = useCurrentFrame();
  const at = useCueFrame(id, fallback);
  return useProgressFrom(at, durationSec, frame);
};

/** 从某一帧开始的动画进度 0→1 */
export const useProgressFrom = (startFrame: number, durationSec?: number, frameOverride?: number): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const f = frameOverride ?? frame;
  const dur = Math.max(1, Math.round((durationSec ?? theme.motion.durationSec) * fps));
  return ease(theme, (f - startFrame) / dur);
};

export const useSentences = (): SentenceData[] => useShot().sentences;

/** 当前正在念（或刚念完）的句子下标；第一句开始前为 -1 */
export const useActiveSentenceIndex = (): number => {
  const frame = useCurrentFrame();
  const sentences = useSentences();
  let idx = -1;
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].startFrame <= frame) {
      idx = i;
    }
  }
  return idx;
};

/**
 * 逐项出现的时刻：第 k 项优先用 cueIds[k] 指定的提示点，其次用第 k 句开始念的帧，
 * 再没有就在镜头前 60% 的时长里均匀排开。用于要点、步骤、图例等“随口播逐个出现”的元素。
 */
export const useRevealFrames = (count: number, cueIds?: Array<string | undefined | null>): number[] => {
  const shot = useShot();
  const { fps } = useVideoConfig();
  const out: number[] = [];
  const lead = Math.round(0.15 * fps);
  for (let k = 0; k < count; k++) {
    const cue = cueIds?.[k];
    if (cue) {
      const f = shot.cues[cue];
      if (f === undefined) {
        throw new Error(`镜头 ${shot.id} 没有提示点 ${cue}`);
      }
      out.push(f);
    } else if (k < shot.sentences.length) {
      out.push(Math.max(0, shot.sentences[k].startFrame - lead));
    } else {
      out.push(Math.round((shot.durationInFrames * 0.6 * k) / Math.max(1, count)));
    }
  }
  return out;
};

/** 句子里某段文字开始念的帧（相对镜头），找不到返回 undefined */
export const useWordFrame = (sentenceId: string, text: string, occurrence = 1): number | undefined => {
  const shot = useShot();
  const s = shot.sentences.find((x) => x.id === sentenceId);
  if (!s) {
    return undefined;
  }
  let pos = -1;
  for (let i = 0; i < occurrence; i++) {
    pos = s.text.indexOf(text, pos + 1);
    if (pos < 0) {
      return undefined;
    }
  }
  const end = pos + text.length;
  const hit = s.tokens.filter((t) => t.span[0] < end && t.span[1] > pos);
  return hit.length ? Math.min(...hit.map((t) => t.startFrame)) : undefined;
};

/** 当前算法步骤（镜头 steps 里最后一个已到达的；第一个之前取第一个） */
export const useStepIndex = (): { step: number; sinceFrame: number; prevStep: number | null } => {
  const frame = useCurrentFrame();
  const { steps } = useShot();
  if (steps.length === 0) {
    return { step: 0, sinceFrame: 0, prevStep: null };
  }
  let i = 0;
  for (let k = 0; k < steps.length; k++) {
    if (steps[k].frame <= frame) {
      i = k;
    }
  }
  return { step: steps[i].step, sinceFrame: steps[i].frame, prevStep: i > 0 ? steps[i - 1].step : null };
};
