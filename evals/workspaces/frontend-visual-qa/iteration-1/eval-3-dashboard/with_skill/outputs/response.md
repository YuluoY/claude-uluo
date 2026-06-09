# 后台首页 - 设计响应

## 任务理解

用户要求：一个现代化的后台首页（admin dashboard），好看、现代。

由于用户未指定技术栈、组件库或业务领域，按 skill 的"最少 AQ 规则"默认自主判断：生成一个独立的、可直接在浏览器打开的 HTML 文件，使用原生 HTML/CSS/JS 实现，无需构建步骤。

## 设计策略概述

### 策略选择：Restrained（克制型）

遵循 skill 的默认审美方向——后台产品优先清晰、可扫描、高效率。使用 Restrained 颜色策略：中性色承担结构，单一 accent 色（indigo）仅用于主操作、选中态和状态标记。

### 信息架构

页面信息架构回答"用户打开这个页面要做什么"：

1. **数据概览（首屏核心）**：4 张指标卡片，一眼看清总营收、活跃用户、新增订单、转化率四个关键指标
2. **趋势监控**：收入趋势图，7 天柱状图，掌握近期走向
3. **操作跟进**：最近动态时间线，了解待处理事项
4. **数据明细**：最近订单表格，可排序可扫描

布局采用标准后台三区模型：
- 导航区：左侧固定侧栏（256px），主导航 + 管理导航分组
- 内容区：顶部固定 header（64px）+ 可滚动内容区
- 上下文区：右侧最近动态面板

## 设计决策与 Skill 合规对照

### 必读模块对照

| Skill 要求 | 实现方式 |
|-----------|---------|
| 三阶 Token 体系 | `:root` 中定义 Primitive tokens（slate ramp, indigo accent, spacing scale, font scale, radius）；Semantic tokens 引用 Primitive；暗色主题通过 `[data-theme="dark"]` 重映射 Semantic 层 |
| 眯眼测试 | 指标卡片使用加粗大字（1.5-1.875rem）+ 浅色标签，表格标题弱化（uppercase x-small gray），强色仅用于主操作按钮和状态徽章 |
| 尺度比例 | 4 个字重层级：2xl 标题 / base 面板标题 / sm 正文 / xs 辅助文案，相邻层级差距 >= 1.25 倍 |
| Gestalt 分组 | Section 间距 64px，Component 间距 24px，Element 间距 8-16px。卡片之间用 border + 间距隔离，卡片内部紧凑 |
| 认知负荷 | 每个 section 有明确功能理由，无装饰性内容，无 hero，无冗余副本 |
| 可供性 | 按钮有明确的背景色、hover 态、active 缩放反馈；图标按钮有 hover 背景变化；链接有下划线；表格行有 hover 高亮 |
| 间距空间系统 | 严格 8px 基数：space-2(8) ~ space-16(64)，间距值的选择反映元素关系紧密度 |

### 一票否决项检查

| 否决项 | 状态 |
|-------|------|
| emoji / 文本符号充当图标 | 通过 - 全部使用 SVG 图标 |
| 移动端横向溢出 | 通过 - stats grid 使用 auto-fit minmax，表格有 overflow-x:auto，无固定宽度 |
| 无 Token 就写页面样式 | 通过 - 所有颜色/间距/字号/圆角均通过 CSS 变量引用 |
| 渐变/彩边/阴影过多 | 通过 - 仅图表使用 indigo 渐变，卡片使用 1px 边框 + 极淡阴影 |
| 缺少关键状态 | 通过 - 覆盖 hover/active/focus-visible/disabled；badge 覆盖 success/warning/error/info；趋势指示器覆盖 up/down |
| 硬编码颜色导致主题不可切换 | 通过 - 所有颜色通过 Semantic token，暗色模式完整工作 |
| 路由内容区机械重复标题+描述 | 通过 - 页面标题仅在提供上下文时出现，主要内容是数据卡片、图表、表格 |
| 使用 hero 级字体处理面板标题 | 通过 - 页面标题为 24px(2xl)，面板标题为 16px(base) |

### 反模式检查

| 反模式 | 判定 | 处理 |
|-------|------|------|
| 紫色渐变调色板 | 判定：AI 高频默认 | 未使用 - 选择 slate + indigo restrained palette |
| 营销页幻觉 | 判定：工具/后台页面生成 hero | 未使用 - 直接展示数据工作面 |
| emoji 图标 | 判定：符号代替图标 | 未使用 - 全部 SVG |
| 卡片泛滥 | 判定：card 套 card | 仅面板级使用卡片容器，内部用布局和间距组织 |
| 状态缺失 | 判定：只有默认态 | 覆盖 hover/active/focus-visible；badge 多状态；趋势指示器 |
| 无 tokens | 判定：散写 hex/px | 全部通过 CSS variables 的 token 体系 |
| 假精确数字 | 判定：编造整齐数字 | 使用符合真实业务场景的合理示例数据，非整数百分比 |
| 通用人名 | 判定：John Doe 类 | 使用中文真实感姓名（王磊、李明慧、陈建国等） |
| 图标无文字标签 | 判定：纯图标按钮 | 侧栏导航项全部图标+文字；header 图标按钮有 aria-label |
| 破坏性操作紧邻确认 | 判定：无间距分离 | 不适用（当前页面无破坏性操作） |
| gradient blob 代替真实视觉 | 判定：渐变占位符 | 未使用 - 图表使用真实数据渲染的柱状图 |
| 固定卡片尺寸 | 判定：文案溢出 | 使用 grid auto-fit + minmax 弹性布局，百分比宽度 |
| 弱可供性 | 判定：看不出可点击 | 按钮有背景色+圆角+hover；链接有颜色区分；交互元素有 cursor:pointer |

### 响应式策略

- 基础样式为移动端，通过 min-width media query 叠加复杂度
- 768-1023px：侧栏折叠为 overlay 抽屉，两列布局变为单列
- <640px：搜索框隐藏，统计卡片单列堆叠，内容区 padding 缩减
- 表格使用 `overflow-x:auto` 处理窄屏横向滚动
- 触控目标 >= 44x44px
- 使用 `100dvh` 而非 `100vh` 避免 iOS Safari 地址栏问题

### 暗色模式

通过 `[data-theme="dark"]` 选择器重映射 Semantic tokens，包括：
- 文本色反转（dark text -> light text）
- 表面色加深（light surface -> dark surface）
- 边框色调整
- Accent 色亮度上移一级（indigo-600 -> indigo-500）保证对比度
- 阴影加深

切换按钮通过 localStorage 持久化，并检测 `prefers-color-scheme` 系统偏好。

## 文件清单

| 文件 | 说明 |
|-----|------|
| `index.html` | 完整的后台首页，包含 CSS token 体系、侧栏导航、header、统计卡片、收入趋势图、最近动态、订单表格、暗色模式、响应式布局和基础交互 |
| `response.md` | 本文件：设计解释、决策记录和合规对照 |

## 使用方式

直接在浏览器中打开 `index.html` 即可查看。无需任何构建工具或依赖安装。
