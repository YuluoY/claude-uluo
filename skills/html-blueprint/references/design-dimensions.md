# 网页设计尺寸标准规范

> 基于 Ant Design 5.x、Material Design 3、8pt 网格系统及 Figma 社区共识整理  
> 本规范作为 AI 生成 HTML 设计稿的基准参考，所有尺寸数值以 px 为单位

---

## 1. 画布尺寸 (Canvas Sizes)

| 设备类型 | 尺寸 (宽×高) | CSS 变量 | 来源 | 使用场景 |
|---------|-------------|----------|------|----------|
| **桌面端 (默认)** | 1440×900 | `--canvas-desktop` | Figma 社区共识 | 标准设计稿画布，适用于大多数笔记本和桌面显示器，覆盖主流用户群体 |
| **桌面端 (全高清)** | 1920×1080 | `--canvas-desktop-fullhd` | Material Design 3 | 大屏展示、数据可视化、全屏背景设计 |
| **平板端** | 768×1024 | `--canvas-tablet` | Ant Design 5.x | iPad 竖屏标准尺寸，平板响应式设计基准 |
| **移动端 (iPhone)** | 375×812 | `--canvas-mobile-ios` | Apple Human Interface Guidelines | iPhone X 及以后机型标准视口，移动端设计首选画布 |
| **移动端 (Android)** | 360×800 | `--canvas-mobile-android` | Material Design 3 | Android 主流机型视口尺寸，Material Design 基准 |

**使用规则：**
- 设计稿优先使用 1440px 桌面画布和 375px 移动画布
- 大屏适配仅做横向延展，核心内容保持在容器宽度内
- 安全区域：移动端需考虑状态栏 44px、底部指示条 34px

---

## 2. 容器宽度 (Container Widths)

| 容器类型 | 最大宽度 | 水平内边距 | CSS 变量 | 来源 | 使用场景 |
|---------|---------|-----------|----------|------|----------|
| 内容/营销官网 | 1200px | - | `--container-content` | Figma 社区共识 | 企业官网、博客、营销落地页，阅读舒适度最佳 |
| 后台/产品系统 | 1320px | - | `--container-dashboard` | Ant Design 5.x | SaaS 后台、管理系统、数据仪表盘，信息密度较高 |
| 通栏/英雄区 | 100% | - | `--container-full` | 通用规范 | 首页 Hero 区块、全屏 Banner、沉浸式通栏 |
| 桌面端水平内边距 | - | 24px | `--container-padding-desktop` | Ant Design 5.x | 1200px+ 屏幕，内容区左右留白 |
| 平板端水平内边距 | - | 24px | `--container-padding-tablet` | Material Design 3 | 768px-1199px 屏幕 |
| 移动端水平内边距 | - | 16px | `--container-padding-mobile` | 双标准共识 | <768px 屏幕，避免内容贴边 |

**使用规则：**
- 容器水平居中：`margin: 0 auto`
- 容器内部使用 12 列栅格系统进行布局
- 通栏区块背景可 100%，但内部文字内容仍需放入固定宽度容器

---

## 3. 12列栅格系统 (12-Column Grid)

| 断点 | 列数 | 水槽 (Gutter) | 外边距 (Margin) | CSS 变量 | 来源 |
|-----|-----|--------------|----------------|----------|------|
| 桌面端 (≥1200px) | 12 | 24px | 80px | `--grid-gutter-desktop`, `--grid-margin-desktop` | Ant Design 5.x |
| 平板端 (768px-1199px) | 12 | 20px | 32px | `--grid-gutter-tablet`, `--grid-margin-tablet` | Material Design 3 |
| 移动端 (<768px) | 12 | 16px | 16px | `--grid-gutter-mobile`, `--grid-margin-mobile` | 双标准共识 |

**栅格列分配规则：**

| 布局类型 | 列数分配 | 典型场景 |
|---------|---------|----------|
| 等分布局 | 12=12 / 6+6 / 4+4+4 / 3+3+3+3 / 2+2+2+2+2+2 | 卡片网格、功能入口、图片画廊 |
| 主从布局 | 8+4 / 9+3 / 3+9 | 内容+侧栏、表单+帮助信息 |
| 黄金比例 | 7+5 / 5+7 | 文章布局、产品展示 |
| 不对称布局 | 6+3+3 / 4+8 / 8+4 | Dashboard 模块组合 |
| 通栏区块 | 12 | 页头、页脚、Hero、分隔条 |

