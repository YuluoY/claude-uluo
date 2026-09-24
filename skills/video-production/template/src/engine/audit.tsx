// 版面检测：在真实渲染出的 DOM 上测量每个槽位（data-vp-box），找出
//   outside  槽位越出它所在的区域（内容区 / 页眉 / 画布）
//   captions 槽位压到字幕带
//   overflow 槽位里的内容超出槽位
//   overlap  同一层的两个槽位互相压盖
//   text     文字在最小字号下也放不下
// 结果通过 Remotion 的 <Artifact> 写到 out/Stills/layout/<id>.json，由 vp.py 汇总报告。
import React, { useEffect, useRef, useState } from 'react';
import { Artifact, continueRender, delayRender } from 'remotion';
import { type FrameLayout, type Rect, useFrameLayout } from './layout';
import { useTheme } from './theme';

export type LayoutIssue = {
  kind: 'outside' | 'captions' | 'overflow' | 'overlap' | 'text';
  box: string;
  other?: string;
  /** 超出或重叠的像素量 */
  amount: number;
  rect: Rect;
};

const TOL = 1.5;

const area = (r: Rect) => Math.max(0, r.w) * Math.max(0, r.h);
const intersection = (a: Rect, b: Rect): Rect => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  return { x, y, w: Math.max(0, x2 - x), h: Math.max(0, y2 - y) };
};
const excess = (inner: Rect, outer: Rect) =>
  Math.max(outer.x - inner.x, inner.x + inner.w - (outer.x + outer.w), outer.y - inner.y, inner.y + inner.h - (outer.y + outer.h), 0);

const excessX = (inner: Rect, outer: Rect) => Math.max(outer.x - inner.x, inner.x + inner.w - (outer.x + outer.w), 0);

const round = (r: Rect): Rect => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });

/** 槽位所在页面的内容区：<Slide> 在 data-vp-content 里写了本页实际的内容区（关掉页眉的页面更高） */
const contentOf = (el: HTMLElement, f: FrameLayout): Rect => {
  const host = el.closest<HTMLElement>('[data-vp-content]');
  const v = host?.dataset.vpContent?.split(',').map(Number);
  return v && v.length === 4 && v.every(Number.isFinite) ? { x: v[0], y: v[1], w: v[2], h: v[3] } : f.content;
};

/** 入场动画（data-vp-anim）只是视觉位移：测量时临时去掉 transform，按元素的最终位置检查 */
export const auditDom = (root: HTMLElement, f: FrameLayout): LayoutIssue[] => {
  const neutral = document.createElement('style');
  neutral.textContent = '[data-vp-anim] { transform: none !important; }';
  document.head.appendChild(neutral);
  try {
    return measure(root, f);
  } finally {
    neutral.remove();
  }
};

