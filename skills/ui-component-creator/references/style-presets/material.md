# Material Design 风格预设

> Material 是隐喻——以纸张与墨水的物理感构建可信的数字界面。

---

## 设计理念

Material Design 是 Google 推出的跨平台设计系统，其核心隐喻是"Material（材质）"——一种具有物理属性的虚拟纸张，能够承载内容、响应触摸、产生阴影。设计语言强调表面（Surface）、边缘（Edge）、阴影（Elevation）的物理感，通过 z 轴高度（elevation）构建出可信的层级关系，让用户直观理解元素的优先级与可交互性。

在视觉特征上，Material 采用 Roboto 字体为根基，配合动态色彩（Dynamic Color）体系，主色为 Material 紫（#6200EE），辅以功能色（成功绿、警告橙、错误红、信息蓝）。圆角较为丰富，按钮采用胶囊形（20px 圆角），卡片与容器使用中等圆角，营造出柔和而现代的触感。阴影是 Material 的灵魂，通过多层阴影模拟真实光照下的物理投影。

动效方面，Material 强调有意义的动效（Meaningful Motion），每个动画都应服务于功能与层级表达，使用 `cubic-bezier(0.2, 0, 0, 1)` 这类标准缓动曲线，时长遵循 Material 的动效时长规范（150ms~475ms），传递出一种自然、流畅、富有物理感的交互体验。该风格适用于跨平台应用、Android 原生应用、以及希望传递现代、统一、可访问气质的产品界面。

---

## Token 定义

### 颜色

| Token | 亮色模式 | 暗色模式 | 说明 |
|-------|---------|---------|------|
| --color-primary | #6200EE | #BB86FC | 主色（Material 紫） |
| --color-primary-hover | #7C1FE8 | #C595FD | 主色悬停 |
| --color-primary-active | #5600E0 | #A970F8 | 主色按下 |
| --color-bg | #FFFFFF | #121212 | 背景 |
| --color-bg-elevated | #FFFFFF | #1E1E1E | 提升背景（卡片等） |
| --color-bg-subtle | #F5F5F5 | #2C2C2C | 次级背景 |
| --color-text | #212121 | #FFFFFF | 主文本 |
| --color-text-secondary | #757575 | #B0B0B0 | 次级文本 |
| --color-text-inverse | #FFFFFF | #000000 | 反色文本 |
| --color-text-disabled | #BDBDBD | #616161 | 禁用文本 |
| --color-border | #E0E0E0 | #424242 | 边框 |
| --color-border-subtle | #EEEEEE | #303030 | 次级边框 |
| --color-success | #4CAF50 | #66BB6A | 成功 |
| --color-warning | #FF9800 | #FFB74D | 警告 |
| --color-error | #F44336 | #EF5350 | 错误 |
| --color-info | #2196F3 | #64B5F6 | 信息 |

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
| --font-size-xs | 12px | 超小字号（caption） |
| --font-size-sm | 14px | 小字号（body 2） |
| --font-size-md | 16px | 中字号（body 1） |
| --font-size-lg | 18px | 大字号（title） |
| --font-size-xl | 22px | 超大字号（headline） |

### 圆角

| Token | 值 | 说明 |
|-------|-----|------|
| --radius-sm | 4px | 小圆角 |
| --radius-md | 8px | 中圆角 |
| --radius-lg | 16px | 大圆角 |
| --radius-button | 20px | 按钮圆角（胶囊形） |
| --radius-card | 12px | 卡片圆角 |

### 阴影

| Token | 亮色模式 | 暗色模式 | 说明 |
|-------|---------|---------|------|
| --shadow-sm | 0 1px 2px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06) | 0 1px 2px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3) | 小阴影（dp1） |
| --shadow-md | 0 3px 6px rgba(0,0,0,0.10), 0 3px 6px rgba(0,0,0,0.08) | 0 3px 6px rgba(0,0,0,0.5), 0 3px 6px rgba(0,0,0,0.4) | 中阴影（dp4） |
| --shadow-lg | 0 10px 20px rgba(0,0,0,0.15), 0 6px 6px rgba(0,0,0,0.12) | 0 10px 20px rgba(0,0,0,0.6), 0 6px 6px rgba(0,0,0,0.5) | 大阴影（dp8） |

### 动效

| Token | 值 | 说明 |
|-------|-----|------|
| --duration-fast | 150ms | 快速动画 |
| --duration-normal | 300ms | 常规动画 |
| --duration-slow | 475ms | 慢速动画 |
| --easing-standard | cubic-bezier(0.2, 0, 0, 1) | 标准缓动（decelerate） |
| --easing-spring | cubic-bezier(0.4, 0, 0.2, 1) | 弹性缓动（standard） |

---

## CSS 变量定义块

```css
/* Material Design 亮色模式 */
:root[data-theme="material"] {
  /* 颜色 */
  --color-primary: #6200EE;
  --color-primary-hover: #7C1FE8;
  --color-primary-active: #5600E0;
  --color-bg: #FFFFFF;
  --color-bg-elevated: #FFFFFF;
  --color-bg-subtle: #F5F5F5;
  --color-text: #212121;
  --color-text-secondary: #757575;
  --color-text-inverse: #FFFFFF;
  --color-text-disabled: #BDBDBD;
  --color-border: #E0E0E0;
  --color-border-subtle: #EEEEEE;
  --color-success: #4CAF50;
  --color-warning: #FF9800;
  --color-error: #F44336;
  --color-info: #2196F3;

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
  --font-size-xl: 22px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-button: 20px;
  --radius-card: 12px;

  /* 阴影（Material 多层投影） */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 3px 6px rgba(0, 0, 0, 0.10), 0 3px 6px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.15), 0 6px 6px rgba(0, 0, 0, 0.12);

  /* 动效 */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 475ms;
  --easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --easing-spring: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Material Design 暗色模式 */
:root[data-theme="material"][data-mode="dark"] {
  /* 颜色 */
  --color-primary: #BB86FC;
  --color-primary-hover: #C595FD;
  --color-primary-active: #A970F8;
  --color-bg: #121212;
  --color-bg-elevated: #1E1E1E;
  --color-bg-subtle: #2C2C2C;
  --color-text: #FFFFFF;
  --color-text-secondary: #B0B0B0;
  --color-text-inverse: #000000;
  --color-text-disabled: #616161;
  --color-border: #424242;
  --color-border-subtle: #303030;
  --color-success: #66BB6A;
  --color-warning: #FFB74D;
  --color-error: #EF5350;
  --color-info: #64B5F6;

  /* 阴影（暗色模式下阴影更深） */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 3px 6px rgba(0, 0, 0, 0.5), 0 3px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.6), 0 6px 6px rgba(0, 0, 0, 0.5);
}
```