**计算方式：**
- 内容宽度 = 容器宽度 - 左右外边距 × 2
- 单列宽度 = (内容宽度 - 水槽 × (列数-1)) / 列数

---

## 4. 8pt 间距系统 (8pt Spacing System)

所有间距值均为 4 的倍数，基准为 8pt = 8px。

| 间距 Token | 数值 | CSS 变量 | 来源 | 应用层级 | 使用场景 |
|-----------|-----|----------|------|----------|----------|
| space-1 | 4px | `--space-1` | 8pt Grid | 极小 | 图标与文字间距、紧凑内边距、标签内边距 |
| space-2 | 8px | `--space-2` | 8pt Grid | 小 | 相关元素间距、按钮图标间距、小组件内边距 |
| space-3 | 12px | `--space-3` | Ant Design 5.x | 小 | 表单项标签与输入框间距、卡片紧凑内边距 |
| space-4 | 16px | `--space-4` | 8pt Grid | 中 | 组件内边距、列表项间距、卡片元素间距 |
| space-5 | 20px | `--space-5` | Material Design 3 | 中 | 段落间距、表单组间距、中等区块间距 |
| space-6 | 24px | `--space-6` | 8pt Grid | 中 | 卡片内边距、栅格水槽、模块间距 |
| space-8 | 32px | `--space-8` | 8pt Grid | 大 | 区块内子标题间距、卡片之间间距 |
| space-10 | 40px | `--space-10` | Material Design 3 | 大 | 区块内元素间距、表单区块分隔 |
| space-12 | 48px | `--space-12` | 8pt Grid | 大 | 区块之间间距、章节内边距 |
| space-16 | 64px | `--space-16` | Figma 共识 | 特大 | 大区块间距、Hero 与内容间距 |
| space-20 | 80px | `--space-20` | Figma 共识 | 特大 | 页面大章节间距、顶级区块分隔 |

**应用规则：**
- **大间距（32px+）**：用于页面区块之间的分隔、章节与章节的间距
- **中间距（16px-24px）**：用于组件之间的间距、卡片内边距、栅格水槽
- **小间距（4px-12px）**：用于组件内部元素之间的间距、图标文字间距

---

## 5. 组件标准高度 (Standard Component Heights)

### 5.1 按钮与输入框

| 尺寸 | 高度 | CSS 变量 | 来源 | 使用场景 |
|-----|-----|----------|------|----------|
| Small (S) | 32px | `--size-sm` | Ant Design 5.x | 表格内操作按钮、紧凑布局、次要操作 |
| Medium (M) | 40px | `--size-md` | 双标准共识 | **默认尺寸**，表单输入、常规按钮、绝大多数场景 |
| Large (L) | 48px | `--size-lg` | Material Design 3 | 主要CTA按钮、移动端输入框、重要操作 |

### 5.2 导航栏

| 类型 | 高度 | CSS 变量 | 来源 | 使用场景 |
|-----|-----|----------|------|----------|
| 产品/后台导航 | 64px | `--nav-dashboard` | Ant Design 5.x | SaaS后台、管理系统顶部导航 |
| 营销/官网导航 | 80px | `--nav-marketing` | Figma 共识 | 企业官网、落地页、品牌站点 |
| 移动端导航 | 56px | `--nav-mobile` | Material Design 3 | 移动端顶部/底部导航栏 |

### 5.3 侧边栏

| 状态 | 宽度 | CSS 变量 | 来源 | 使用场景 |
|-----|-----|----------|------|----------|
| 收起状态 | 64px-80px | `--sidebar-collapsed` | Ant Design 5.x | 图标导航、极简模式 |
| 展开状态 | 200px-280px | `--sidebar-expanded` | 双标准共识 | 完整菜单导航，**默认推荐 240px** |

### 5.4 表格行高

| 密度 | 高度 | CSS 变量 | 来源 | 使用场景 |
|-----|-----|----------|------|----------|
| 紧凑 (Compact) | 40px | `--table-compact` | Ant Design 5.x | 数据密集型表格、专业工具 |
| 默认 (Default) | 48px | `--table-default` | 双标准共识 | **默认尺寸**，通用数据表格 |
| 舒适 (Comfortable) | 56px | `--table-comfortable` | Material Design 3 | 内容较少、强调可读性的表格 |

### 5.5 标签与徽章

