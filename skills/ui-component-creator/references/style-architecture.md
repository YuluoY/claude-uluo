# 三层样式架构

UI 组件库的样式分为三层：结构层、语义层、风格层。三层分离实现样式与结构解耦，切换风格时零代码改动。

---

## 一、三层模型

### 结构层（Structural）

组件固有的布局、尺寸、定位，与视觉风格无关。

**特征：**
- 不随风格变化（Modal 的居中定位在任何风格下都一样）
- 用固定值或独立的结构 token
- 不被风格预设覆盖

**示例：**
- Modal 的 `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`
- Table 的 `display: table; border-collapse: collapse`
- Flex 布局的 `display: flex; flex-direction: column`

```css
/* 结构层示例：Modal 的定位与布局 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
```

### 语义层（Semantic）

语义化 CSS 变量，与风格解耦。组件代码只引用这一层。

**命名规范：**
- 颜色：`--color-primary`、`--color-bg`、`--color-text`、`--color-border`、`--color-success`、`--color-error`
- 间距：`--spacing-xs`、`--spacing-sm`、`--spacing-md`、`--spacing-lg`、`--spacing-xl`
- 字号：`--font-size-xs`、`--font-size-sm`、`--font-size-md`、`--font-size-lg`、`--font-size-xl`
- 圆角：`--radius-sm`、`--radius-md`、`--radius-lg`、`--radius-button`、`--radius-card`
- 阴影：`--shadow-sm`、`--shadow-md`、`--shadow-lg`
- 动效：`--duration-fast`、`--duration-normal`、`--duration-slow`、`--easing-standard`
- z-index：`--z-dropdown`、`--z-modal`、`--z-toast`

**示例：**
```css
.button {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-button);
  font-size: var(--font-size-md);
  transition: background var(--duration-fast) var(--easing-standard);
}
```

### 风格层（Thematic）

具体 token 值，由风格预设文件提供。组件不实现这一层。

**来源：** `references/style-presets/` 目录下的预设文件（apple.md / vercel.md / github.md / material.md）

**示例（Apple 风格）：**
```css
:root[data-theme="apple"] {
  --color-primary: #007AFF;
  --color-bg: #FFFFFF;
  --color-text: #1D1D1F;
  --color-border: #D2D2D7;
  --color-success: #34C759;
  --color-error: #FF3B30;
  --color-text-inverse: #FFFFFF;

  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-button: 12px;
  --radius-card: 16px;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.16);

  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --easing-standard: cubic-bezier(0.4, 0, 0.2, 1);

  --z-dropdown: 1000;
  --z-modal: 1100;
  --z-toast: 1200;
}
```

---

## 二、结构层 vs 语义层判定规则

### 判定核心问题

**「这个样式在不同风格下会变吗？」**
- 会变 → 语义层
- 不变 → 结构层

### 常见样式分类表

| 样式类别 | 归属 | 理由 |
|---------|------|------|
| `display`（flex/block/grid） | 结构层 | 布局方式不随风格变化 |
| `position`（fixed/absolute） | 结构层 | 定位方式是组件固有特性 |
| `flex-direction` | 结构层 | 主轴方向是布局决策 |
| `align-items` / `justify-content` | 结构层 | 对齐方式是布局决策 |
| `width` / `height`（固定值） | 结构层 | 尺寸通常不随风格变化 |
| `max-width` / `max-height` | 结构层 | 约束条件是结构性的 |
| `color` | 语义层 | 颜色随风格变化 |
| `background` | 语义层 | 背景色随风格变化 |
| `border-color` | 语义层 | 边框色随风格变化 |
| `padding` / `margin` | 语义层 | 间距随风格变化（密集 vs 疏松） |
| `font-size` | 语义层 | 字号随风格变化 |
| `font-weight` | 语义层 | 字重随风格变化 |
| `border-radius` | 语义层 | 圆角随风格变化（锐利 vs 圆润） |
| `box-shadow` | 语义层 | 阴影随风格变化 |
| `transition` | 语义层 | 动效随风格变化 |
| `z-index` | 语义层 | 层级是语义化的（用 token 管理） |

### 边界案例处理

**案例 1：border-width 是结构层还是语义层？**

