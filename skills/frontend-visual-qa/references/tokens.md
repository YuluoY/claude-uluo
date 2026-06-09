# Design Tokens 体系

**加载条件：** 任何前端任务默认加载。token 体系是视觉一致性的地基，没有它之前不写页面级样式。

> 参考：[W3C Design Tokens Specification](https://www.designtokens.org/tr/drafts/)（2025.10 稳定版）、[Martin Fowler — Design Token-Based UI Architecture](https://martinfowler.com/articles/design-token-based-ui-architecture.html)
> 三阶架构（Primitive → Semantic → Component）是行业标准。命名规范遵循 `category-property-variant-state` 模式。AI 辅助开发的核心理念见 [Boldare — Design System for AI-Assisted Development](https://www.boldare.com/blog/design-system-ai-assisted-development/)。
> CSS 变量实现细节见 uluo `languages/css.md` §三 §四。主题/dark mode 的前端工程侧见 uluo `infrastructure-setup.md`。

## 目录

- [一、为什么 token 体系对 AI 生成代码特别重要](#一为什么-token-体系对-ai-生成代码特别重要)
- [二、三阶架构](#二三阶架构)
  - [Primitive Tokens（原值层）](#primitive-tokens原值层)
  - [Semantic Tokens（语义层）★ 最重要](#semantic-tokens语义层-最重要)
  - [Component Tokens（组件层）](#component-tokens组件层)
- [三、命名规范](#三命名规范)
- [四、颜色策略选择](#四颜色策略选择)
- [五、主题切换机制](#五主题切换机制)
- [六、最少起步集](#六最少起步集)
- [七、取值原则](#七取值原则)

---

## 一、为什么 token 体系对 AI 生成代码特别重要

AI 的核心洞察（Boldare, 2026）："AI 工具不创造设计债务——它们加速已有系统或系统的缺失。" Token 体系就是让 AI 输出走向一致而非走向碎片的那条轨道。

具体来说：语义 token 的命名告诉 AI"这个颜色是主操作按钮的背景"而不是"这个颜色是蓝色 #500"。AI 从 token 名字推断用法，绕开了根据外观值猜测导致的随意挑选。没有 token 体系的代码库，AI 每次生成都在重新发明一套颜色——token 体系是阻止这种扩散的唯一手段。

## 二、三阶架构

W3C Design Tokens Community Group（2025.10 稳定版）和几乎所有成熟设计系统采用同一套三阶结构。每层引用下层，组件只跟上层对话。

```
Primitive（原值层）    →  纯值，无语义。调色板、间距刻度、字号阶梯。
                          只被 Semantic 层引用，组件绝不直接使用。

Semantic（语义层）★    →  给原值赋予意图和角色。告诉系统"这个颜色是干什么的"。
                          主题切换在这里发生——不是改组件。

Component（组件层）    →  Semantic token 绑定到具体 UI 元素。
                          组件只知道 token 名字，不知道值。
```

### Primitive Tokens（原值层）

纯值。不传达意图，只提供选项。

```json
{
  "color-blue-500": { "value": "#2563EB" },
  "color-blue-600": { "value": "#1D4ED8" },
  "color-gray-100": { "value": "#F3F4F6" },
  "color-gray-900": { "value": "#111827" },
  "space-4": { "value": "16px" },
  "space-8": { "value": "32px" },
  "font-size-lg": { "value": "1.125rem" }
}
```

核心原则：
- **保持私有**。Primitive 不暴露给组件。开发者和 AI 应该通过语义层引用，而不是从调色板里随意挑选。
- **只放"合理选项"**。不是所有颜色都要放入 primitive——只有项目中实际可能用到的色彩阶梯。
- **颜色策略从策略轴选定后再定义 primitive**（见下 §四）。策略决定 primitive 的数量和粒度。

### Semantic Tokens（语义层）★ 最重要

这一层是杠杆支点。它将"这是什么颜色"翻译成"这个颜色干什么"。

```json
{
  "color-action-primary": { "value": "{color-blue-500}" },
  "color-action-primary-hover": { "value": "{color-blue-600}" },
  "color-text-primary": { "value": "{color-gray-900}" },
  "color-text-secondary": { "value": "{color-gray-500}" },
  "color-surface-page": { "value": "{color-gray-50}" },
  "color-surface-elevated": { "value": "{color-white}" },
  "color-border-default": { "value": "{color-gray-200}" },
  "color-feedback-error": { "value": "{color-red-500}" }
}
```

核心原则：
- **按目的命名，不按外观**。`color-action-primary` 描述的是角色，不是颜色。值从蓝色换成绿色，名字不动。
- **每个语义 token 是一对多关系**。同一个 `color-text-primary` 在亮色模式指向 `gray-900`，在暗色模式指向 `gray-100`。
- **这是主题切换发生的地方**（见下 §五）。

语义层最小覆盖：
| 类别 | token | 说明 |
|------|-------|------|
| 文本 | text-primary, text-secondary, text-disabled | 正文、辅助、禁用文字 |
| 表面 | surface-page, surface-elevated, surface-overlay | 页面底、卡片/面板、弹层背景 |
| 边框 | border-default, border-strong | 默认分隔、强调边框 |
| 操作 | action-primary, action-primary-hover, action-primary-active | 主操作按钮三态 |
| 状态 | feedback-error, feedback-warning, feedback-success, feedback-info | 含文字色和浅底色 |

### Component Tokens（组件层）

语义 token 的组件级绑定。组件只知道这个名字，不知道背后的值和主题。

```json
{
  "button-primary-bg": { "value": "{color-action-primary}" },
  "button-primary-bg-hover": { "value": "{color-action-primary-hover}" },
  "button-primary-text": { "value": "{color-text-on-primary}" },
  "input-border": { "value": "{color-border-default}" },
  "input-border-focus": { "value": "{color-action-primary}" }
}
```

核心原则：
- **新建项目先不做这一层**。等 semantic 覆盖了 2-3 个页面、组件模式稳定后再提取。
- **当同一个 semantic token 的用法在不同组件里意义不同时**，才需要 component token。否则组件直接用 semantic。

## 三、命名规范

全系统统一 `category-property-variant-state` 模式，kebab-case。

```
color-text-primary-hover
│     │    │       │
类别  属性  变体    状态
```

- **按目的，不按外观**：`color-action-primary`，不是 `blue-500-btn`。值可以变，名字不动。
- **相对值用 t-shirt sizes**：`spacing-xs / sm / md / lg / xl`。避免数字序号——因为你不知道将来会不会需要在 4 和 5 之间插入一个值。
- **全小写连字符**：`color-feedback-error`，不是 `colorFeedbackError` 或 `COLOR_FEEDBACK_ERROR`（CSS 变量中 `--` 前缀自然适配 kebab-case）。
- **可预测的排序**：如果有一个 `color-text-primary`，就不要再来一个 `text-color-secondary`。类别在前，属性在后，保持一致。

## 四、颜色策略选择

不是所有项目都需要同样的颜色复杂度。策略决定 primitive 层颜色的数量和粒度：

- **Restrained**（product 默认）：tinted neutrals + 一个 accent ≤10%。生产力工具、SaaS、中后台的标准选择。中性色承担结构，强色只给主操作、选中态和状态指示。
- **Committed**（品牌页面）：一个饱和色占 30-60% 的表面。适用于品牌 identity 驱动的 landing page、营销页。
- **Full palette**（campaign）：3-4 命名角色色，每个有明确的语义角色。适用于品牌 campaign、数据可视化。
- **Drenched**（品牌 hero）：表面就是颜色本身。只适用于品牌 hero 区域或 campaign 的单一页面。

策略决定 primitive 的数量——Restrained 只需 15-20 个 primitive，Full palette 需要 30-40 个。**不要为了"完整性"把策略往上推。**

## 五、主题切换机制

主题切换不是"给组件写两套样式"。核心机制是**语义层重映射**。

亮色模式：
```
color-text-primary   → primitive gray-900
color-surface-page   → primitive gray-50
color-action-primary → primitive blue-500
```

暗色模式（同一个 semantic token，不同的 primitive 指向）：
```
color-text-primary   → primitive gray-100
color-surface-page   → primitive gray-950
color-action-primary → primitive blue-400
```

组件代码不变：
```css
.button {
  background: var(--color-action-primary);
  color: var(--color-text-on-primary);
}
```
`--color-action-primary` 在亮色下解析为 `blue-500`，在暗色下解析为 `blue-400`。组件不知道也不关心。

这个机制同样适用于：
- **多品牌**：同一套 semantic token，每个品牌换一套 primitive
- **密度切换**：`spacing-component-gap` 在 comfortable 模式下指向 `space-4`，在 compact 下指向 `space-2`
- **高对比度模式**：`color-text-secondary` 重映射到更深的灰度阶梯

## 六、最少起步集

新项目从 30-40 个 token 起步。比你以为需要的少。只在具体页面需要某个 token 时才加。定期删未引用的。

### Primitive（约 20 个）
- Color：gray ramp × 5 阶（50/100/300/500/700/900）+ brand × 3 阶（400/500/600）+ red × 2（500/600）+ green × 2（500/600）
- Spacing：4/8 基数 × 5（8/16/24/32/48px 即 space-2/4/6/8/12）
- Font size：5 阶（xs/sm/base/lg/xl）
- Border radius：3 阶（sm/md/full）

### Semantic（约 15 个）
- text-primary, text-secondary, text-disabled
- surface-page, surface-elevated, surface-overlay
- border-default, border-strong
- action-primary, action-hover, action-active
- feedback-error, feedback-warning, feedback-success, feedback-info

### Component（0 个起步）
等 semantic 覆盖了 2-3 个页面、出现"同一 semantic token 在不同组件里意义不同"的情况时再加。过早提取 component token 是 token bloat 的第一大来源。

## 七、取值原则

- 不硬编码一个通用审美。实际值来自项目、组件库、产品密度和用户任务。
- 生产力界面默认由中性色和层级关系承担结构，强色只用于主操作、状态、焦点、选中和危险操作。
- 页面级样式中不出现原始颜色值——除非正在定义 primitive token 本身。
- 组件级覆盖必须保持 token 驱动和作用域清晰；不能为单个页面再造一套视觉系统。
