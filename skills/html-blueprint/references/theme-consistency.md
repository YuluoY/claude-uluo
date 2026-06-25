# 主题一致性协议

html-blueprint 的项目级主题管理：通过一个共享 CSS 文件统一定义 design token，所有设计稿通过 `<link>` 引入，保证多页面的色彩、间距、圆角、字号体系一致。

**主题来源**：主题 token 可从远程设计 skill（ui-ux-pro-max）生成的设计系统映射而来，也可手动定义。

---

## 核心原则

1. **主题 CSS 是项目唯一的 token 定义源** — 所有 `--color-*`、`--space-*`、`--radius-*`、`--font-*` 只在 `tokens.css` 中定义一次
2. **设计稿 HTML 通过 `<link>` 引入主题** — 不重复定义 `:root` token
3. **组件样式用 `var()` 引用 token** — `color: var(--color-text-primary)` 而非硬编码
4. **每个 HTML 独立可渲染** — `<link>` 使用相对路径，主题 CSS 在则页面正常展示

---

## 设计系统生成（远程 skill 对接）

当项目首次需要 `tokens.css` 时，可通过远程加载 ui-ux-pro-max 生成专业设计系统，再映射为标准 CSS 变量。

### 生成流程

```
用户需求 → npx skills add 加载 ui-ux-pro-max → 生成设计系统 → 映射为 tokens.css
                                        ↑
                                     design-taste-frontend（品味纠偏）
```

加载方式：`node scripts/_shared/load.js --all`（详见 [remote-skills.md](remote-skills.md)）

### 输入参数

| 参数 | 说明 | 示例 |
|------|------|------|
| 产品类型 | 决定风格和配色倾向 | SaaS / 电商 / 作品集 / 仪表盘 |
| 行业 | 影响配色和语义 | 金融 / 医疗 / 教育 / 科技 |
| 风格关键词 | 主风格选择 | 极简 / 玻璃拟态 / 粗野主义 / 高端 |
| 目标受众 | 影响视觉密度和复杂度 | B2B / B2C / 开发者 / 消费者 |

### 设计系统 → Token 映射

| 设计系统维度 | 映射到 CSS 变量 |
|-------------|----------------|
| **配色** | `--color-primary`、`--color-secondary`、`--color-success/warning/error`、`--color-text-*`、`--color-bg-*`、`--color-border-*` |
| **字体** | `--font-family-heading`、`--font-family-body`、`--font-family-mono`、`--font-size-*`、`--font-weight-*` |
| **间距** | `--space-1` 到 `--space-16`（4px 步长）、`--gap-*` |
| **圆角** | `--radius-sm`、`--radius-md`、`--radius-lg`、`--radius-xl`、`--radius-full` |
| **阴影** | `--shadow-sm`、`--shadow-md`、`--shadow-lg`、`--shadow-xl` |
| **动效** | `--duration-fast`、`--duration-base`、`--duration-slow`、`--ease-default` |

### 三旋钮配置（来自 design-taste-frontend）

设计系统生成后，通过三个旋钮微调风格强度：

| 旋钮 | 范围 | 影响 |
|------|------|------|
| **DESIGN_VARIANCE** | 1-10 | 布局实验程度。低=居中/干净，高=非对称/现代 |
| **MOTION_INTENSITY** | 1-10 | 动画深度。低=hover 反馈，高=滚动/磁吸/视差 |
| **VISUAL_DENSITY** | 1-10 | 信息密度。低=宽松留白，高=数据密集仪表盘 |

---

## 主题 CSS 文件

### 文件位置与命名

```
<项目根>/design/tokens.css
```

同一项目中可以有且仅有一个主题 CSS。

### 项目目录约定

所有设计资产统一放在 `<项目根>/design/` 目录下，按类型分四个子目录，各自通过相对路径引用 `tokens.css`：

```
<项目根>/design/
├── tokens.css              ← 全局唯一主题文件
├── design-spec.yaml        ← Design Spec
├── layout/                 ← 骨架布局
│   └── *.html              → <link rel="stylesheet" href="../tokens.css">
├── blocks/                 ← 页面区块
│   └── *.html              → <link rel="stylesheet" href="../tokens.css">
├── components/             ← 可复用组件
│   └── *.html              → <link rel="stylesheet" href="../tokens.css">
└── pages/                  ← 页面设计稿
    └── *.html              → <link rel="stylesheet" href="../tokens.css">
```