取决于风格是否改变边框粗细：
- 如果所有风格下边框都是 1px → 结构层（固定值）
- 如果 Apple 风格用 1px，Material 风格用 2px → 语义层（token：`--border-width-sm`）

**案例 2：opacity 是结构层还是语义层？**

- 禁用态的 `opacity: 0.5` → 语义层（用 `--opacity-disabled` token，因为不同风格可能用不同方式表达禁用）
- 装饰性叠加层的 `opacity: 0.8` → 结构层（固定值，不随风格变化）

**案例 3：line-height 是结构层还是语义层？**

- 通常归语义层（用 `--line-height-tight` / `--line-height-normal` / `--line-height-relaxed` token），因为不同风格可能有不同的行高偏好
- 但如果组件有特定的行高需求（如单行文本截断的 `line-height: 1`），可归结构层

**案例 4：transform 是结构层还是语义层？**

- 居中定位的 `transform: translate(-50%, -50%)` → 结构层（定位方式不随风格变化）
- 悬停效果的 `transform: scale(1.05)` → 语义层（动效随风格变化）

### 判定流程图

```
样式属性
├── 是否与布局/定位/尺寸相关？
│   ├── 是 → 结构层（用固定值）
│   └── 否 → 是否与视觉表现相关（颜色/间距/字号/圆角/阴影/动效）？
│       ├── 是 → 语义层（用 var(--token)）
│       └── 否 → 边界案例，按「不同风格下会变吗」判定
```

---

## 三、风格切换机制

### 方式 1：CSS 变量覆盖（推荐，框架无关）

通过 `data-theme` 属性切换 CSS 变量，组件代码无需感知当前主题。

**实现步骤：**
1. 定义各风格的 CSS 变量集
2. 在根元素设置 `data-theme` 属性
3. 组件代码只引用语义 token

```html
<!-- HTML -->
<html data-theme="apple">
  <body>
    <div class="button">点击</div>
  </body>
</html>

<!-- 切换主题 -->
<button onclick="document.documentElement.dataset.theme = 'vercel'">
  切换到 Vercel 风格
</button>
```

```css
/* 风格预设文件：apple.css */
:root[data-theme="apple"] {
  --color-primary: #007AFF;
  --radius-button: 12px;
  --spacing-md: 16px;
}

/* 风格预设文件：vercel.css */
:root[data-theme="vercel"] {
  --color-primary: #000000;
  --radius-button: 6px;
  --spacing-md: 12px;
}

/* 组件样式：只引用语义 token */
.button {
  background: var(--color-primary);
  border-radius: var(--radius-button);
  padding: var(--spacing-sm) var(--spacing-md);
}
```

**优点：**
- 框架无关（Vue/React/Web Component 通用）
- 零 JS 运行时开销
- 支持 SSR
- 浏览器原生支持

### 方式 2：Theme Provider（React）

通过 React Context 提供主题，组件通过 hook 获取 token 值。

```tsx
import React, { createContext, useContext } from 'react';

interface Theme {
  colors: {
    primary: string;
    bg: string;
    text: string;
  };
  spacing: {
    sm: string;
    md: string;
  };
  radius: {
    button: string;
  };
}

const themes: Record<string, Theme> = {
  apple: {
    colors: { primary: '#007AFF', bg: '#FFFFFF', text: '#1D1D1F' },
    spacing: { sm: '8px', md: '16px' },
    radius: { button: '12px' },
  },
  vercel: {
    colors: { primary: '#000000', bg: '#FFFFFF', text: '#000000' },
    spacing: { sm: '6px', md: '12px' },
    radius: { button: '6px' },
  },
};

const ThemeContext = createContext<Theme>(themes.apple);

export const ThemeProvider: React.FC<{
  theme: keyof typeof themes;
  children: React.ReactNode;
}> = ({ theme, children }) => (
  <ThemeContext.Provider value={themes[theme]}>
    {children}
  </ThemeContext.Provider>
);

export const useTheme = () => useContext(ThemeContext);

// 组件使用
const Button: React.FC = ({ children }) => {
  const theme = useTheme();
  return (
    <button
      style={{
        background: theme.colors.primary,
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        borderRadius: theme.radius.button,
      }}
    >
      {children}
    </button>
  );
};

// 使用
<ThemeProvider theme="apple">
  <Button>点击</Button>
</ThemeProvider>
```

