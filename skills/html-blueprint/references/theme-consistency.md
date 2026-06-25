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
用户需求 → 远程加载 ui-ux-pro-max → 生成设计系统 → 映射为 tokens.css
                              ↑
                           design-taste-frontend（品味纠偏）
```

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
<项目根>/tokens.css
```

同一项目中可以有且仅有一个主题 CSS。

### 项目目录约定

设计稿按类型分两个目录，各自通过相对路径引用 `tokens.css`：

```
my-app/
├── tokens.css                    ← 项目唯一主题文件
├── pages/                         ← 整页布局设计稿
│   ├── dashboard.html             → <link rel="stylesheet" href="../tokens.css">
│   ├── settings.html              → <link rel="stylesheet" href="../tokens.css">
│   └── user-profile.html          → <link rel="stylesheet" href="../tokens.css">
└── components/                    ← 可复用模块设计稿（弹窗、表单、卡片等）
    ├── confirm-dialog.html        → <link rel="stylesheet" href="../tokens.css">
    ├── user-form.html             → <link rel="stylesheet" href="../tokens.css">
    └── notification-toast.html    → <link rel="stylesheet" href="../tokens.css">
```

| 目录 | 内容 | 典型场景 |
|------|------|---------|
| `pages/` | 整页布局设计稿 | 仪表盘、设置页、用户详情、登录页 |
| `components/` | 可复用模块设计稿 | 确认弹窗、通知提示、表单模块、列表卡片 |

`data-page` 声明的设计稿放在 `pages/`，无 `data-page` 的可复用组件放在 `components/`。两个目录通过相同的 `<link href="../tokens.css">` 引用主题。`validate-all` 扫描时自动覆盖两个目录。`<!-- @theme -->` 声明统一为 `../tokens.css`。

### 标准 Token 清单

```css
/* tokens.css — 项目设计主题 */
:root {
  /* ===== Colors ===== */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-light: rgba(59, 130, 246, 0.12);
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
  --color-success: #027a48;
  --color-success-bg: #ecfdf3;
  --color-warning: #b45309;
  --color-warning-bg: #fffbeb;
  --color-danger: #dc2626;
  --color-danger-bg: #fef2f2;
  --color-bg-page: #f8fafc;
  --color-bg-surface: #ffffff;
  --color-border: #e2e8f0;
  --color-border-light: #f1f5f9;

  /* ===== Spacing ===== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;

  /* ===== Radius ===== */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 999px;

  /* ===== Font Size ===== */
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 32px;

  /* ===== Font Family ===== */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* ===== Shadow ===== */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 20px 50px rgba(30, 64, 175, 0.12);
}
```

### Token 分类：必须参数化 vs 允许保留原始值

| 类别 | 策略 | 示例 |
|------|------|------|
| 主色/文本色/背景色 | **必须 var() 引用** | `color: var(--color-text-primary)` |
| 间距 | **必须 var() 引用** | `padding: var(--space-4)` |
| 圆角 | **必须 var() 引用** | `border-radius: var(--radius-lg)` |
| 字号 | **必须 var() 引用** | `font-size: var(--font-size-base)` |
| 字体系列 | **必须 var() 引用** | `font-family: var(--font-family-base)` |
| 阴影 | **优先 var() 引用** | `box-shadow: var(--shadow-lg)` |
| 复杂渐变 | 允许保留原始值 | `background: linear-gradient(135deg, #fff 0%, #f7faff 100%)` |
| 装饰 blur/backdrop-filter | 允许保留原始值 | `filter: blur(24px)` |
| 动画 @keyframes | 允许保留原始值 | 动画参数通常不需要 token 化 |

---

## 生成协议

### 场景 A：项目中尚无蓝图（首次生成）

1. 询问用户目标画布尺寸和响应式需求（最少提问规则）
2. **同步生成 `tokens.css`** 到项目根目录，包含完整的 `:root` token 定义
3. 判断设计稿类型：整页布局 → `pages/<name>.html`；可复用模块 → `components/<name>.html`
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
    font-family: var(--font-family-base);
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
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
  .stat-card__value {
    font-size: var(--font-size-3xl);
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

### check-theme-consistency.js 检查项

| 检查项 | 级别 | 说明 |
|--------|------|------|
| 设计稿 HTML 缺少 `<!-- @theme -->` 声明 | SHOULD | 无法确定主题来源时提示 |
| 项目存在多个 `tokens.css` | WARN | 应只有一个主题文件 |
| HTML 中 `<style>` 重复定义主题已有的 `:root` 变量 | SHOULD | 会导致覆盖，破坏一致性 |
| HTML 中 `var()` 引用了主题 CSS 中不存在的 token | SHOULD | 运行时回退到默认值，视觉可能不对 |
| 多个 HTML 设计稿引用了不同的主题文件 | WARN | 可能是项目拆分为多主题，需人工确认 |
| 主题 CSS 缺少关键 token（颜色/间距/字号核心项） | WARN | 建议补充完整 |

### 自动修复行为

- 检测到 `<style>` 中有 `:root` 重复定义 → 提示删除，不自动修改
- 检测到 `var()` 引用不存在 token → 列出缺失项，提示补充到主题 CSS
- 检测到多个主题 CSS → 列出路径，提示人工确认合并

---

## 与现有协议的关系

- **与 css-conventions.md 的关系**：Hybrid Token 模式的 token 值**改为从主题 CSS 继承**，不再在每个 HTML 中内联定义。复杂视觉效果保留原始值的原则不变。
- **与 constraint-tiers.md 的关系**：跨蓝图一致性作为 SHOULD/WARN 级别，不阻断单文件校验通过。
- **与 protocol-spec.md 的关系**：不改变 data-* 属性协议，仅影响 CSS token 来源。
- **与 validate-all.js 的关系**：check-theme-consistency 追加到管线末尾，默认运行。