| 目录 | 内容 | 典型场景 |
|------|------|---------|
| `layout/` | 骨架布局 | 整体页面框架、导航+内容区结构、响应式栅格骨架 |
| `blocks/` | 页面区块 | Hero 区块、功能特性区、定价区块、FAQ 区块 |
| `components/` | 可复用组件 | 确认弹窗、通知提示、表单模块、列表卡片 |
| `pages/` | 完整页面设计稿 | 仪表盘、设置页、用户详情、登录页 |

`data-page` 声明的完整页面放在 `pages/`，页面区块放在 `blocks/`，骨架布局放在 `layout/`，无 `data-page` 的可复用组件放在 `components/`。四个子目录均在 `design/` 下一层，因此统一通过 `<link href="../tokens.css">` 引用主题。`validate.js` 扫描时自动覆盖所有子目录。`<!-- @theme -->` 声明统一为 `../tokens.css`。

### 标准 Token 清单

```css
/* tokens.css — 项目设计主题 */
:root {
  /* ===== Breakpoints (reference only, used in @media) ===== */
  --breakpoint-xs: 576px;
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
  --breakpoint-xxl: 1400px;

  /* ===== Container ===== */
  --container-max-width-sm: 1200px;   /* content/marketing sites */
  --container-max-width-lg: 1320px;   /* dashboard/product */
  --container-padding-x: 24px;
  --container-padding-x-tablet: 24px;
  --container-padding-x-mobile: 16px;

  /* ===== Grid ===== */
  --grid-columns: 12;
  --grid-gutter-desktop: 24px;
  --grid-gutter-tablet: 20px;
  --grid-gutter-mobile: 16px;
  --grid-margin-desktop: 80px;
  --grid-margin-tablet: 32px;
  --grid-margin-mobile: 16px;

  /* ===== Spacing (8pt grid) ===== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* ===== Component Sizes ===== */
  --size-sm: 32px;
  --size-md: 40px;
  --size-lg: 48px;
  --size-header-product: 64px;
  --size-header-marketing: 80px;
  --size-header-mobile: 56px;
  --size-sidebar: 240px;
  --size-sidebar-collapsed: 64px;
  --size-row-compact: 40px;
  --size-row-default: 48px;
  --size-row-comfortable: 56px;
  --size-avatar-sm: 24px;
  --size-avatar-md: 32px;
  --size-avatar-lg: 40px;
  --size-avatar-xl: 48px;
  --size-avatar-2xl: 56px;
  --size-avatar-3xl: 64px;
  --size-card-padding-compact: 16px;
  --size-card-padding-default: 24px;
  --size-card-padding-spacious: 32px;
  --size-modal-sm: 480px;
  --size-modal-md: 560px;
  --size-modal-lg: 680px;

  /* ===== Border Radius ===== */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* ===== Shadow / Elevation ===== */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.06);

  /* ===== Typography: Font Size ===== */
  --font-size-h1: 36px;
  --font-size-h2: 30px;
  --font-size-h3: 24px;
  --font-size-h4: 20px;
  --font-size-h5: 18px;
  --font-size-h6: 16px;
  --font-size-body-lg: 18px;
  --font-size-body-base: 16px;
  --font-size-body-sm: 14px;
  --font-size-caption: 12px;
  --font-size-button-sm: 14px;
  --font-size-button-md: 14px;
  --font-size-button-lg: 16px;

  /* ===== Typography: Line Height ===== */
  --line-height-h1: 44px;
  --line-height-h2: 38px;
  --line-height-h3: 32px;
  --line-height-h4: 28px;
  --line-height-h5: 26px;
  --line-height-h6: 24px;
  --line-height-body-lg: 28px;
  --line-height-body-base: 24px;
  --line-height-body-sm: 22px;
  --line-height-caption: 18px;
  --line-height-button: 20px;

  /* ===== Typography: Font Weight ===== */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* ===== Colors: Neutral Scale (slate-based) ===== */
  --color-neutral-50: #f8fafc;
  --color-neutral-100: #f1f5f9;
  --color-neutral-200: #e2e8f0;
  --color-neutral-300: #cbd5e1;
  --color-neutral-400: #94a3b8;
  --color-neutral-500: #64748b;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1e293b;
  --color-neutral-900: #0f172a;
  --color-neutral-950: #020617;

  /* ===== Colors: Brand ===== */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-active: #1d4ed8;
  --color-primary-light: rgba(59,130,246,0.10);
  --color-primary-lighter: rgba(59,130,246,0.06);

  /* ===== Colors: Semantic ===== */
  --color-success: #027a48;
  --color-success-bg: #ecfdf3;
  --color-success-border: #abefc6;
  --color-warning: #b45309;
  --color-warning-bg: #fffbeb;
  --color-warning-border: #fde68a;
  --color-danger: #dc2626;
  --color-danger-bg: #fef2f2;
  --color-danger-border: #fecaca;
  --color-info: #2563eb;
  --color-info-bg: #eff6ff;
  --color-info-border: #bfdbfe;

  /* ===== Colors: Text ===== */
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-500);
  --color-text-muted: var(--color-neutral-400);
  --color-text-inverse: #ffffff;
  --color-text-disabled: var(--color-neutral-300);

  /* ===== Colors: Background ===== */
  --color-bg-page: var(--color-neutral-50);
  --color-bg-surface: #ffffff;
  --color-bg-surface-hover: var(--color-neutral-50);
  --color-bg-disabled: var(--color-neutral-100);
  --color-overlay: rgba(15,23,42,0.50);

  /* ===== Colors: Border ===== */
  --color-border: var(--color-neutral-200);
  --color-border-light: var(--color-neutral-100);
  --color-border-focus: var(--color-primary);

  /* ===== Focus Ring ===== */
  --focus-ring: 0 0 0 3px rgba(59,130,246,0.30);
  --focus-ring-width: 3px;

  /* ===== Font Family ===== */
  --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --font-family-mono: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', Menlo, Consolas, monospace;
}

/* ===== Base Container Class ===== */
.container {
  width: 100%;
  max-width: var(--container-max-width-lg);
  margin: 0 auto;
  padding-left: var(--container-padding-x);
  padding-right: var(--container-padding-x);
}
.container--narrow { max-width: var(--container-max-width-sm); }
.container--full { max-width: none; }

@media (max-width: 767px) {
  .container {
    padding-left: var(--container-padding-x-mobile);
    padding-right: var(--container-padding-x-mobile);
  }
}

/* ===== Reduced Motion ===== */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Token 分类：必须参数化 vs 允许保留原始值

| 类别 | 策略 | 示例 |
|------|------|------|
| 主色/文本色/背景色 | **必须 var() 引用** | `color: var(--color-text-primary)` |
| 间距 | **必须 var() 引用** | `padding: var(--space-4)` |
| 圆角 | **必须 var() 引用** | `border-radius: var(--radius-lg)` |
| 字号 | **必须 var() 引用** | `font-size: var(--font-size-body-base)` |
| 字体系列 | **必须 var() 引用** | `font-family: var(--font-family-sans)` |
| 阴影 | **优先 var() 引用** | `box-shadow: var(--shadow-lg)` |
| 复杂渐变 | 允许保留原始值 | `background: linear-gradient(135deg, #fff 0%, #f7faff 100%)` |
| 装饰 blur/backdrop-filter | 允许保留原始值 | `filter: blur(24px)` |
| 动画 @keyframes | 允许保留原始值 | 动画参数通常不需要 token 化 |

---

## 生成协议

### 场景 A：项目中尚无蓝图（首次生成）

1. 询问用户目标画布尺寸和响应式需求（最少提问规则）
2. 创建 `design/` 目录，**同步生成 `design/tokens.css`**，包含完整的 `:root` token 定义
3. 判断设计稿类型：骨架布局 → `design/layout/<name>.html`；页面区块 → `design/blocks/<name>.html`；可复用组件 → `design/components/<name>.html`；完整页面 → `design/pages/<name>.html`
4. 生成设计稿 HTML，`<link rel="stylesheet" href="../tokens.css">` 引入主题，组件样式用 `var()` 引用
5. 告知用户项目结构已就绪，后续设计稿将自动继承主题

### 场景 B：项目中已有 `tokens.css`

1. **读取 `tokens.css`**，提取所有已定义的 `--*` token
2. 生成设计稿 HTML，`<link>` 引入已有主题 CSS
3. 组件样式**必须使用已有 token**，通过 `var()` 引用
4. **禁止**在 `<style>` 中重新定义 `:root` 变量
5. 如果已有 token 不足以表达设计稿视觉效果，可新增 token 到主题 CSS，并在生成报告中说明新增原因

### 场景 C：用户明确要求单文件独立

1. 降级为 inline `:root`（当前默认行为）
2. 不生成 `tokens.css`
3. 在生成报告中注明"此设计稿未纳入项目主题体系"

---

## 设计稿 HTML 格式

```html
<!-- @page DashboardPage -->
<!-- @viewport width:1440 height:900 -->
<!-- @theme ../tokens.css -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard</title>
<link rel="stylesheet" href="../tokens.css">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--font-family-sans);
    background: var(--color-bg-page);
    color: var(--color-text-primary);
  }

  /* 组件样式只写 var() 引用，不定义 :root */
  .stat-card {
    padding: var(--space-6);
    border-radius: var(--radius-lg);
    background: linear-gradient(135deg, #ffffff 0%, #f7faff 100%);
    box-shadow: var(--shadow-lg);
  }
  .stat-card__title {
    font-size: var(--font-size-body-sm);
    color: var(--color-text-secondary);
  }
  .stat-card__value {
    font-size: var(--font-size-h2);
    color: var(--color-text-primary);
  }
</style>
</head>
<body>
  <!-- ... -->
</body>
</html>
```

关键点：
- `<!-- @theme -->` 注释声明主题 CSS 路径（供校验脚本识别）
- `<link>` 在 `<style>` 之前，确保层叠顺序正确
- `<style>` 中不出现 `:root { }` 块
- 所有可参数化的值通过 `var()` 引用

---

## 校验规则

### theme-consistency.js 检查项

| 检查项 | 级别 | 说明 |
|--------|------|------|
| 设计稿 HTML 缺少 `<!-- @theme -->` 声明 | SHOULD | 无法确定主题来源时提示 |
| 项目存在多个 `tokens.css` | WARN | 应只有一个主题文件 |
| HTML 中 `<style>` 重复定义主题已有的 `:root` 变量 | SHOULD | 会导致覆盖，破坏一致性 |
| HTML 中 `var()` 引用了主题 CSS 中不存在的 token | SHOULD | 运行时回退到默认值，视觉可能不对 |
| 多个 HTML 设计稿引用了不同的主题文件 | WARN | 可能是项目拆分为多主题，需人工确认 |
| 主题 CSS 缺少核心 token（`--space-4`/`--space-8`/`--space-16`/`--space-24`、`--radius-md`/`--radius-lg`、`--font-size-h1`/`--font-size-body-base`、`--color-primary`/`--color-text-primary`/`--color-bg-page`） | **HARD** | 核心 token 缺失将导致页面无法正常渲染 |
| 主题 CSS 缺少其他非核心 token | WARN | 建议补充完整 |

### 自动修复行为

- 检测到 `<style>` 中有 `:root` 重复定义 → 提示删除，不自动修改
- 检测到 `var()` 引用不存在 token → 列出缺失项，提示补充到主题 CSS
- 检测到多个主题 CSS → 列出路径，提示人工确认合并

---

## 与现有协议的关系

- **与 css-conventions.md 的关系**：Hybrid Token 模式的 token 值**改为从主题 CSS 继承**，不再在每个 HTML 中内联定义。复杂视觉效果保留原始值的原则不变。
- **与 constraint-tiers.md 的关系**：跨蓝图一致性作为 SHOULD/WARN 级别，不阻断单文件校验通过。
- **与 protocol-spec.md 的关系**：不改变 data-* 属性协议，仅影响 CSS token 来源。
- **与 validate.js 的关系**：theme-consistency 追加到管线末尾，默认运行。