**优点：**
- TypeScript 类型安全
- 主题可动态计算（如根据用户偏好调整）
- 与 React 生态深度集成

### 方式 3：CSS-in-JS 动态注入

通过 styled-components/emotion 动态注入主题。

```tsx
import styled, { ThemeProvider } from 'styled-components';

const theme = {
  apple: {
    colors: { primary: '#007AFF', text: '#1D1D1F' },
    spacing: { sm: '8px', md: '16px' },
    radius: { button: '12px' },
  },
  vercel: {
    colors: { primary: '#000000', text: '#000000' },
    spacing: { sm: '6px', md: '12px' },
    radius: { button: '6px' },
  },
};

const StyledButton = styled.button`
  background: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.radius.button};
  border: none;
  cursor: pointer;
`;

const App = () => (
  <ThemeProvider theme={theme.apple}>
    <StyledButton>点击</StyledButton>
  </ThemeProvider>
);
```

**优点：**
- 动态样式能力强
- 样式与组件同文件，便于维护
- 支持 props 驱动的样式变化

**注意：** CSS-in-JS 方式有运行时开销，SSR 需要额外配置。推荐优先使用方式 1（CSS 变量）。

---

## 四、三层分离代码示例

### Vue 3 示例

```vue
<template>
  <button
    class="btn"
    :class="[`btn--${variant}`, { 'btn--disabled': disabled }]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  disabled: false,
});
</script>

<style scoped>
/* 结构层：布局与尺寸，固定值 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
  min-width: 64px;
  height: 36px;
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
}

/* 语义层：引用语义 token */
.btn--primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-color: var(--color-primary);
}

.btn--secondary {
  background: var(--color-bg);
  color: var(--color-text);
  border-color: var(--color-border);
}

.btn--ghost {
  background: transparent;
  color: var(--color-primary);
  border-color: transparent;
}

/* 语义层：间距、圆角、字号 */
.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-button);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  transition: all var(--duration-fast) var(--easing-standard);
}

.btn:hover:not(.btn--disabled) {
  box-shadow: var(--shadow-sm);
}

.btn--disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

/* 风格层：不在组件中实现，由 references/style-presets/ 提供 */
</style>
```

**配套的风格预设文件（apple.css）：**
```css
:root[data-theme="apple"] {
  --color-primary: #007AFF;
  --color-bg: #FFFFFF;
  --color-text: #1D1D1F;
  --color-text-inverse: #FFFFFF;
  --color-border: #D2D2D7;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --radius-button: 12px;
  --font-size-md: 16px;
  --font-weight-medium: 500;
  --duration-fast: 150ms;
  --easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --opacity-disabled: 0.5;
}
```

### React 示例

```tsx
import React from 'react';
import './Button.css';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  disabled = false,
  children,
  onClick,
}) => {
  const classNames = ['btn', `btn--${variant}`];
  if (disabled) classNames.push('btn--disabled');

  return (
    <button
      className={classNames.join(' ')}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
```

```css
/* Button.css */
/* 结构层 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
  min-width: 64px;
  height: 36px;
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
}

/* 语义层 */
.btn--primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-color: var(--color-primary);
}

.btn--secondary {
  background: var(--color-bg);
  color: var(--color-text);
  border-color: var(--color-border);
}

.btn--ghost {
  background: transparent;
  color: var(--color-primary);
  border-color: transparent;
}

.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-button);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  transition: all var(--duration-fast) var(--easing-standard);
}

.btn:hover:not(.btn--disabled) {
  box-shadow: var(--shadow-sm);
}

.btn--disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}
```

### Web Component 示例