const measure = (root: HTMLElement, f: FrameLayout): LayoutIssue[] => {
  const base = root.getBoundingClientRect();
  // 渲染缩放（--scale）只改变像素密度，不改变 CSS 布局；这里按合成的逻辑尺寸换算
  const k = base.width > 0 ? f.width / base.width : 1;
  const loc = (el: Element): Rect => {
    const r = el.getBoundingClientRect();
    return { x: (r.left - base.left) * k, y: (r.top - base.top) * k, w: r.width * k, h: r.height * k };
  };
  const issues: LayoutIssue[] = [];
  const boxes = Array.from(root.querySelectorAll<HTMLElement>('[data-vp-box]')).filter((el) => !el.closest('[data-vp-ignore]'));
  const rects = new Map<HTMLElement, Rect>();
  for (const box of boxes) {
    rects.set(box, loc(box));
  }
  for (const box of boxes) {
    const name = box.dataset.vpBox ?? '?';
    const r = rects.get(box) as Rect;
    if (area(r) <= 0) {
      continue;
    }
    const regionName = box.dataset.vpRegion ?? 'content';
    const region = regionName === 'canvas' ? f.canvas : regionName === 'header' ? f.header ?? f.canvas : contentOf(box, f);
    // 嵌套槽位只需要待在父槽位里；顶层槽位要待在所在区域里
    const parentBox = box.parentElement?.closest<HTMLElement>('[data-vp-box]');
    const container = parentBox ? (rects.get(parentBox) as Rect) : region;
    const out = excess(r, container);
    if (out > TOL) {
      issues.push({ kind: 'outside', box: name, other: parentBox?.dataset.vpBox ?? regionName, amount: Math.round(out), rect: round(r) });
    }
    if (!parentBox && f.captions && regionName !== 'canvas') {
      const hit = intersection(r, f.captions);
      if (hit.h > TOL && hit.w > TOL) {
        issues.push({ kind: 'captions', box: name, amount: Math.round(hit.h), rect: round(r) });
      }
    }
    let worst = 0;
    for (const el of Array.from(box.querySelectorAll('*'))) {
      // 装饰层不算；嵌套槽位里的内容由内层槽位自己负责（内层越界会单独报 outside）
      if (el.closest('[data-vp-ignore]') || el.closest('[data-vp-box]') !== box) {
        continue;
      }
      let rr = loc(el);
      // 有意裁切的区域（代码滚动视口等，data-vp-clip）里的元素只算可见部分
      const clip = el.parentElement?.closest<HTMLElement>('[data-vp-clip]');
      if (clip && box.contains(clip)) {
        rr = intersection(rr, loc(clip));
      }
      if (rr.w <= 0 || rr.h <= 0) {
        continue;
      }
      // 行内文字（span）的盒子高度是字体的上下伸部（中文字体常到 1.45em），比行高大，但字形本身在行框内：
      // 行框由排版引擎按行高算好，这里对行内元素只查横向溢出；块级元素与 SVG 图形横纵都查
      const inlineText = el instanceof HTMLElement && getComputedStyle(el).display === 'inline';
      worst = Math.max(worst, inlineText ? excessX(rr, r) : excess(rr, r));
    }
    if (worst > TOL) {
      issues.push({ kind: 'overflow', box: name, amount: Math.round(worst), rect: round(r) });
    }
  }
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-vp-overflow="1"]'))) {
    issues.push({ kind: 'text', box: el.dataset.vpBox ?? el.closest<HTMLElement>('[data-vp-box]')?.dataset.vpBox ?? '?', amount: 0, rect: round(loc(el)) });
  }
  // 同一层（同一个父槽位或同一个根）的槽位两两不能压盖；data-vp-layer="overlay" 的是有意叠放
  const groups = new Map<Element, HTMLElement[]>();
  for (const box of boxes) {
    if (box.dataset.vpLayer === 'overlay') {
      continue;
    }
    const parent = box.parentElement?.closest('[data-vp-box]') ?? box.closest('[data-vp-root]') ?? root;
    const list = groups.get(parent) ?? [];
    list.push(box);
    groups.set(parent, list);
  }
  for (const list of groups.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = rects.get(list[i]) as Rect;
        const b = rects.get(list[j]) as Rect;
        const hit = intersection(a, b);
        if (hit.w > TOL && hit.h > TOL && area(hit) > 0.004 * Math.min(area(a), area(b))) {
          issues.push({ kind: 'overlap', box: list[i].dataset.vpBox ?? '?', other: list[j].dataset.vpBox ?? '?', amount: Math.round(Math.min(hit.w, hit.h)), rect: round(hit) });
        }
      }
    }
  }
  // 水印等全局叠加层（data-vp-avoid）不能压到任何内容
  for (const av of Array.from(root.querySelectorAll<HTMLElement>('[data-vp-avoid="1"]'))) {
    const ar = loc(av);
    for (const box of boxes) {
      if (box === av || box.contains(av) || av.contains(box)) {
        continue;
      }
      const hit = intersection(ar, rects.get(box) as Rect);
      if (hit.w > TOL && hit.h > TOL) {
        issues.push({ kind: 'overlap', box: av.dataset.vpBox ?? 'overlay', other: box.dataset.vpBox ?? '?', amount: Math.round(Math.min(hit.w, hit.h)), rect: round(hit) });
      }
    }
  }
  return issues;
};

/** 包住要检测的画面：挂载后测量一次，结果写成 Artifact。每一帧要用不同的 key 重新挂载 */
export const LayoutProbe: React.FC<{ id: string; frameNo: number; children: React.ReactNode }> = ({ id, frameNo, children }) => {
  const theme = useTheme();
  const frame = useFrameLayout(theme);
  const ref = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const [handle] = useState(() => delayRender(`版面检测 ${id}`));
  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    const issues = auditDom(root, frame);
    setResult(JSON.stringify({ id, frame: frameNo, width: frame.width, height: frame.height, content: frame.content, captions: frame.captions, issues }));
  }, [id, frameNo, frame]);
  useEffect(() => {
    if (result !== null) {
      continueRender(handle);
    }
  }, [result, handle]);
  return (
    <>
      <div ref={ref} data-vp-root="1" style={{ position: 'absolute', inset: 0 }}>
        {children}
      </div>
      {result !== null ? <Artifact filename={`layout/${id}.json`} content={result} /> : null}
    </>
  );
};