| 尺寸 | 高度 | CSS 变量 | 来源 | 使用场景 |
|-----|-----|----------|------|----------|
| 小标签 | 22px | `--tag-sm` | Figma 共识 | 状态标签、紧凑列表标签 |
| 默认标签 | 24px | `--tag-md` | Ant Design 5.x | **默认尺寸**，通用标签 |
| 大标签 | 26px | `--tag-lg` | Material Design 3 | 分类标签、筛选标签 |

### 5.6 头像尺寸

| 尺寸 | 宽高 | CSS 变量 | 来源 | 使用场景 |
|-----|-----|----------|------|----------|
| XS | 24px | `--avatar-xs` | Ant Design 5.x | 列表内小头像、评论区头像 |
| S | 32px | `--avatar-sm` | 双标准共识 | 导航栏用户头像、紧凑卡片 |
| M | 40px | `--avatar-md` | Ant Design 5.x | **默认尺寸**，常规用户展示 |
| L | 48px | `--avatar-lg` | Material Design 3 | 个人信息展示、评论区主头像 |
| XL | 56px | `--avatar-xl` | Figma 共识 | 个人资料页 |
| 2XL | 64px | `--avatar-2xl` | Figma 共识 | 用户卡片、团队展示 |
| 3XL | 80px | `--avatar-3xl` | Figma 共识 | 个人中心页大头像 |

### 5.7 弹窗/对话框

| 属性 | 数值 | CSS 变量 | 来源 | 使用场景 |
|-----|-----|----------|------|----------|
| 最大高度 | 80vh | `--modal-max-height` | 双标准共识 | 避免弹窗过高超出视口 |
| 小宽度 | 480px | `--modal-sm` | Ant Design 5.x | 确认框、提示框、简单表单 |
| 默认宽度 | 560px | `--modal-md` | Ant Design 5.x | **默认尺寸**，常规表单弹窗 |
| 大宽度 | 680px | `--modal-lg` | Material Design 3 | 复杂表单、详情展示 |
| 特大宽度 | 720px | `--modal-xl` | Figma 共识 | 多步骤表单、详情编辑 |

**使用规则：**
- 表单项高度与按钮/输入框高度一致
- 弹窗必须居中定位，背景使用半透明遮罩
- 所有可点击元素高度不小于 40px（移动端不小于 48px）

---

## 6. 卡片规范 (Card Specifications)

| 属性 | 数值 | CSS 变量 | 来源 | 使用场景 |
|-----|-----|----------|------|----------|
| 紧凑内边距 | 16px | `--card-padding-compact` | Ant Design 5.x | 数据卡片、列表卡片、信息密度高 |
| 默认内边距 | 24px | `--card-padding-default` | 双标准共识 | **默认尺寸**，通用内容卡片 |
| 宽松内边距 | 32px | `--card-padding-spacious` | Material Design 3 | 营销卡片、产品展示卡片、统计卡片 |
| 卡片间距 | 24px | `--card-gap` | Figma 共识 | 卡片网格中相邻卡片之间的距离 |
| 内部元素间距 | 16px | `--card-inner-gap` | 8pt Grid | 卡片内标题、描述、操作区之间的间距 |