```typescript
class MyButton extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'disabled'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <button class="btn">
        <slot></slot>
      </button>
    `;

    const style = document.createElement('style');
    style.textContent = `
      /* 结构层 */
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        box-sizing: border-box;
        min-width: 64px;
        height: 36px;
        border: 1px solid transparent;
        cursor: pointer;
        user-select: none;
      }

      /* 语义层：引用全局 CSS 变量（穿透 Shadow DOM） */
      .btn {
        background: var(--color-primary, #007AFF);
        color: var(--color-text-inverse, #FFFFFF);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border-radius: var(--radius-button, 12px);
        font-size: var(--font-size-md, 16px);
        transition: all var(--duration-fast, 150ms) var(--easing-standard, ease);
      }

      :host([variant="secondary"]) .btn {
        background: var(--color-bg, #FFFFFF);
        color: var(--color-text, #1D1D1F);
        border-color: var(--color-border, #D2D2D7);
      }

      :host([variant="ghost"]) .btn {
        background: transparent;
        color: var(--color-primary, #007AFF);
        border-color: transparent;
      }

      :host([disabled]) .btn {
        opacity: var(--opacity-disabled, 0.5);
        cursor: not-allowed;
      }
    `;
    shadow.appendChild(style);
  }
}

customElements.define('my-button', MyButton);
```

**注意：** Web Component 的 Shadow DOM 默认隔离样式，CSS 变量可穿透 Shadow DOM（通过 `:host` 和继承）。需为变量提供默认值，避免在未定义主题时样式异常。

---

## 五、业务层样式继承规则

业务层组件组合原子层组件时，样式继承规则：

### 规则 1：继承语义 token

业务层组件直接使用原子层已定义的语义 token，不重新定义。

```css
/* ✅ 好：业务层直接使用语义 token */
.user-select {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);  /* 继承原子层语义 token */
}

.user-select__label {
  font-size: var(--font-size-sm);  /* 继承原子层语义 token */
  color: var(--color-text);  /* 继承原子层语义 token */
}
```

### 规则 2：可定义业务 token

业务层可定义业务语义 token，但值必须引用语义层。

```css
/* 业务层定义业务 token */
.user-profile-card {
  --color-user-avatar-border: var(--color-border);
  --color-user-status-online: var(--color-success);
  --color-user-status-offline: var(--color-text-secondary);
  --spacing-user-avatar-size: 48px;
}

.user-profile-card__avatar {
  border: 2px solid var(--color-user-avatar-border);
  width: var(--spacing-user-avatar-size);
  height: var(--spacing-user-avatar-size);
}
```

### 规则 3：不覆盖结构层

业务层不覆盖原子层组件的结构层样式。

```css
/* ❌ 坏：覆盖原子层 Input 的结构层 */
.user-select .atomic-input {
  display: block;  /* 覆盖了 Input 的 inline-flex 结构 */
  height: auto;    /* 覆盖了 Input 的固定高度 */
}

/* ✅ 好：业务层只补充布局，不修改原子层内部 */
.user-select {
  display: flex;
  flex-direction: column;
}
```

### 规则 4：不引入硬编码

业务层不引入新的硬编码值。

```css
/* ❌ 坏：业务层引入硬编码 */
.user-select {
  gap: 8px;              /* 硬编码 */
  color: #1D1D1F;        /* 硬编码 */
  border-radius: 12px;   /* 硬编码 */
}

/* ✅ 好：使用语义 token */
.user-select {
  gap: var(--spacing-sm);
  color: var(--color-text);
  border-radius: var(--radius-md);
}
```

### 业务层样式继承完整示例

```vue
<template>
  <div class="user-profile-card">
    <AtomicAvatar
      :src="user.avatar"
      :size="48"
      class="user-profile-card__avatar"
    />
    <div class="user-profile-card__info">
      <span class="user-profile-card__name">{{ user.name }}</span>
      <span class="user-profile-card__status" :class="`is-${user.status}`">
        {{ statusText }}
      </span>
    </div>
    <AtomicButton
      variant="ghost"
      size="sm"
      @click="$emit('edit')"
    >
      编辑
    </AtomicButton>
  </div>
</template>

<style scoped>
/* 业务层 token：值引用语义层 */
.user-profile-card {
  --color-user-avatar-border: var(--color-border);
  --color-user-status-online: var(--color-success);
  --color-user-status-offline: var(--color-text-secondary);

  /* 结构层：布局 */
  display: flex;
  align-items: center;
  gap: var(--spacing-md);

  /* 语义层：引用 token */
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
}

.user-profile-card__avatar {
  border: 2px solid var(--color-user-avatar-border);
  flex-shrink: 0;
}

