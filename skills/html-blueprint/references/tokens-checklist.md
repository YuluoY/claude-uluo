# Design Token 完整清单

> **Phase**: Phase 1a — 生成 tokens.css 前必读

对标 W3C DTCG v2025.10 + MD3 + Ant Design 5，13 维度完整覆盖。html-blueprint 生成 `tokens.css` 时必须按此清单。

---

## 1. Color（颜色）

### 品牌色阶（Primary）

```
--color-primary-50 ~ --color-primary-950（10 色阶，基色可裸 hex 定义）
--color-primary: var(--color-primary-500)
--color-primary-hover: var(--color-primary-600)
--color-primary-active: var(--color-primary-700)
--color-primary-light: var(--color-primary-100)
--color-primary-lighter: var(--color-primary-50)
```

### 中性色阶（Neutral）

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
--color-text-primary / --color-text-secondary / --color-text-muted
--color-text-inverse / --color-text-disabled / --color-text-brand
```

### 背景色

```
--color-bg-page / --color-bg-surface / --color-bg-surface-hover
--color-bg-disabled / --color-overlay
```

### 边框色

```
--color-border / --color-border-light / --color-border-focus
```

### HARD token

```
--color-primary / --color-primary-hover
--color-text-primary / --color-text-secondary
--color-bg-page / --color-bg-surface
--color-success / --color-warning / --color-danger
```

---

## 2. Typography（排版）

### 字体家族

```
--font-family-sans（正文无衬线）
--font-family-heading（标题，可与 sans 相同或不同）
--font-family-mono（代码/数字）
```

### 字号（type scale 1.25）

```
--font-size-h1（~36px）   --font-size-h2（~28px）   --font-size-h3（~22px）
--font-size-h4（~18px）   --font-size-h5（~16px）   --font-size-h6（~14px）
--font-size-body-base（16px）   --font-size-body-sm（14px）   --font-size-caption（12px）
--font-size-button-sm / --font-size-button-md / --font-size-button-lg
```

### 字重 / 行高 / 字母间距

```
--font-weight-normal(400) / --font-weight-medium(500) / --font-weight-semibold(600) / --font-weight-bold(700)
--line-height-h1~h6 / --line-height-body-base / --line-height-body-sm / --line-height-caption
--letter-spacing-tight / --letter-spacing-normal / --letter-spacing-wide
```

### HARD token

```
--font-size-h1 / --font-size-body-base / --font-family-heading / --font-family-body
```

---

## 3. Spacing（间距，4px 网格）

```
--space-1（4px）   --space-2（8px）   --space-3（12px）  --space-4（16px）
--space-5（20px）  --space-6（24px）  --space-8（32px）  --space-10（40px）
--space-12（48px） --space-14（56px） --space-16（64px） --space-18（72px）
--space-20（80px） --space-24（96px）
```

### 容器 / 栅格

```
--container-padding-x-sm(16px) / --container-padding-x-md(24px) / --container-padding-x-lg(32px)
--grid-columns(12)
--grid-gutter-sm(16px) / --grid-gutter-md(24px) / --grid-gutter-lg(32px)
--grid-margin-sm(16px) / --grid-margin-md(24px)
```

### HARD token

```
--space-4 / --space-8 / --space-16 / --space-24
```

---

## 4. Border Radius（圆角）

```
--radius-sm(4px) / --radius-md(8px) / --radius-lg(12px)
--radius-xl(16px) / --radius-2xl(24px) / --radius-full(9999px)
```

### HARD token: `--radius-md` / `--radius-lg`

---

## 5. Shape（形状，独立于 Radius）

MD3 区分 corner family 和 corner size。Shape 控制组件的整体外形风格。

```
--shape-family-default（rounded — 默认圆角风格）
--shape-family-pill（full — 胶囊/药丸风格）
--shape-corner-none（0）
--shape-corner-xs（2px）
--shape-corner-sm（4px） ← 等同于 --radius-sm
--shape-corner-md（8px） ← 等同于 --radius-md
--shape-corner-lg（12px）
--shape-corner-xl（16px）
--shape-corner-full（9999px）
```

Radius 与 Shape 互补：radius 控制角的圆度值，shape 控制整体形状风格。

---

## 6. Shadow（阴影视觉效果）

```
--shadow-sm（卡片轻微浮起）
--shadow-md（下拉/弹窗）
--shadow-lg（模态框）
--shadow-xl（抽屉/巨幅浮层）
--shadow-focus-ring（聚焦环）
--shadow-inset-sm（内阴影）
```

### HARD token: `--shadow-md`

---

## 7. Gradient（渐变）

对标 W3C DTCG `gradient` 复合类型。现代 UI 的 Hero 区块、卡片背景、品牌区域等高视觉需求场景依赖渐变。

```
--gradient-brand（品牌渐变：主色→次色）
--gradient-hero（Hero 区块渐变，深色→品牌色）
--gradient-card（卡片微渐变，表面→略微变深）
--gradient-overlay（遮罩渐变，透明→半透明暗色）
--gradient-subtle（极微渐变，用于分割线或装饰）
```

K 值（可选，精细控制）：
```
--gradient-angle-brand（品牌渐变角度，默认 135deg）
--gradient-angle-hero（Hero 渐变角度，默认 180deg）
```

### HARD token（至少 `--gradient-brand`）

---

## 8. Elevation / Surface（表面层级，独立于 Shadow）

Shadow 是视觉表现，Elevation 是空间层级——控制 background-color 的梯度和表面叠加。对标 MD3 elevation levels 0-5。

```
--elevation-0（最底层，--color-bg-page）
--elevation-1（卡片/列表项，比 page 浅一层）
--elevation-2（悬浮卡片/下拉面板）
--elevation-3（模态框/对话框）
--elevation-4（抽屉/侧边栏覆盖）
--elevation-5（通知/Toast 最高层）
```

每个 elevation level 关联一个 background-color，确保表面层级视觉一致。

---

## 9. Z-Index（堆叠顺序）

```
--z-base（0 — 默认堆叠）
--z-dropdown（100 — 下拉菜单/Select）
--z-sticky（200 — 粘性元素）
--z-overlay（300 — 遮罩层）
--z-modal（400 — 模态框）
--z-drawer（500 — 抽屉面板）
--z-notification（600 — 通知/Toast）
--z-tooltip（700 — 工具提示）
```

---

## 10. Opacity / State Layer（状态叠加透明度）

对标 MD3 state layer。所有交互态（hover/press/focus/drag/disabled）通过叠加透明度实现，不通过硬编码颜色。

```
--opacity-hover（0.08 — hover 态叠加）
--opacity-press（0.12 — press/active 态叠加）
--opacity-focus（0.12 — focus 态叠加）
--opacity-drag（0.16 — drag 态叠加）
--opacity-disabled（0.38 — 禁用态内容）
--opacity-disabled-bg（0.12 — 禁用态背景）
--opacity-overlay（0.5 — 遮罩层默认透明度）
--opacity-selected（0.08 — 选中态叠加）
--opacity-activated（0.12 — 激活态叠加）
```

### HARD token

```
--opacity-disabled / --opacity-overlay
```

---

## 11. Sizing（尺寸）

### 断点 / 容器 / 组件高度 / 图标 / 头像 / 导航 / 表格

```
--breakpoint-xs(375px)~xxl(1440px) — 6 级
--container-max-width-sm(1200px) / --container-max-width-lg(1320px)
--size-sm(24px) / --size-md(32px) / --size-lg(40px)
--size-icon-sm(16px) / --size-icon-md(20px) / --size-icon-lg(24px) / --size-icon-xl(32px)
--size-avatar-sm(24px)~xl(64px) — 4 级
--nav-dashboard(64px) / --sidebar-collapsed(64px) / --sidebar-expanded(240px)
--table-compact(40px) / --table-default(48px) / --table-comfortable(56px)
```

### HARD token: `--breakpoint-md / --breakpoint-lg / --size-md`

---

## 12. Border（边框）

```
--border-width-thin(1px) / --border-width-medium(2px) / --border-width-thick(4px)
--border-style-solid / --border-style-dashed
```

---

## 13. Motion（动效）

```
--motion-duration-fast(100ms) / --motion-duration-medium(200ms) / --motion-duration-slow(300ms)
--motion-easing-ease-in / --motion-easing-ease-out / --motion-easing-ease-in-out
```

### HARD token: `--motion-duration-medium`

---

## 受控扩展规则（design-tokens.js 硬约束）

| Token 类别 | 扩展规则 | 违规示例 |
|-----------|---------|---------|
| 间距 | px 值必须为 4 的倍数 | `--space-X: 7px` |
| 颜色（非基色） | 扩展色必须通过 `color-mix()` 从已有色阶派生 | `--color-new: #ff0000` |
| 字号 | 从已有字号按 type scale 1.25 派生 | `font-size: 13px` |
| 圆角 | 从 sm/md/lg/xl/2xl/full 选择 | `border-radius: 7px` |
| 阴影 | 从已有阴影层级选择 | 自定义 box-shadow |
| Z-Index | 从已有层级选择，禁止自定义值 | `z-index: 999` |
| Opacity | 从已有 opacity 刻度选择 | `opacity: 0.37` |

**基色豁免**：`--color-*-50~950` 色阶和 `--color-success/warning/danger/info` 允许裸 hex 作为原始值定义，不受 color-mix 约束。除此之外的颜色 token 必须通过 color-mix 派生。
