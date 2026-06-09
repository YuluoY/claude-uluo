# 性能优化

**加载条件：** 项目启动、搭建完整模块、性能审计时加载。

> 参考：[Core Web Vitals](https://web.dev/vitals/)、[web.dev/learn/performance](https://web.dev/learn/performance/)
> 可观测性指标采集见 `references/observability-design.md`。

---

## 目录

- [Core Web Vitals（2025）](#core-web-vitals)
  - [配重与业务价值](#value-and-business-impact)
- [LCP：让主内容快起来（≤ 2.5s）](#lcp)
  - [根因](#lcp-root-cause)
  - [手段](#lcp-techniques)
- [INP：让交互快起来（≤ 200ms）](#inp)
  - [根因](#inp-root-cause)
  - [手段](#inp-techniques)
- [CLS：让页面稳起来（≤ 0.1）](#cls)
  - [根因](#cls-root-cause)
  - [手段](#cls-techniques)
- [Bundle 优化](#bundle-optimization)
  - [目标](#bundle-target)
  - [手段](#bundle-techniques)
- [图片](#images)
- [字体](#fonts)
- [虚拟滚动](#virtual-scrolling)
- [缓存](#caching)
- [CI 性能预算](#ci-performance-budget)
- [性能监测](#performance-monitoring)
  - [实验室（Lab）vs 真实用户（RUM）](#lab-vs-rum)
- [自检](#self-check)

## Core Web Vitals（2025）

| 指标 | 含义 | 目标 |
|------|------|:---:|
| **LCP** Largest Contentful Paint | 最大内容绘制——主要内容多久可见 | ≤ 2.5s |
| **INP** Interaction to Next Paint | 交互响应——整个会话所有交互的延迟 | ≤ 200ms |
| **CLS** Cumulative Layout Shift | 布局偏移——内容跳动程度 | ≤ 0.1 |

> INP 在 2024 年正式替代 FID——不再只看首次交互，而是衡量**整个会话所有交互**。

### 配重与业务价值

只有 35–58% 的网站同时达到三项阈值。从 "Poor" 优化到 "Good"：转化率平均 +25%，跳出率 -35%，SEO 排名 +8–15%。

---

## LCP：让主内容快起来（≤ 2.5s）

### 根因

| 瓶颈 | 表现 |
|------|------|
| TTFB 过高（>800ms） | 服务器响应慢 |
| 渲染阻塞资源（CSS/JS） | 浏览器等 CSS 才渲染 |
| LCP 图片未优先加载 | lazy 或排在后队列 |
| 客户端渲染延迟 | 等 JS 下载+执行完才有内容 |

### 手段

```html
<!-- 1. 优先加载 LCP 图片 -->
<link rel="preload" as="image" href="hero.webp" fetchpriority="high">
<img src="hero.webp" fetchpriority="high" width="1200" height="600" alt="">

<!-- 2. LCP 图片绝不 lazy -->
<!-- ❌ loading="lazy" 在首屏图片上 -->

<!-- 3. 预连接关键第三方域 -->
<link rel="preconnect" href="https://api.example.com">
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>

<!-- 4. 首屏关键 CSS 内联，其余 defer -->
<style>/* 首屏最小样式 */</style>
<link rel="stylesheet" href="full.css" media="print" onload="this.media='all'">
```

- CDN 加速 TTFB
- SSR / SSG / ISR 减少客户端渲染空白期
- `@import` 禁止——全部 `<link>`

---

## INP：让交互快起来（≤ 200ms）

### 根因

| 瓶颈 | 表现 |
|------|------|
| 长任务（>50ms）阻塞主线程 | 点击后卡顿 |
| 重事件处理器 | 每次交互触发大量计算 |
| 大 DOM | 操作慢 |
| 第三方脚本 | 抢主线程 |

### 手段

```javascript
// 1. 拆分长任务——让出主线程
async function processItems(items)
{
  for (const item of items)
  {
    heavyProcess(item)
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

// 2. 沉重计算进 Web Worker
const worker = new Worker('/workers/compute.js')
worker.postMessage(data)
worker.onmessage = (e) => updateUI(e.data)

// 3. 防抖/节流
const handleSearch = debounce(query => fetchResults(query), 300)
const handleScroll = throttle(() => updatePosition(), 100)

// 4. 非关键任务在空闲时执行
requestIdleCallback(deadline =>
{
  while (deadline.timeRemaining() > 0 && pending.length > 0)
    process(pending.shift())
})
```

**React 专项：**
- `React.memo` 包裹纯展示组件
- `useTransition` 标记低优先级更新
- `useDeferredValue` 延迟渲染

**Vue 专项：**
- `shallowRef` 用于整体替换的对象
- `v-once` 静态内容只渲染一次

---

## CLS：让页面稳起来（≤ 0.1）

### 根因

| 瓶颈 | 表现 |
|------|------|
| 图片/视频无尺寸 | 加载后撑开布局 |
| 动态注入内容（广告/banner） | 挤走已有内容 |
| Web 字体切换 | 文字跳变（FOUT） |
| 动画用 layout 触发属性 | `left`/`top`/`width` 变触发 reflow |

### 手段

```css
/* 1. 图片/视频必有尺寸 */
img, video {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
}

/* 2. 动态内容预留空间 */
.ad-slot {
  min-height: 250px;
}

/* 3. 字体——swap 或 optional，给 fallback 设 size-adjust */
@font-face {
  font-family: 'Custom';
  src: url('/font.woff2') format('woff2');
  font-display: optional;
}

/* 4. 动画只用 transform + opacity —— GPU 合成层，不触发 reflow */
.animate-in {
  transform: translateX(0);
  transition: transform 0.3s ease;
}
/* ❌ 不用 left/top/width/margin 做动画 */
```

```html
<!-- 显式宽高 -->
<img src="photo.jpg" width="800" height="600" alt="">
```

---

## Bundle 优化

### 目标

| 指标 | 值 |
|------|:---:|
| 首屏 JS（gzip） | ≤ 170 KB |
| 总初始 Bundle（gzip） | ≤ 200 KB |
| 主 Bundle | ≤ 100 KB |

### 手段

```typescript
// 路由级代码分割
const OrderPage = lazy(() => import('./pages/OrderPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

// 重型库按需加载
const loadChart = () => import('chart.js')

// hover 预加载
<a onMouseEnter={() => import('./pages/Detail')} href="/detail">详情</a>
```

- **Vendor 拆分**：框架（React/Vue）、UI 库、第三方库各自独立 chunk
- **Tree shaking**：ES Module + 构建工具自动删无用代码
- **替换重型依赖**：Moment.js（67KB）→ date-fns；lodash 全量 → 按需 import
- `vite-bundle-analyzer` 定期审计包体积
- **不要在首屏 bundle 里塞图表库、富文本编辑器**

---

## 图片

```
优先级：AVIF > WebP > JPEG
AVIF 比 JPEG 小 30–45%，WebP 小 25–34%
```

```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="" width="1200" height="600" loading="lazy">
</picture>
```

- `srcset` + `sizes` 响应式
- CDN 自动转换格式/压缩（Cloudflare Images、Imgix）
- 非首屏 `loading="lazy"`，首屏 `fetchpriority="high"`

---

## 字体

```html
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
```

- 优先 WOFF2
- `font-display: optional`（零 CLS）或 `swap`（有 FOUT 但永不 FOIT）
- 子集化：只包含页面实际用到的字符
- Variable Font：一个文件覆盖多个字重

---

## 虚拟滚动

列表 >100 条用虚拟滚动，只渲染可见区域：

- React：`@tanstack/virtual`、`react-window`
- Vue：`vue-virtual-scroller`

---

## 缓存

- **HTTP**：版本化文件名 `main.abc123.js` + `Cache-Control: max-age=31536000, immutable`
- **Service Worker（Workbox）**：预缓存关键资源，离线可用
- **CDN**：全球边缘缓存（Cloudflare、Fastly）
- **API**：React Query / SWR 客户端缓存，`stale-while-revalidate`

---

## CI 性能预算

```javascript
// lighthouse.config.js
{
  budgets: [{
    resourceSizes: [
      { resourceType: 'script', budget: 170 },   // KB gzip
      { resourceType: 'stylesheet', budget: 50 },
      { resourceType: 'image', budget: 300 },
    ],
  }],
}
```

- Lighthouse CI 每次 PR 跑性能审计
- 超预算 → CI 阻断
- 阈值随项目成长渐进收紧

---

## 性能监测

### 实验室（Lab）vs 真实用户（RUM）

| 类型 | 工具 | 数据 |
|------|------|------|
| Lab | Lighthouse、WebPageTest | 模拟环境，CI 用 |
| RUM | `web-vitals` 库、CrUX | 真实用户，Google 排名用 |

```typescript
import { onLCP, onCLS, onINP } from 'web-vitals'

function send(metric)
{
  navigator.sendBeacon('/analytics', JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
  }))
}

onLCP(send)
onCLS(send)
onINP(send)
```

---

## 自检

- [ ] LCP ≤ 2.5s？首屏图片 `fetchpriority="high"`、不 lazy？关键 CSS 内联？
- [ ] INP ≤ 200ms？长任务拆分？Web Worker？防抖节流？
- [ ] CLS ≤ 0.1？图片有显式宽高？动态内容预留空间？动画用 `transform`？
- [ ] 路由级代码分割？Vendor 拆分？bundle 定期审计？
- [ ] 图片 AVIF/WebP + srcset + lazy loading？
- [ ] 字体 WOFF2 + preload + `font-display: optional`？
- [ ] 长列表（>100）虚拟滚动？
- [ ] CI 有性能预算？Lighthouse 门禁？
- [ ] RUM 采集 Core Web Vitals？