.user-profile-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  flex: 1;
  min-width: 0;
}

.user-profile-card__name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-profile-card__status {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.user-profile-card__status.is-online {
  color: var(--color-user-status-online);
}

.user-profile-card__status.is-offline {
  color: var(--color-user-status-offline);
}
</style>
```

---

## 六、风格预设兼容性

组件应声明兼容的风格预设。验证方法：

### 验证流程

1. **逐个应用每个风格预设**：在测试环境中切换 `data-theme` 属性
2. **检查组件 UI 是否正确渲染**：视觉检查 + 快照对比
3. **检查是否有硬编码值导致风格切换异常**：通过代码审查 + 自动化扫描
4. **至少兼容 2 种预设才算通过**：最低要求 2 种，推荐兼容全部 4 种

### 兼容性声明

组件 README 中应声明兼容性：

```markdown
## 风格预设兼容性

| 预设 | 兼容 | 备注 |
|------|------|------|
| Apple | ✅ | 完整支持 |
| Vercel | ✅ | 完整支持 |
| GitHub | ✅ | 完整支持 |
| Material | ⚠️ | 部分支持（阴影效果有差异） |
```

### 风格切换测试示例

```typescript
// 风格切换测试
import { render } from '@testing-library/vue';
import Button from '@/components/Button/Button.vue';

const themes = ['apple', 'vercel', 'github', 'material'];

describe('Button 风格预设兼容性', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  themes.forEach((theme) => {
    it(`在 ${theme} 风格下正确渲染`, () => {
      document.documentElement.dataset.theme = theme;
      const { container } = render(Button, {
        props: { variant: 'primary' },
      });

      const button = container.querySelector('.btn');
      expect(button).toBeTruthy();

      // 检查是否使用了语义 token（而非硬编码值）
      const styles = window.getComputedStyle(button);
      expect(styles.background).not.toBe('rgb(24, 144, 255)');  // 不应是硬编码的 #1890ff
    });
  });

  it('切换风格时样式更新', async () => {
    document.documentElement.dataset.theme = 'apple';
    const { container, rerender } = render(Button, {
      props: { variant: 'primary' },
    });

    const button = container.querySelector('.btn') as HTMLElement;
    const appleBackground = window.getComputedStyle(button).background;

    document.documentElement.dataset.theme = 'vercel';
    await rerender({});

    const vercelBackground = window.getComputedStyle(button).background;
    expect(vercelBackground).not.toBe(appleBackground);
  });
});
```

### 硬编码值扫描

```typescript
// 扫描组件样式中的硬编码值
const fs = require('fs');
const path = require('path');

function scanHardcodedValues(componentPath: string): string[] {
  const content = fs.readFileSync(componentPath, 'utf-8');
  const issues: string[] = [];

  // 匹配硬编码颜色
  const colorRegex = /#[0-9a-fA-F]{3,8}|rgb\(|rgba\(/g;
  // 匹配硬编码间距（px 值，排除 0 和 1px 边框）
  const spacingRegex = /(?<!\d)([2-9]|[1-9]\d+)px/g;

  const styleMatches = content.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || [];
  styleMatches.forEach((styleBlock) => {
    // 排除 var() 引用
    const cleaned = styleBlock.replace(/var\([^)]+\)/g, '');

    if (colorRegex.test(cleaned)) {
      issues.push(`${componentPath}: 发现硬编码颜色`);
    }
    const spacingMatches = cleaned.match(spacingRegex);
    if (spacingMatches) {
      issues.push(`${componentPath}: 发现硬编码间距 ${spacingMatches.join(', ')}`);
    }
  });

  return issues;
}
```

### 常见兼容性问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 切换风格后颜色不变 | 使用了硬编码颜色 | 替换为 `var(--color-*)` |
| 切换风格后间距不变 | 使用了硬编码 px 值 | 替换为 `var(--spacing-*)` |
| 切换风格后圆角不变 | 使用了硬编码 border-radius | 替换为 `var(--radius-*)` |
| 某些风格下对比度不足 | token 值设计不合理 | 调整风格预设的 token 值 |
| Shadow DOM 内样式不切换 | Web Component 未引用全局变量 | 使用 `:host` 并提供默认值 |
