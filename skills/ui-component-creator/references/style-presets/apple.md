# Apple HIG 风格预设

> 清晰、顺应、深度——以克制的设计语言让内容本身成为主角。

---

## 设计理念

Apple Human Interface Guidelines（人机交互指南）是 iOS、macOS、iPadOS 等平台共通的设计语言，其核心三原则为：**Clarity（清晰）**、**Deference（顺应）**、**Depth（深度）**。清晰意味着元素易于辨识、文字易于阅读；顺应意味着 UI 应让位于内容，不喧宾夺主；深度则通过层级、动画与光影构建出可信的空间关系。

在视觉特征上，Apple 风格采用克制的色彩体系，以系统色（蓝、绿、橙、红）作为强调，背景大量使用半透明与毛玻璃（Vibrancy）效果，让界面在保持信息密度的同时不失通透感。圆角较大且统一，按钮、卡片、弹窗遵循一致的曲率语言，营造出柔和而精致的触感。

动效方面，Apple 强调自然流畅的物理感动画，使用 `cubic-bezier(0.25, 0.1, 0.25, 1)` 这类接近弹簧与惯性的缓动曲线，过渡时间适中，避免突兀的跳变。该风格适用于面向消费者的高品质应用、内容型产品、以及希望传递精致与可信赖感的品牌界面。

---

## Token 定义

### 颜色

| Token | 亮色模式 | 暗色模式 | 说明 |
|-------|---------|---------|------|
| --color-primary | #007AFF | #0A84FF | 主色（系统蓝） |
| --color-primary-hover | #0066CC | #007AFF | 主色悬停 |
| --color-primary-active | #0055AA | #0066CC | 主色按下 |
| --color-bg | #FFFFFF | #000000 | 背景 |
| --color-bg-elevated | #F2F2F7 | #1C1C1E | 提升背景（卡片等） |
| --color-bg-subtle | #F2F2F7 | #2C2C2E | 次级背景 |
| --color-text | #000000 | #FFFFFF | 主文本 |
| --color-text-secondary | #3C3C43 | #EBEBF5 | 次级文本 |
| --color-text-inverse | #FFFFFF | #000000 | 反色文本 |
| --color-text-disabled | #3C3C4333 | #EBEBF533 | 禁用文本 |
| --color-border | #3C3C4329 | #54545899 | 边框 |
| --color-border-subtle | #3C3C4314 | #54545866 | 次级边框 |
| --color-success | #34C759 | #30D158 | 成功（系统绿） |
| --color-warning | #FF9500 | #FF9F0A | 警告（系统橙） |
| --color-error | #FF3B30 | #FF453A | 错误（系统红） |
| --color-info | #5AC8FA | #64D2FF | 信息（系统青） |

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
| --font-size-xs | 11px | 超小字号（caption） |
| --font-size-sm | 13px | 小字号（footnote） |
| --font-size-md | 15px | 中字号（body） |
| --font-size-lg | 17px | 大字号（headline） |
| --font-size-xl | 20px | 超大字号（title） |

### 圆角

| Token | 值 | 说明 |
|-------|-----|------|
| --radius-sm | 6px | 小圆角 |
| --radius-md | 10px | 中圆角 |
| --radius-lg | 16px | 大圆角 |
| --radius-button | 8px | 按钮圆角 |
| --radius-card | 14px | 卡片圆角 |

### 阴影

| Token | 亮色模式 | 暗色模式 | 说明 |
|-------|---------|---------|------|
| --shadow-sm | 0 1px 3px rgba(0,0,0,0.06) | 0 1px 3px rgba(0,0,0,0.3) | 小阴影 |
| --shadow-md | 0 4px 12px rgba(0,0,0,0.10) | 0 4px 12px rgba(0,0,0,0.4) | 中阴影 |
| --shadow-lg | 0 12px 32px rgba(0,0,0,0.16) | 0 12px 32px rgba(0,0,0,0.5) | 大阴影 |

### 动效

| Token | 值 | 说明 |
|-------|-----|------|
| --duration-fast | 200ms | 快速动画 |
| --duration-normal | 350ms | 常规动画 |
| --duration-slow | 500ms | 慢速动画 |
| --easing-standard | cubic-bezier(0.25, 0.1, 0.25, 1) | 标准缓动 |
| --easing-spring | cubic-bezier(0.34, 1.56, 0.64, 1) | 弹性缓动 |

---

## CSS 变量定义块

```css
/* Apple HIG 亮色模式 */
:root[data-theme="apple"] {
  /* 颜色 */
  --color-primary: #007AFF;
  --color-primary-hover: #0066CC;
  --color-primary-active: #0055AA;
  --color-bg: #FFFFFF;
  --color-bg-elevated: #F2F2F7;
  --color-bg-subtle: #F2F2F7;
  --color-text: #000000;
  --color-text-secondary: #3C3C43;
  --color-text-inverse: #FFFFFF;
  --color-text-disabled: rgba(60, 60, 67, 0.2);
  --color-border: rgba(60, 60, 67, 0.16);
  --color-border-subtle: rgba(60, 60, 67, 0.08);
  --color-success: #34C759;
  --color-warning: #FF9500;
  --color-error: #FF3B30;
  --color-info: #5AC8FA;

  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* 字号 */
  --font-size-xs: 11px;
  --font-size-sm: 13px;
  --font-size-md: 15px;
  --font-size-lg: 17px;
  --font-size-xl: 20px;

  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-button: 8px;
  --radius-card: 14px;

  /* 阴影 */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.10);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.16);

  /* 动效 */
  --duration-fast: 200ms;
  --duration-normal: 350ms;
  --duration-slow: 500ms;
  --easing-standard: cubic-bezier(0.25, 0.1, 0.25, 1);
  --easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Apple HIG 暗色模式 */
:root[data-theme="apple"][data-mode="dark"] {
  /* 颜色 */
  --color-primary: #0A84FF;
  --color-primary-hover: #007AFF;
  --color-primary-active: #0066CC;
  --color-bg: #000000;
  --color-bg-elevated: #1C1C1E;
  --color-bg-subtle: #2C2C2E;
  --color-text: #FFFFFF;
  --color-text-secondary: #EBEBF5;
  --color-text-inverse: #000000;
  --color-text-disabled: rgba(235, 235, 245, 0.2);
  --color-border: rgba(84, 84, 88, 0.6);
  --color-border-subtle: rgba(84, 84, 88, 0.4);
  --color-success: #30D158;
  --color-warning: #FF9F0A;
  --color-error: #FF453A;
  --color-info: #64D2FF;

  /* 阴影（暗色模式下阴影更深） */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.5);
}
```
