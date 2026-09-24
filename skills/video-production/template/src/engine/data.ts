// 读取 vp.py 生成的数据。JSON 在打包时静态引入，渲染过程中不做任何网络或文件读取，保证逐帧确定。
import captionsRaw from '../generated/captions.json';
import settingsRaw from '../generated/settings.json';
import timelineRaw from '../generated/timeline.json';
import tracesRaw from '../generated/traces.json';
import type { CaptionsData, Settings, Theme, TimelineData, TraceData } from './types';

export const timeline = timelineRaw as unknown as TimelineData;
export const captions = captionsRaw as unknown as CaptionsData;
export const settings = settingsRaw as unknown as Settings;
export const traces = tracesRaw as unknown as Record<string, TraceData>;

export const getTheme = (name?: string): Theme => {
  const key = name ?? settings.styleName;
  const theme = settings.themes[key];
  if (!theme) {
    throw new Error(`找不到风格 ${key}；可用：${Object.keys(settings.themes).join(', ')}（新加的风格要先运行 vp.py build）`);
  }
  return theme;
};

export const getTrace = (id: string): TraceData => {
  const t = traces[id];
  if (!t) {
    throw new Error(`找不到 trace ${id}；可用：${Object.keys(traces).join(', ') || '（无）'}（先运行 vp.py build）`);
  }
  return t;
};
