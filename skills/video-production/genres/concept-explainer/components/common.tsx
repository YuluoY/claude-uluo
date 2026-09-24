// 本类型包共用的小工具。版面积木（Slide、Box、Card、useTitleLayout、NumberBadge、SourceNote…）都在引擎里。
import type { Aspect } from '../../engine';

/** 必填文字：缺了直接报错，不让空内容进成片 */
export const requireText = (value: unknown, name: string, scene: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${scene}：缺少 ${name}`);
  }
  return value;
};

/** 必填列表 */
export const requireList = <T,>(value: unknown, name: string, scene: string, min = 1): T[] => {
  if (!Array.isArray(value) || value.length < min) {
    throw new Error(`${scene}：${name} 至少要有 ${min} 项`);
  }
  return value as T[];
};

/** 两位编号：1 → "01" */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** 按画幅取值 */
export const byAspect = <T,>(aspect: Aspect, v: { landscape: T; square: T; portrait: T }): T => v[aspect];

/** 数字格式：固定小数位；group 时加千分位 */
export const formatNumber = (v: number, decimals = 0, group = false): string => {
  const s = Math.abs(v).toFixed(decimals);
  const [int, frac] = s.split('.');
  const g = group ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : int;
  return `${v < 0 ? '-' : ''}${g}${frac !== undefined ? `.${frac}` : ''}`;
};
