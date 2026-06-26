# Design Token 完整清单

html-blueprint 生成 `tokens.css` 时必须覆盖以下 8 个维度。`design-tokens.js` 校验脚本以此清单为基准。

---

## 1. Color（颜色）

### 品牌色（Primary）

```
--color-primary-50 ~ --color-primary-950（10 色阶）
--color-primary: var(--color-primary-500)
--color-primary-hover: var(--color-primary-600)
--color-primary-active: var(--color-primary-700)
--color-primary-light: var(--color-primary-100)
--color-primary-lighter: var(--color-primary-50)
```

### 中性色（Neutral）

```
--color-neutral-50 ~ --color-neutral-950（10 色阶）
```

### 语义色

```
--color-success / --color-success-bg / --color-success-border
--color-warning / --color-warning-bg / --color-warning-border
--color-danger / --color-danger-bg / --color-danger-border
--color-info / --color-info-bg / --color-info-border
```

### 文字色

```
--color-text-primary
--color-text-secondary
--color-text-muted
--color-text-inverse
--color-text-disabled
--color-text-brand
```

### 背景色

```
--color-bg-page
--color-bg-surface
--color-bg-surface-hover
--color-bg-disabled
--color-overlay
```

### 边框色

```
--color-border
--color-border-light
--color-border-focus
```

### HARD token（design-tokens.js 校验）

```
--color-primary
--color-primary-hover
--color-text-primary
--color-text-secondary
--color-bg-page
--color-bg-surface
--color-success
--color-warning
--color-danger
```

---

## 2. Typography（排版）

### 字体家族

```
--font-family-sans（正文无衬线）
--font-family-heading（标题，可与 sans 相同或不同）
--font-family-mono（代码/数字）
```

### 字号（type scale 比率 1.25）

```
--font-size-h1（~36px / 2.25rem）
--font-size-h2（~28px / 1.75rem）
--font-size-h3（~22px / 1.375rem）
--font-size-h4（~18px / 1.125rem）
--font-size-h5（~16px / 1rem）
--font-size-h6（~14px / 0.875rem）
--font-size-body-base（~16px / 1rem）
--font-size-body-sm（~14px / 0.875rem）
--font-size-caption（~12px / 0.75rem）
--font-size-button-sm
--font-size-button-md
--font-size-button-lg
```

### 字重

```
--font-weight-normal（400）
--font-weight-medium（500）
--font-weight-semibold（600）
--font-weight-bold（700）
```

### 行高

```
--line-height-h1 ~ --line-height-h6
--line-height-body-base
--line-height-body-sm
--line-height-caption
```

### 字母间距

```
--letter-spacing-tight（标题）
--letter-spacing-normal（正文）
--letter-spacing-wide（小字/全大写）
```

### HARD token

```
--font-size-h1
--font-size-body-base
--font-family-heading
--font-family-body
```

---

## 3. Spacing（间距）

基于 4px 网格：

```
--space-1（4px）
--space-2（8px）
--space-3（12px）
--space-4（16px）
--space-5（20px）
--space-6（24px）
--space-8（32px）
--space-10（40px）
--space-12（48px）
--space-14（56px）
--space-16（64px）
--space-18（72px）
--space-20（80px）
--space-24（96px）
```

### 容器内边距

```
--container-padding-x-sm（16px）
--container-padding-x-md（24px）
--container-padding-x-lg（32px）
```

### 栅格

```
--grid-columns（12）
--grid-gutter-sm（16px）
--grid-gutter-md（24px）
--grid-gutter-lg（32px）
--grid-margin-sm（16px）
--grid-margin-md（24px）
```

### HARD token

```
--space-4
--space-8
--space-16
--space-24
```

---

## 4. Border Radius（圆角）

```
--radius-sm（4px）
--radius-md（8px）
--radius-lg（12px）
--radius-xl（16px）
--radius-2xl（24px）
--radius-full（9999px）
```

### HARD token

```
--radius-md
--radius-lg
```

---

## 5. Shadow/Elevation（阴影层级）

```
--shadow-sm（卡片/轻微浮起）
--shadow-md（下拉/弹窗）
--shadow-lg（模态框）
--shadow-xl（抽屉/巨幅浮层）
```

### 附加阴影 token

```
--shadow-focus-ring（聚焦环）
--shadow-inset-sm（内阴影，输入框）
```

---

## 6. Sizing（尺寸）

### 断点

```
--breakpoint-xs（375px）
--breakpoint-sm（576px）
--breakpoint-md（768px）
--breakpoint-lg（1024px）
--breakpoint-xl（1280px）
--breakpoint-xxl（1440px）
```

### 容器

```
--container-max-width-sm（1200px）
--container-max-width-lg（1320px）
```

### 组件高度

```
--size-sm（24px）
--size-md（32px）
--size-lg（40px）
```

### 图标尺寸

```
--size-icon-sm（16px）
--size-icon-md（20px）
--size-icon-lg（24px）
--size-icon-xl（32px）
```

### 头像尺寸

```
--size-avatar-sm（24px）
--size-avatar-md（32px）
--size-avatar-lg（40px）
--size-avatar-xl（64px）
```

### HARD token

```
--breakpoint-md
--breakpoint-lg
--size-md
--shadow-md
```

---

## 7. Border（边框）

```
--border-width-thin（1px）
--border-width-medium（2px）
--border-width-thick（4px）
--border-style-solid（solid）
--border-style-dashed（dashed）
--border-color-light
--border-color-focus
```

---

## 8. Motion（动效）

```
--motion-duration-fast（100ms）
--motion-duration-medium（200ms）
--motion-duration-slow（300ms）
--motion-easing-ease-in
--motion-easing-ease-out
--motion-easing-ease-in-out
```

---

## 受控扩展规则（design-tokens.js 硬约束）

新页面需要新增 token 时，必须遵守：

| Token 类别 | 扩展规则 | 违规示例 |
|-----------|---------|---------|
| 间距 | 必须是 `--space-{n}`，n 为 4 的倍数，优先用已有刻度 | 直接写 `padding: 7px` |
| 颜色 | 必须通过 `color-mix(in oklch, var(--color-X), white/black N%)` 从已有色阶派生 | 直接写 `#ff0000` |
| 字号 | 必须从已有字号按 type scale 比率派生（1.25 或 1.333） | 随意写 `font-size: 13px` |
| 圆角 | 必须从 `sm/md/lg/xl/2xl/full` 中选择 | 写 `border-radius: 7px` |
| 阴影 | 必须从已有阴影层级中选择 | 写自定义 box-shadow 值 |
