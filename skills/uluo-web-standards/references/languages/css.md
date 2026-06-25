# CSS / SCSS 编码规范

**加载条件：** 任务涉及 CSS、SCSS、样式、主题、布局时加载。

> 参考：[Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html)、[web.dev/learn/css](https://web.dev/learn/css/)
> 格式（属性排序 Concentric、BEM 命名、禁止 `!important`）由 `stylelint` 处理（见 `assets/stylelint.config.mjs`）。
> 设计 Token 体系见 `references/infrastructure-setup.md`。Vue 样式 scoped 见 `references/languages/vue.md` §七。React SCSS Modules 见 `references/languages/react.md` §十一。

## 目录

- [一、方法论：BEM](#methodology-bem)
- [二、属性排序：Concentric](#property-order-concentric)
- [三、设计 Token](#design-tokens)
- [四、CSS 函数与高级变量](#css-functions-and-advanced-variables)
  - [var() — 回退值](#var-fallback)
  - [@property — 类型化变量](#property-typed-variables)
  - [light-dark() — 浅深色自动切换](#light-dark-auto-switch)
  - [calc() / min() / max() / clamp() — 响应式计算](#calc-min-max-clamp-responsive)
  - [minmax() — Grid 专用](#minmax-grid)
  - [color-mix() — 颜色混合](#color-mix)
- [五、CSS 嵌套（原生）](#css-nesting-native)
- [六、Cascade Layers（@layer）](#cascade-layers)
- [七、响应式](#responsive)
  - [移动优先](#mobile-first)
  - [Container Queries](#container-queries)
- [八、实用模式](#practical-patterns)
  - [布局：Flexbox / Grid](#layout-flexbox-grid)
  - [辅助类](#utility-classes)
  - [按需显示/隐藏](#show-hide)
  - [焦点样式](#focus-styles)
- [九、性能](#performance)
- [十、禁止事项](#prohibited)
- [十一、与框架的配合](#framework-integration)
  - [Vue](#vue)
  - [React](#react)
- [输出前自检](#output-checklist)

---

## 一、方法论：BEM

类名用 BEM 命名法：`block__element--modifier`。stylelint 正则已阻断：

```
^[a-z]([a-z0-9-]+)?(__([a-z][a-z0-9-]*?)?)?(--([a-z][a-z0-9-]*?)?)?$
```

```scss
// Block
.card {
  // Element
  &__header {}
  &__body {}
  &__footer {}

  // Modifier
  &--featured {}
  &--disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}
```

- Block（块）：独立可复用组件
- Element（元素）：块内部的组成部分
- Modifier（修饰）：块或元素的外观/状态变体

---

## 二、属性排序：Concentric

stylelint-order 自动排序 + `--fix` 修复。从外到内：

| 组 | 内容 | 示例属性 |
|---|---|---|
| 1. Positioning | 定位 | `position` `top` `right` `bottom` `left` `z-index` |
| 2. Display & Box Model | 盒模型 | `display` `flex/grid` `width` `height` `margin` `padding` `overflow` |
| 3. Typography | 排版 | `font` `line-height` `text-*` `color` |
| 4. Visual | 视觉 | `background` `border` `box-shadow` `opacity` |
| 5. Animation | 动效 | `transition` `transform` `animation` |
| 6. Misc | 其他 | `content` `cursor` `pointer-events` `user-select` |

```scss
.button {
  // 1. Positioning
  position: relative;

  // 2. Box Model
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);

  // 3. Typography
  font-size: var(--font-size-sm);
  color: var(--color-text);

  // 4. Visual
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-sm);

  // 5. Animation
  transition: background 0.2s ease;
}
```

---

## 三、设计 Token

所有颜色、间距、字号、圆角定义为 CSS 变量，集中放在 `styles/tokens/`：

```css
/* styles/tokens/colors.css */
:root {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-bg: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-text: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #d1d5db;
  --color-error: #dc2626;
  --color-success: #16a34a;
}

/* styles/tokens/spacing.css */
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}

/* styles/tokens/typography.css */
:root {
  --font-family: system-ui, -apple-system, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --line-height: 1.5;
}

/* styles/tokens/radius.css */
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

- 禁止硬编码色值（stylelint `color-no-hex` 项目级可配）
- SCSS 变量仅用于**局部计算**（如 `$size: calc(...)`），不存全局设计值
- 组件和业务代码只引用 CSS 变量

---

## 四、CSS 函数与高级变量

### `var()` — 回退值

变量未定义时用逗号提供回退：

```css
.button {
  color: var(--button-text, var(--color-text));
  background: var(--button-bg, var(--color-primary));
}
```

回退可嵌套——先找 `--button-text`，未定义用 `--color-text`。

### `@property` — 类型化变量

注册有类型、可动画的自定义属性：

```css
@property --angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@property --progress {
  syntax: '<percentage>';
  inherits: true;
  initial-value: 0%;
}
```

CSS 变量默认都是字符串——直接无法做过渡动画、无法参与数学运算。`@property` 告诉浏览器"这个变量是角度/百分比/颜色"，之后 `transition` 和 `calc` 就能识别它。

### `light-dark()` — 浅深色自动切换

```css
:root {
  color-scheme: light dark; /* 跟随系统 */
}

.element {
  color: light-dark(#111827, #f9fafb);
  background: light-dark(#ffffff, #111827);
}
```

一个属性值写完双色方案——不比拼 `prefers-color-scheme` 媒体查询。

### `calc()` / `min()` / `max()` / `clamp()` — 响应式计算

```css
/* calc —— 四则运算 */
.container {
  width: calc(100% - var(--spacing-lg) * 2);
}

/* min —— 取最小值 */
.hero {
  height: min(100vh, 600px);
}

/* max —— 取最大值（最小尺寸保证） */
.icon {
  width: max(24px, 10%);
}

/* clamp(min, 理想值, max) —— 流体尺寸 */
h1 {
  font-size: clamp(1.5rem, 4vw, 3rem);
  /* 最小 1.5rem，常规 4vw，最大 3rem */
}

.card {
  width: clamp(280px, 50%, 600px);
}

/* clamp + 响应式间距 */
.section {
  padding: clamp(1rem, 5vw, 4rem);
}
```

`clamp()` 是流体系统里最值得用的函数——一行替代 `min-width` + `max-width` + `width`。

### `minmax()` — Grid 专用

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  /* 每列最小 250px，剩余空间均分 */
}
```

### `color-mix()` — 颜色混合

```css
:root {
  --color-primary: #2563eb;
}

/* 变淡 20%（混合 80% 主色 + 20% 透明） */
.button:hover {
  background: color-mix(in srgb, var(--color-primary) 80%, transparent);
}

/* 变暗 20%（混合 80% 主色 + 20% 纯黑） */
.button:active {
  background: color-mix(in srgb, var(--color-primary), #000 20%);
}
```

这消除了"hover 比 primary 深一点"需要定义 `--color-primary-hover`、`--color-primary-active` 等衍生 token 的需求——一个主色算出所有变体。

---

## 五、CSS 嵌套（原生）

现代浏览器支持原生 CSS 嵌套（2024+ 基线）。SCSS 项目中仍用 SCSS 嵌套，纯 CSS 项目可用原生：

```css
.card {
  padding: var(--spacing-md);

  & .title {          /* 非直接子用 & 前缀 */
    font-size: var(--font-size-lg);
  }

  > .header {         /* 直接子用 > */
    border-bottom: 1px solid var(--color-border);
  }

  &:hover {           /* 伪类 */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  @media (width >= 768px) {  /* 媒体查询嵌套 */
    padding: var(--spacing-lg);
  }
}
```

---

## 六、Cascade Layers（@layer）

复杂项目中用级联层控制优先级，替代选择器权重大战：

```css
/* 从低到高优先级 */
@layer reset, tokens, base, components, utilities;

/* reset —— 最低优先级 */
@layer reset {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
  }
}

/* tokens —— 变量定义 */
@layer tokens {
  :root {
    --color-primary: #2563eb;
  }
}

/* base —— 元素默认样式 */
@layer base {
  body {
    font-family: var(--font-family);
    line-height: var(--line-height);
    color: var(--color-text);
  }
  a {
    color: var(--color-primary);
  }
}

/* components —— 组件样式 */
@layer components {
  .card { /* ... */ }
  .button { /* ... */ }
}

/* utilities —— 最高优先级，工具类 */
@layer utilities {
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }
}
```

- 层级一旦声明就固定——不用 `!important` 来覆盖
- 新项目建议用 `@layer`，旧项目渐进引入

---

## 七、响应式

### 移动优先

```scss
.container {
  // 移动端默认
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);

  // 平板
  @media (width >= 768px) {
    flex-direction: row;
    padding: var(--spacing-lg);
  }

  // 桌面
  @media (width >= 1024px) {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

断点定义为变量：

```css
--bp-sm: 640px;
--bp-md: 768px;
--bp-lg: 1024px;
--bp-xl: 1280px;

@media (width >= 768px) { /* 而非 @media (min-width: 768px) */ }
```

### Container Queries

组件级响应式——根据容器宽度而非视口：

```scss
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (width >= 400px) {
  .card {
    display: flex;
    flex-direction: row;
  }
}
```

---

## 八、实用模式

### 布局：Flexbox / Grid

```scss
// Flexbox —— 一维布局
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

// Grid —— 二维布局
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}
```

### 辅助类

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
```

### 按需显示/隐藏

```scss
// 用 visually hidden（屏幕阅读器可达），不用 display:none
.hidden {
  display: none; /* 仅用于真正不渲染到可访问树时 */
}
```

### 焦点样式

```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* 不用 :focus —— 鼠标点击也出轮廓很丑 */
/* 不禁用 outline 不提供替代 —— 键盘用户找不到焦点 */
```

---

## 九、性能

- 选择器不超过 3 级嵌套——浏览器从右向左匹配，层级越深越慢
- 不过度用通配符 `*` 和标签联合选择器（`div.class`）
- 动画只变 `transform` 和 `opacity`——触发 Composite 而非 Layout/Paint
- `will-change` 仅对实际需要时用，用完移除

```scss
// ✅ 高性能动画
.element {
  transform: translateX(0);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateX(10px); /* 只触发 Composite */
  }
}

// ❌ 触发 Layout
.element:hover {
  left: 10px; /* 触发 reflow */
}
```

---

## 十、禁止事项

| 禁止 | 原因 | 替代 |
|------|------|------|
| `!important`（stylelint 已阻断） | 破坏级联规则 | 调选择器优先级或用 `@layer` |
| 硬编码色值（`#fff`） | 主题无法统一切换 | `var(--color-*)` |
| ID 选择器 `#id { }` | 权重太高难覆盖 | class 选择器 |
| `*` 全局选择器（reset 除外） | 性能开销 | 具体选择器 |
| 深层嵌套 >3 级 | 性能 + 可读性 | 拆组件 |
| inline style `<div style="...">` | 不可复用、难调试 | class + CSS 变量 |
| `@import` 引入外部 CSS | 阻塞渲染 | `<link>` 或构建工具合并 |

---

## 十一、与框架的配合

### Vue

```vue
<style lang="scss" scoped>
/* scoped 自动加 data-v-xxx 属性隔离 */
</style>
```

### React

```tsx
// SCSS Modules —— 类名自动 hash 隔离
import styles from './Component.module.scss'

<div className={styles.container}>
```

---

## 输出前自检

- [ ] 类名用 BEM？`block__element--modifier` 格式？
- [ ] 属性排序按 Concentric（由 stylelint --fix 自动修）？
- [ ] 设计值用 CSS 变量，无硬编码色值？
- [ ] ~~无 `!important`~~（stylelint 已阻断）？
- [ ] 移动优先（默认移动端，`@media` 叠加更大屏幕）？
- [ ] 选择器嵌套 ≤3 级？
- [ ] 动画只动 `transform` 和 `opacity`？
- [ ] `:focus-visible` 替代 `:focus`？不禁用 outline？
- [ ] 栅格/弹性布局用 `gap` 而非 `margin` 间距？
