# GitHub 风格预设

> 实用主义、信息密度、中性色调——为开发者构建可长时间阅读的界面。

---

## 设计理念

GitHub 的设计语言服务于开发者这一核心用户群体，强调实用主义、信息密度与可读性。其视觉系统以 Mona Sans 字体为根基，配合柔和的中性色调与清晰的层级关系，构建出一种既能承载高密度信息、又能保持长时间阅读舒适感的界面风格。

在色彩使用上，GitHub 采用中性灰为主调，以 GitHub 蓝（#0969DA）作为主要强调色，配合功能色（成功绿、警告黄、错误红）形成清晰的语义体系。背景色在亮色模式下偏冷白（#FFFFFF / #F6F8FA），暗色模式下偏深蓝黑（#0D1117 / #161B22），既保证对比度又避免刺眼。边框与分隔线柔和但清晰，让信息层级一目了然。

动效方面，GitHub 偏好快速、克制的过渡，使用 `cubic-bezier(0.2, 0, 0, 1)` 这类接近线性减速的缓动曲线，时长较短（120ms~350ms），传递出一种即时响应、不干扰专注的工程效率感。该风格适用于开发者工具、代码托管平台、技术文档站点，以及需要承载高密度信息且面向技术用户的产品界面。

---

## Token 定义

### 颜色

| Token | 亮色模式 | 暗色模式 | 说明 |
|-------|---------|---------|------|
| --color-primary | #0969DA | #2F81F7 | 主色（GitHub 蓝） |
| --color-primary-hover | #0860CA | #4493F8 | 主色悬停 |
| --color-primary-active | #0757BA | #1F6FEB | 主色按下 |
| --color-bg | #FFFFFF | #0D1117 | 背景 |
| --color-bg-elevated | #FFFFFF | #161B22 | 提升背景（卡片等） |
| --color-bg-subtle | #F6F8FA | #161B22 | 次级背景 |
| --color-text | #24292F | #C9D1D9 | 主文本 |
| --color-text-secondary | #57606A | #8B949E | 次级文本 |
| --color-text-inverse | #FFFFFF | #0D1117 | 反色文本 |
| --color-text-disabled | #8C959F | #484F58 | 禁用文本 |
| --color-border | #D0D7DE | #30363D | 边框 |
| --color-border-subtle | #D8DEE4 | #21262D | 次级边框 |
| --color-success | #1A7F37 | #3FB950 | 成功 |
| --color-warning | #9A6700 | #D29922 | 警告 |
| --color-error | #CF222E | #F85149 | 错误 |
| --color-info | #0969DA | #2F81F7 | 信息 |

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
| --radius-lg | 12px | 大圆角 |
| --radius-button | 6px | 按钮圆角 |
| --radius-card | 8px | 卡片圆角 |

### 阴影

| Token | 亮色模式 | 暗色模式 | 说明 |
|-------|---------|---------|------|
| --shadow-sm | 0 1px 0px rgba(0,0,0,0.04) | 0 1px 0px rgba(0,0,0,0.3) | 小阴影 |
| --shadow-md | 0 3px 6px rgba(0,0,0,0.06) | 0 3px 6px rgba(0,0,0,0.4) | 中阴影 |
| --shadow-lg | 0 8px 24px rgba(0,0,0,0.12) | 0 8px 24px rgba(0,0,0,0.5) | 大阴影 |

### 动效

| Token | 值 | 说明 |
|-------|-----|------|
| --duration-fast | 120ms | 快速动画 |
| --duration-normal | 200ms | 常规动画 |
| --duration-slow | 350ms | 慢速动画 |
| --easing-standard | cubic-bezier(0.2, 0, 0, 1) | 标准缓动 |
| --easing-spring | cubic-bezier(0.2, 0, 0, 1.4) | 弹性缓动 |

---

## CSS 变量定义块

```css
/* GitHub 亮色模式 */
:root[data-theme="github"] {
  /* 颜色 */
  --color-primary: #0969DA;
  --color-primary-hover: #0860CA;
  --color-primary-active: #0757BA;
  --color-bg: #FFFFFF;
  --color-bg-elevated: #FFFFFF;
  --color-bg-subtle: #F6F8FA;
  --color-text: #24292F;
  --color-text-secondary: #57606A;
  --color-text-inverse: #FFFFFF;
  --color-text-disabled: #8C959F;
  --color-border: #D0D7DE;
  --color-border-subtle: #D8DEE4;
  --color-success: #1A7F37;
  --color-warning: #9A6700;
  --color-error: #CF222E;
  --color-info: #0969DA;

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
  --radius-lg: 12px;
  --radius-button: 6px;
  --radius-card: 8px;

  /* 阴影 */
  --shadow-sm: 0 1px 0px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 3px 6px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

  /* 动效 */
  --duration-fast: 120ms;
  --duration-normal: 200ms;
  --duration-slow: 350ms;
  --easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --easing-spring: cubic-bezier(0.2, 0, 0, 1.4);
}

/* GitHub 暗色模式 */
:root[data-theme="github"][data-mode="dark"] {
  /* 颜色 */
  --color-primary: #2F81F7;
  --color-primary-hover: #4493F8;
  --color-primary-active: #1F6FEB;
  --color-bg: #0D1117;
  --color-bg-elevated: #161B22;
  --color-bg-subtle: #161B22;
  --color-text: #C9D1D9;
  --color-text-secondary: #8B949E;
  --color-text-inverse: #0D1117;
  --color-text-disabled: #484F58;
  --color-border: #30363D;
  --color-border-subtle: #21262D;
  --color-success: #3FB950;
  --color-warning: #D29922;
  --color-error: #F85149;
  --color-info: #2F81F7;

  /* 阴影（暗色模式下阴影更深） */
  --shadow-sm: 0 1px 0px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 3px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
}
```
