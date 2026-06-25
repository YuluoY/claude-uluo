# Vercel 风格预设

> 极简、黑白、几何——以最少的视觉元素传递最精准的信息。

---

## 设计理念

Vercel 的设计语言根植于极简主义与现代主义，强调黑白为主的高对比度配色、锐利的几何边缘、以及微妙的渐变层次。其视觉系统以 Geist 字族为核心，配合精密的网格系统与克制的留白，构建出一种工程师气质浓厚、技术感强烈的界面风格。

在色彩使用上，Vercel 几乎完全摒弃了彩色装饰，主色即为纯黑（亮色模式）或纯白（暗色模式），仅在功能性反馈（成功、警告、错误）和品牌强调（蓝色 #0070f3）时引入彩色。边框与分隔线极细且低对比度，让内容自然呼吸；阴影克制而精确，常用于悬浮元素与卡片层级。

动效方面，Vercel 偏好快速、干脆的过渡，使用 `cubic-bezier(0.4, 0, 0.2, 1)` 这类标准缓动曲线，时长较短（150ms~400ms），传递出一种即时响应、毫不拖沓的工程效率感。该风格适用于开发者工具、SaaS 平台、技术文档站点，以及希望传递现代、专业、高效气质的产品界面。

---

## Token 定义

### 颜色

| Token | 亮色模式 | 暗色模式 | 说明 |
|-------|---------|---------|------|
| --color-primary | #000000 | #FFFFFF | 主色（纯黑/纯白） |
| --color-primary-hover | #171717 | #EAEAEA | 主色悬停 |
| --color-primary-active | #333333 | #D4D4D4 | 主色按下 |
| --color-bg | #FFFFFF | #000000 | 背景 |
| --color-bg-elevated | #FFFFFF | #0A0A0A | 提升背景（卡片等） |
| --color-bg-subtle | #FAFAFA | #0A0A0A | 次级背景 |
| --color-text | #171717 | #EDEDED | 主文本 |
| --color-text-secondary | #666666 | #A1A1A1 | 次级文本 |
| --color-text-inverse | #FFFFFF | #000000 | 反色文本 |
| --color-text-disabled | #999999 | #525252 | 禁用文本 |
| --color-border | #EAEAEA | #333333 | 边框 |
| --color-border-subtle | #FAFAFA | #1A1A1A | 次级边框 |
| --color-success | #0070f3 | #0070f3 | 成功 |
| --color-warning | #f5a623 | #f5a623 | 警告 |
| --color-error | #e00 | #ff0000 | 错误 |
| --color-info | #0070f3 | #3291ff | 信息 |

### 间距

| Token | 值 | 说明 |
|-------|-----|------|
| --spacing-xs | 4px | 超小间距 |
| --spacing-sm | 8px | 小间距 |
| --spacing-md | 16px | 中间距 |
| --spacing-lg | 24px | 大间距 |
| --spacing-xl | 32px | 超大间距 |

### 字号

| Token | 值 | 说明 |
|-------|-----|------|
| --font-size-xs | 12px | 超小字号 |
| --font-size-sm | 14px | 小字号 |
| --font-size-md | 16px | 中字号 |
| --font-size-lg | 18px | 大字号 |
| --font-size-xl | 20px | 超大字号 |

### 圆角

| Token | 值 | 说明 |
|-------|-----|------|
| --radius-sm | 4px | 小圆角 |
| --radius-md | 6px | 中圆角 |
| --radius-lg | 8px | 大圆角 |
| --radius-button | 6px | 按钮圆角 |
| --radius-card | 8px | 卡片圆角 |

### 阴影

| Token | 亮色模式 | 暗色模式 | 说明 |
|-------|---------|---------|------|
| --shadow-sm | 0 1px 2px rgba(0,0,0,0.04) | 0 1px 2px rgba(0,0,0,0.4) | 小阴影 |
| --shadow-md | 0 2px 8px rgba(0,0,0,0.08) | 0 2px 8px rgba(0,0,0,0.5) | 中阴影 |
| --shadow-lg | 0 8px 24px rgba(0,0,0,0.12) | 0 8px 24px rgba(0,0,0,0.6) | 大阴影 |

### 动效

| Token | 值 | 说明 |
|-------|-----|------|
| --duration-fast | 150ms | 快速动画 |
| --duration-normal | 250ms | 常规动画 |
| --duration-slow | 400ms | 慢速动画 |
| --easing-standard | cubic-bezier(0.4, 0, 0.2, 1) | 标准缓动 |
| --easing-spring | cubic-bezier(0.16, 1, 0.3, 1) | 弹性缓动 |

---

## CSS 变量定义块

```css
/* Vercel 亮色模式 */
:root[data-theme="vercel"] {
  /* 颜色 */
  --color-primary: #000000;
  --color-primary-hover: #171717;
  --color-primary-active: #333333;
  --color-bg: #FFFFFF;
  --color-bg-elevated: #FFFFFF;
  --color-bg-subtle: #FAFAFA;
  --color-text: #171717;
  --color-text-secondary: #666666;
  --color-text-inverse: #FFFFFF;
  --color-text-disabled: #999999;
  --color-border: #EAEAEA;
  --color-border-subtle: #FAFAFA;
  --color-success: #0070f3;
  --color-warning: #f5a623;
  --color-error: #e00;
  --color-info: #0070f3;

  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* 字号 */
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-button: 6px;
  --radius-card: 8px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

  /* 动效 */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-spring: cubic-bezier(0.16, 1, 0.3, 1);
}

/* Vercel 暗色模式 */
:root[data-theme="vercel"][data-mode="dark"] {
  /* 颜色 */
  --color-primary: #FFFFFF;
  --color-primary-hover: #EAEAEA;
  --color-primary-active: #D4D4D4;
  --color-bg: #000000;
  --color-bg-elevated: #0A0A0A;
  --color-bg-subtle: #0A0A0A;
  --color-text: #EDEDED;
  --color-text-secondary: #A1A1A1;
  --color-text-inverse: #000000;
  --color-text-disabled: #525252;
  --color-border: #333333;
  --color-border-subtle: #1A1A1A;
  --color-success: #0070f3;
  --color-warning: #f5a623;
  --color-error: #ff0000;
  --color-info: #3291ff;

  /* 阴影（暗色模式下阴影更深） */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);
}
```