**卡片结构：**
```
┌─────────────────────────────┐
│  24px padding (default)     │
│  ┌───────────────────────┐  │
│  │  标题区                │  │
│  └───────────────────────┘  │
│       16px gap              │
│  ┌───────────────────────┐  │
│  │  内容区                │  │
│  └───────────────────────┘  │
│       16px gap              │
│  ┌───────────────────────┐  │
│  │  操作区                │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

---

## 7. 圆角层级 (Border Radius Scale)

| 圆角 Token | 数值 | CSS 变量 | 来源 | 适用元素 |
|-----------|-----|----------|------|----------|
| radius-sm | 4px | `--radius-sm` | Ant Design 5.x | 标签、徽章、输入框、复选框、单选框、小标签 |
| radius-md | 8px | `--radius-md` | 双标准共识 | 按钮、卡片（默认）、输入框、选择器 |
| radius-lg | 12px | `--radius-lg` | Material Design 3 | 大卡片、弹窗内容区、功能区块 |
| radius-xl | 16px | `--radius-xl` | Figma 共识 | 弹窗/对话框容器、气泡卡片、下拉面板 |
| radius-2xl | 24px | `--radius-2xl` | Figma 共识 | Hero区块、大型功能区域、营销卡片 |
| radius-full | 9999px | `--radius-full` | 通用规范 | 头像、圆形按钮、胶囊标签、开关、头像组 |

**使用规则：**
- 同类元素保持一致圆角，避免混用
- 容器圆角大于内部元素圆角（如弹窗 16px，弹窗内按钮 8px）
- 小圆角用于精确的UI控件，大圆角用于强调视觉柔和度

---

## 8. 阴影层级 (Shadow/Elevation Scale)

采用 Material Design 3 的多层阴影体系，模拟真实光照效果。

| 阴影层级 | CSS 变量 | 来源 | 使用场景 | CSS box-shadow 值 |
|---------|----------|------|----------|------------------|
| **shadow-sm** (微浮起) | `--shadow-sm` | Material Design 3 | 按钮悬停态、卡片悬停态、可点击元素默认态 | `0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)` |
| **shadow-md** (中浮起) | `--shadow-md` | Material Design 3 | 下拉菜单、气泡卡片、工具提示、日期选择器 | `0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.04)` |
| **shadow-lg** (高浮起) | `--shadow-lg` | Ant Design 5.x | 弹窗、抽屉、对话框、悬浮编辑器 | `0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.06), 0 20px 25px -5px rgba(0, 0, 0, 0.05)` |
| **shadow-xl** (最高浮起) | `--shadow-xl` | Figma 共识 | 全屏遮罩上的弹窗、Toast通知、通知中心 | `0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 8px 10px -6px rgba(0, 0, 0, 0.08), 0 30px 60px -12px rgba(0, 0, 0, 0.08)` |

**阴影使用原则：**
- 元素层级越高，阴影越大、越模糊、透明度越高
- 避免在同一页面使用过多阴影层级
- 移动端阴影可以适当减弱以提升性能
- 扁平化设计中可用边框替代阴影，但仍建议保留 hover 态阴影

---

## 9. 排版阶梯 (Typography Scale)

格式：字号 / 行高 / 字重

| 排版 Token | 字号 | 行高 | 字重 | CSS 变量 | 来源 | 使用场景 |
|-----------|-----|-----|-----|----------|------|----------|
| **H1** | 36px | 44px | 700 | `--font-size-h1`, `--line-height-h1`, `--font-weight-bold` | Ant Design 5.x | 页面主标题、Hero 大标题、落地页核心标题 |
| **H2** | 30px | 38px | 700 | `--font-size-h2`, `--line-height-h2`, `--font-weight-bold` | 双标准共识 | 页面区块标题、章节标题、卡片组标题 |
| **H3** | 24px | 32px | 600 | `--font-size-h3`, `--line-height-h3`, `--font-weight-semibold` | Ant Design 5.x | 卡片标题、弹窗标题、重要子标题 |
| **H4** | 20px | 28px | 600 | `--font-size-h4`, `--line-height-h4`, `--font-weight-semibold` | Material Design 3 | 次级标题、表单分组标题、侧边栏分组 |
| **H5** | 18px | 26px | 600 | `--font-size-h5`, `--line-height-h5`, `--font-weight-semibold` | Figma 共识 | 小标题、列表标题、卡片次级标题 |
| **H6** | 16px | 24px | 600 | `--font-size-h6`, `--line-height-h6`, `--font-weight-semibold` | Ant Design 5.x | 最小标题、表格列标题、强调文字 |
| **body-lg** | 18px | 28px | 400 | `--font-size-body-lg`, `--line-height-body-lg`, `--font-weight-normal` | Material Design 3 | 大段正文、引言、营销文案、可读性要求高的内容 |
| **body-base** | 16px | 24px | 400 | `--font-size-body-base`, `--line-height-body-base`, `--font-weight-normal` | 双标准共识 | **默认正文字号**，绝大多数文本内容 |
| **body-sm** | 14px | 22px | 400 | `--font-size-body-sm`, `--line-height-body-sm`, `--font-weight-normal` | Ant Design 5.x | 辅助说明、表格内容、列表描述、次要信息 |
| **caption** | 12px | 18px | 400 | `--font-size-caption`, `--line-height-caption`, `--font-weight-normal` | 双标准共识 | 标签文字、时间戳、版权信息、表单提示、脚注 |
| **button (S/M)** | 14px | 20px | 500 | `--font-size-button-sm`, `--line-height-button-sm`, `--font-weight-medium` | Ant Design 5.x | 小按钮、默认按钮文字 |
| **button (L)** | 16px | 24px | 500 | `--font-size-button-lg`, `--line-height-button-lg`, `--font-weight-medium` | Material Design 3 | 大按钮、CTA按钮文字 |

**字体建议：**
- 中文：`-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
- 数字/英文优先使用等宽或系统无衬线字体
- 正文字号不小于 14px，移动端不小于 16px
- 标题字重 600-700，正文字重 400，按钮字重 500

