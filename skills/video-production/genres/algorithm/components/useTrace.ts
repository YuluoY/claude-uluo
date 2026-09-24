// 当前镜头对应的 trace 步骤：按 storyboard 里句子的 steps / 提示点的 step 推进。
import { getTrace, useProgressFrom, useStepIndex } from '../../engine';
import type { TraceData, TraceStep } from '../../engine';

export type TraceView = {
  trace: TraceData;
  index: number;
  step: TraceStep;
  prev: TraceStep | null;
  /** 从上一步切到当前步的过渡进度 0→1 */
  progress: number;
};

export const useTrace = (id: string): TraceView => {
  const trace = getTrace(id);
  const { step, sinceFrame, prevStep } = useStepIndex();
  const progress = useProgressFrom(sinceFrame);
  const last = trace.steps.length - 1;
  const idx = Math.min(Math.max(0, step), last);
  const prevIdx = prevStep === null ? null : Math.min(Math.max(0, prevStep), last);
  return {
    trace,
    index: idx,
    step: trace.steps[idx],
    prev: prevIdx === null || prevIdx === idx ? null : trace.steps[prevIdx],
    progress: prevIdx === null || prevIdx === idx ? 1 : progress,
  };
};
