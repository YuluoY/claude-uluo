# CSS 约定

> **Phase**: 写 CSS 时

html-blueprint 的 CSS 规范：BEM 命名 + Hybrid Token + 视觉保真允许项 + 禁止选择器。

---

## 命名规范：BEM

```
.stat-card {}              ← Block（组件根）
.stat-card__header {}      ← Element（组件内部元素）
.stat-card__title {}       ← Element
.stat-card--highlight {}   ← Modifier（状态/变体）
```

### BEM 命名规则

- **Block**：组件名转 kebab-case，如 `StatCard` → `stat-card`
- **Element**：`block__element`，双下划线分隔
- **Modifier**：`block--modifier`，双连字符分隔
- **禁止**：深层嵌套（`block__el1__el2__el3`），最多 `block__el1__el2`

### 反模式（禁止）

```
.box1 {}          ← 无语义编号
.left {}          ← 仅描述位置
.text2 {}         ← 无语义编号
.wrapper-abc {}   ← 随机后缀
.div-style {}     ← 无意义
.中文类名 {}       ← 中文
```

---

## Hybrid Token 模式

默认使用 hybrid 模式：主色/文本色/间距/圆角/字号 token 化，复杂视觉效果保留原始 CSS。

**优先从项目主题 CSS 继承 token**。如果项目根目录存在 `tokens.css`，设计稿 HTML 通过 `<link rel="stylesheet" href="...">` 引入，组件样式用 `var()` 引用已有 token。仅在项目尚无主题 CSS 时内联定义 `:root` token。详见 `references/theme-consistency.md`。

### Token 命名空间

```css
/* Primitive tokens */
--color-primary: #3b82f6;
--color-primary-hover: #2563eb;
--color-text-primary: #1e293b;
--color-text-secondary: #64748b;
--color-success: #027a48;
--color-bg-page: #f8fafc;

/* Spacing */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;

/* Radius */
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 999px;

/* Font */
--font-size-xs: 12px;
--font-size-sm: 13px;
--font-size-base: 14px;
--font-size-lg: 16px;
--font-size-xl: 20px;
--font-size-2xl: 24px;
--font-size-3xl: 32px;
```

### 允许保留原始 CSS

以下场景不强制 token 化：

```css
.stat-card {
  /* 复杂渐变保留原始值 */
  background: linear-gradient(135deg, #ffffff 0%, #f7faff 100%);

  /* 阴影保留原始值 */
  box-shadow: 0 20px 50px rgba(30, 64, 175, 0.12);

  /* 使用 token 的可参数化部分 */
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
}
```

---

## 视觉保真允许项

以下 CSS 特性在 html-blueprint 中**被允许**用于还原设计稿：

| 特性 | 用途 | 约束 |
|------|------|------|
| `flex` / `grid` | 布局 | 无限制 |
| `border-radius` | 圆角 | 优先 token |
| `box-shadow` | 阴影 | 不超 3 层叠加 |
| `linear-gradient` / `radial-gradient` | 渐变 | 不超 3 层叠加 |
| `backdrop-filter` | 毛玻璃 | 谨慎使用 |
| `animation` / `@keyframes` | 动效 | 仅装饰，不阻碍交互 |
| `::before` / `::after` | 装饰伪元素 | 仅含装饰内容 |
| `position: absolute` | 装饰定位 | 业务元素需 data-risk |
| `filter: blur()` | 光效 | 仅 data-decorative 元素 |

---

## 选择器禁止项

### !important
```css
/* 禁止 */
.stat-card { color: red !important; }

/* 正确：提升选择器优先级 */
.page-dashboard .stat-card { color: red; }
```

### 深度标签选择器
```css
/* 禁止 */
div > div > span { font-size: 14px; }

/* 正确 */
.stat-card__value { font-size: 14px; }
```

### nth-child 无 class 前缀
```css
/* 禁止 */
tr:nth-child(2) { background: #eee; }

/* 正确 */
.project-table__row:nth-child(even) { background: #eee; }
```

### *:not() 宽泛选择器
```css
/* 禁止 */
*:not(.keep) { margin: 0; }

/* 正确：限定范围 */
.stat-card > *:not(.stat-card__decor) { position: relative; z-index: 1; }
```

---

## 装饰元素样式

装饰元素必须同时满足：
1. `data-decorative="true"`
2. `aria-hidden="true"`
3. 不包含业务属性（data-prop/data-field/data-event/data-slot）
4. 不包含可读业务文本

```html
<!-- 正确 -->
<div
  class="stat-card__decor"
  data-decorative="true"
  aria-hidden="true"
></div>
```

```css
.stat-card__decor {
  position: absolute;
  right: -32px;
  bottom: -36px;
  width: 120px;
  height: 120px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.16);
  filter: blur(24px);
  /* 装饰元素可以 absolute + blur */
}
```

---

## 布局 CSS 共享机制（HARD）

Phase 2a 生成的骨架布局 CSS 必须被 Phase 2b 所有页面共享，不能仅写在 `layout/*.html` 的内嵌 `<style>` 里。

### 协议

1. **布局 CSS 提取为独立文件** `design/layout/layout.css`
2. 包含 `.app-shell`、`.sidebar`、`.main-area`、`.header` 等骨架类
3. `design/layout/*.html` 通过 `<link rel="stylesheet" href="layout.css">` 引用自己
4. `design/pages/*.html` 通过 `<link rel="stylesheet" href="../layout/layout.css">` 引用

### 禁止模式

```html
<!-- 禁止：CSS 只写在 layout HTML 的 <style> 里 -->
<!-- 禁止：pages 重复声明骨架 CSS（WET 重复） -->
```

### 正确模式

```html
<!-- layout/dashboard-layout.html -->
<head>
  <link rel="stylesheet" href="../tokens/tokens.css">
  <link rel="stylesheet" href="layout.css">        ← 引用独立文件
  <style>
    /* 仅布局特有的 page-specific 样式 */
  </style>
</head>

<!-- pages/overview.html -->
<head>
  <link rel="stylesheet" href="../tokens/tokens.css">
  <link rel="stylesheet" href="../layout/layout.css">  ← 共享骨架 CSS
  <style>
    /* 仅此页面特有的样式 */
  </style>
</head>
```

### design/ 目录期望结构

```
design/
├── layout/
│   ├── layout.css               ← 共享骨架 CSS（抽出）
│   └── dashboard-layout.html    ← 骨架 HTML（引用 layout.css）
└── pages/
    └── overview.html             ← 页面（引用 layout/layout.css）
```

```html
<!-- @viewport width:1440 height:900 -->
```

```html
<div
  data-component="StatGrid"
  data-responsive="grid"
  data-breakpoints="mobile:1,tablet:2,desktop:4"
  class="stat-grid"
>
```

如果没有响应式声明，视为单画布视觉稿。