---

## 10. 断点定义 (Breakpoints)

采用业界标准的移动优先（Mobile First）断点体系。

| 断点 | 宽度范围 | CSS 变量 | 来源 | 布局变化 |
|-----|---------|----------|------|----------|
| **xs** | <576px | `--breakpoint-xs` | Bootstrap 5 共识 | **移动端竖屏**：<br>- 导航折叠为汉堡菜单<br>- 栅格默认1列堆叠<br>- 所有文字左对齐<br>- 按钮宽度100%<br>- 使用 16px 正文字号 |
| **sm** | ≥576px | `--breakpoint-sm` | Bootstrap 5 | **移动端横屏**：<br>- 部分内容可双列布局<br>- 按钮可保持自适应宽度<br>- 导航仍为折叠态<br>- 卡片网格 2 列 |
| **md** | ≥768px | `--breakpoint-md` | Ant Design 5.x | **平板端**：<br>- 可展开侧边栏或简化导航<br>- 栅格可使用 2-4 列<br>- 卡片网格 2-3 列<br>- 表单双列布局<br>- 使用 16px 正文字号 |
| **lg** | ≥992px | `--breakpoint-lg` | Ant Design 5.x | **笔记本/小桌面**：<br>- 完整水平导航显示<br>- 侧边栏展开<br>- 栅格可使用 3-6 列<br>- 卡片网格 3 列<br>- 可使用悬浮操作按钮 |
| **xl** | ≥1200px | `--breakpoint-xl` | 双标准共识 | **标准桌面端**：<br>- 完整导航 + 侧边栏<br>- 栅格系统完整12列可用<br>- 卡片网格 3-4 列<br>- 使用 16px 正文字号<br>- 容器居中显示 |
| **xxl** | ≥1400px | `--breakpoint-xxl` | Ant Design 5.x | **大屏桌面端**：<br>- 容器宽度限制在 1200/1320px<br>- 内容居中，两侧留白<br>- 卡片网格 4 列<br>- 可显示更多次要信息 |

**响应式设计原则：**
1. 移动端优先：先设计移动端布局，再向上适配
2. 内容优先：小屏幕只展示核心内容，大屏幕展示完整信息
3. 触摸友好：移动端可点击区域不小于 48×48px
4. 断点处布局平滑过渡，避免突变
5. 使用 CSS `min-width` 媒体查询向上适配

---

## CSS 自定义属性速查表

```css
:root {
  /* 画布与容器 */
  --container-content: 1200px;
  --container-dashboard: 1320px;
  --container-padding-desktop: 24px;
  --container-padding-tablet: 24px;
  --container-padding-mobile: 16px;

  /* 栅格系统 */
  --grid-gutter-desktop: 24px;
  --grid-gutter-tablet: 20px;
  --grid-gutter-mobile: 16px;
  --grid-margin-desktop: 80px;
  --grid-margin-tablet: 32px;
  --grid-margin-mobile: 16px;

  /* 间距系统 */
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

  /* 组件尺寸 */
  --size-sm: 32px;
  --size-md: 40px;
  --size-lg: 48px;
  --nav-dashboard: 64px;
  --nav-marketing: 80px;
  --nav-mobile: 56px;
  --sidebar-collapsed: 80px;
  --sidebar-expanded: 240px;
  --table-compact: 40px;
  --table-default: 48px;
  --table-comfortable: 56px;

  /* 卡片 */
  --card-padding-compact: 16px;
  --card-padding-default: 24px;
  --card-padding-spacious: 32px;
  --card-gap: 24px;
  --card-inner-gap: 16px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.06), 0 20px 25px -5px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 8px 10px -6px rgba(0, 0, 0, 0.08), 0 30px 60px -12px rgba(0, 0, 0, 0.08);

  /* 排版 */
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
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* 断点 (用于 JS 参考) */
  --breakpoint-xs: 0;
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
  --breakpoint-xxl: 1400px;
}
```

---

## 设计参考来源

1. **Ant Design 5.x** - 企业级产品设计体系
   - https://ant.design/docs/spec/introduce

2. **Material Design 3** - Google 设计系统
   - https://m3.material.io/

3. **8pt Grid System** - 通用间距网格规范
   - https://spec.fm/specifics/8-pt-grid

4. **Figma 社区共识** - 基于 Figma Community 主流设计模板统计
