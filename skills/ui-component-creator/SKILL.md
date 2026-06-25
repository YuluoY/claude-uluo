---
name: ui-component-creator
description: >-
  UI 组件库组件创建工作流——支持原子层（Button/Input/Modal 等通用基础组件）和业务层（UserSelect/OrderTable 等组合+业务语义组件）两层组件库。定义从调研、层次定位、API 设计、结构拆分、三层样式分离（结构层/语义层/风格层）、四态质量保障到测试策略的五阶段工作流，按需加载 Vue/React/Web Component 领域知识和风格预设（Apple/Vercel/GitHub/Material）。Use this skill when user asks to create a UI component, build a component library component, design a Button/Input/Modal/Table, or compose business components from atomic ones, or mentions: UI 组件, 组件库, component library, 封装组件, 抽取组件, props, emits, slots, 原子组件, 业务组件. Do NOT use for pure logic utilities, page components, or non-UI business modules.
---

# ui-component-creator

UI 组件库组件创建工作流编排器。本文件定义**与框架无关的五阶段流程**，支持原子层（通用基础组件）和业务层（组合+业务语义组件）两层组件库。框架特定知识（Vue/React/Web Component）是领域化的，按需从 `references/frameworks/` 加载；样式架构和风格预设从 `references/style-architecture.md` 和 `references/style-presets/` 加载。

**核心原则：工作流思想是通用的，框架知识是领域化的。** 先走流程，再选框架。

---

## 工作流总览

```
Phase 1: 调研     → 两种模式：研究先行 / 分析先行后补缺
                   产出：知识缺口清单 + 调研笔记
                        ↓
Phase 2: 需求分析  → 确定组件职责边界、用户故事、API 契约
                   产出：component-spec（props/emits/slots/events 设计）
                        ↓
Phase 3: 结构拆分  → 识别可复用模块、拆分 composable/hook、确定文件结构
                   产出：文件树 + 组合式函数清单
                        ↓
Phase 4: 质量保障  → 四态（loading/error/empty/success）+ a11y + i18n + theme
                   产出：状态矩阵 + 质量检查清单
                        ↓
Phase 5: 测试策略  → 单元测试 + 可访问性测试 + 视觉回归测试
                   产出：测试计划 + 测试用例清单
```

加载策略：Phase 1-2 通用；Phase 3-5 进入框架特定流程时，加载对应的 `references/frameworks/<framework>.md`。

---

## Phase 1: 调研

**目标：** 在写代码前建立足够的领域知识。加载 [references/research-protocol.md](references/research-protocol.md)。

### 两种调研模式

**模式 A — 研究先行（Research-First）**
适用：组件所属领域不熟悉（如首次做图表组件、编辑器组件、复杂表单）。

```
1. 列出知识缺口清单（我不知道什么？）
2. 用 WebSearch / MCP context7 / Tavily 检索
3. 综合调研笔记，提炼关键约束
4. 带着调研结论进入 Phase 2
```

**模式 B — 分析先行后补缺（Analyze-First）**
适用：组件领域有一定基础，但存在不确定点。

```
1. 基于现有知识完成 Phase 2 的初步 API 设计
2. 标记设计中存疑的部分（⚠️ 待验证）
3. 带着具体疑问去检索，针对性补缺
4. 回到 Phase 2 修正设计
```

**选择规则：** 不确定时选模式 A——宁可多调研，不可凭想象设计 API。

### 1.1 组件层次定位

调研阶段必须确定组件属于哪一层。加载 [references/component-layering.md](references/component-layering.md)。

**判定决策树：**

```
组件是否包含业务概念（user/order/product 等）？
├── 否 → 原子层（如 Button、Input、Modal）
└── 是 → 业务层（如 UserSelect、OrderTable）
```

**层次影响后续阶段侧重点：**

| 层次 | Phase 2 侧重 | Phase 3 侧重 | Phase 4 侧重 |
|------|-------------|-------------|-------------|
| 原子层 | API 最小化、正交化 | 完整三层样式分离 | 完整四态 + a11y |
| 业务层 | 业务语义化 API | 原子组件组合策略 | 组合交互 a11y |

决策结果记录到 component-spec.md 的「组件层次定位」节。

---

## Phase 2: 需求分析 + API 设计

**目标：** 定义组件的职责边界和对外契约。加载 [references/api-design.md](references/api-design.md)。

### 2.1 职责边界

回答三个问题：
- **这个组件是什么？**（一句话定义，不超过 20 字）
- **它做什么？**（列出核心职责，每条以动词开头）
- **它不做什么？**（明确非目标，防止职责蔓延）

### 2.2 用户故事

```
作为 <角色>，我希望 <动作>，以便 <价值>
```

覆盖所有受影响角色：最终用户、开发者（使用者）、设计师、运维。

### 2.3 API 契约设计

按以下顺序设计，**顺序不可调换**——先想清楚输入输出，再想内部状态：

| 维度 | 通用问题 | 框架特定（加载对应 reference） |
|------|---------|------------------------------|
| **输入** | 组件接受什么数据？数据形状？必选/可选？ | Vue: props / React: props / WC: attributes |
| **输出** | 组件向外部传递什么？何时传递？ | Vue: emits / React: callback props / WC: CustomEvent |
| **插槽** | 哪些内容需要由调用方注入？ | Vue: slots / React: render props / WC: slot |
| **双向绑定** | 哪些值需要 v-model / controlled？ | Vue: v-model / React: value+onChange / WC: 待定 |
| **状态** | 哪些状态内部管理，哪些交给外部？ | 通用：受控 vs 非受控 |

**API 设计原则（详见 [references/api-design.md](references/api-design.md)）：**
- 最小 API 表面——能内部推导的不要做成 prop
- 合理默认值——80% 场景零配置可用
- 正交设计——props 之间不耦合，不互相暗示
- 向后兼容——新增可选，不破坏已有

### 2.4 产出 component-spec

加载 [examples/component-spec.md](examples/component-spec.md) 模板，填写后作为后续阶段的单一事实来源。

**产出路径：** `<组件目录>/docs/component-spec.md`——文档与组件代码同目录，不分离到 `specs/` 下。

---

## Phase 3: 结构拆分 + 复用识别

**目标：** 确定文件结构和可复用模块。此时加载框架特定 reference。

### 加载框架知识

| 框架 | 加载文件 | 何时加载 |
|------|---------|---------|
| Vue 3 | [references/frameworks/vue.md](references/frameworks/vue.md) | 用户指定 Vue 或项目用 Vue |
| React | [references/frameworks/react.md](references/frameworks/react.md) | 用户指定 React 或项目用 React |
| Web Component | [references/frameworks/web-component.md](references/frameworks/web-component.md) | 用户指定 WC 或需要框架无关组件 |

### 3.1 复用识别

在写新代码前，先回答：
- [ ] 项目中是否已有类似组件？（搜索 `Grep` / `Glob`）
- [ ] 是否有可复用的 composable / hook / utility？
- [ ] 是否有第三方库已解决此问题？（Phase 1 调研应已覆盖）
- [ ] 能否抽取通用逻辑为独立模块，供当前和未来复用？

### 3.2 文件结构

通用原则（框架特定细节见对应 reference）：
- **单一职责**——一个文件一个组件 / 一个 composable / 一个类型定义
- **就近放置**——组件私有子组件放同目录，不污染全局
- **类型先行**——先定义类型，再写实现，最后写测试
- **入口清晰**——index.ts / index.vue / index.jsx 做唯一导出入口
- **文档同目录**——设计文档放 `<组件目录>/docs/`，与代码共存

#### 标准目录结构

```
ComponentName/
├── README.md                   ← 组件入口文档，AI 快速扫描入口（Phase 5 产出）
├── docs/                       ← 设计文档（与代码同目录）
│   ├── research-report.md      ← Phase 1 调研笔记
│   ├── component-spec.md       ← Phase 2 组件设计规格（单一事实来源）
│   └── verification-report.md  ← Phase 5 验收报告（可选）
├── components/                 ← 私有子组件
├── composables/ / hooks/       ← 组合式函数 / Hooks
├── types.ts                    ← 类型定义
├── __tests__/                  ← 测试
└── index.vue / index.ts        ← 入口
```

> 框架特定差异（如 Vue 的 `.vue`、React 的 `.tsx`、WC 的 `.ts`）见 `references/frameworks/` 对应文件。

### 3.3 组合式函数拆分

当组件逻辑超过 150 行，或包含 3 个以上不相关的关注点时，拆分：
- 每个 composable / hook 管理一个关注点
- 命名以 `use` 开头，返回值结构清晰
- 可独立测试，不依赖组件实例

### 3.4 样式架构决策

结构拆分后，确定三层样式划分。加载 [references/style-architecture.md](references/style-architecture.md)。

**三层模型：**

| 层 | 职责 | 示例 |
|----|------|------|
| 结构层 | 布局、尺寸、定位——与风格无关 | Modal 的居中定位、Table 的表格布局 |
| 语义层 | 语义化 token，组件代码只引用这一层 | `var(--color-primary)`、`var(--spacing-md)` |
| 风格层 | 具体 token 值，由预设文件提供 | Apple: `#007AFF`，Vercel: `#000000` |

**决策内容：**
- [ ] 哪些样式属于结构层？（不随风格变化）
- [ ] 哪些样式属于语义层？（可被风格覆盖的 token 引用）
- [ ] 风格层由 `references/style-presets/` 预设文件提供，组件不实现

**业务层额外决策：**
- [ ] 如何继承原子层组件的语义 token？
- [ ] 是否需要定义业务语义 token？（如 `--color-user-avatar-border`，值仍引用语义层）

**风格预设兼容性：** 至少兼容 2 种预设（从 apple/vercel/github/material 中选择）。

---

## Phase 4: 完整状态 + 质量保障

**目标：** 确保组件在各种状态下可用。加载 [references/state-quality.md](references/state-quality.md)。

### 4.1 四态矩阵

每个组件必须考虑四种状态——**缺一不可**：

| 状态 | 问题 | 设计要点 |
|------|------|---------|
| **Loading** | 数据加载中显示什么？ | 骨架屏 > spinner；保持布局稳定防 CLS |
| **Error** | 出错时显示什么？ | 明确错误信息 + 重试操作；不暴露技术细节 |
| **Empty** | 无数据时显示什么？ | 引导用户行动；不显示空白 |
| **Success** | 正常状态是否完整？ | 主流程 + 边界情况（极长文本、极多数据、极宽极窄） |

产出状态矩阵：列出每个状态的 UI 表现和触发条件。

### 4.2 质量检查清单

- [ ] **无障碍（a11y）**：语义化 HTML、ARIA 属性、键盘可达、焦点管理
- [ ] **i18n**：所有用户可见文本走 i18n，不硬编码中文/英文
- [ ] **样式分离验证**：三层分离（结构层/语义层/风格层）+ 风格切换测试（至少 2 种预设）
- [ ] **响应式**：移动端 / 平板 / 桌面三档断点验证
- [ ] **性能**：避免不必要的 re-render / 重复计算；大列表虚拟化
- [ ] **安全**：用户输入转义；不信任外部数据

---

## Phase 5: 测试策略

**目标：** 定义测试计划，确保组件可回归。

### 测试金字塔

```
        /\
       /  \     视觉回归测试（少量）——关键 UI 快照
      /----\
     /      \   可访问性测试（适量）——a11y 规则自动扫描
    /--------\
   /          \ 单元测试（大量）——props/emits/slots/状态逻辑
  /____________\
```

### 5.1 单元测试

覆盖：
- 每个 prop 的默认值和传入值
- 每个 emit / callback 的触发条件和 payload
- 每个插槽的渲染
- 四态的渲染
- 边界情况：空值、极值、非法值

### 5.2 可访问性测试

- axe-core 自动扫描
- 键盘导航流程
- 屏幕阅读器关键路径

### 5.3 视觉回归测试

- 仅对关键 UI 状态做快照
- 四态各一张快照
- 响应式断点各一张

### 5.4 产出/更新 README

测试完成后，产出或更新组件 README.md，作为组件交付的最后一步。加载 [references/readme-convention.md](references/readme-convention.md) 了解结构规范，加载 [examples/README.template.md](examples/README.template.md) 模板填写。

**首次产出（v1.0.0）：**
- 基于 component-spec 和实现填写 9 个 H2 节
- API 参考表格覆盖全部 props/emits/slots/methods
- 变更记录初始化为 v1.0.0

**迭代更新：**
- 更新「元信息」节的版本号（遵循 SemVer）
- 更新「API 参考」对应表格（新增项标注版本，废弃项加 `⚠️ [deprecated since vX.Y.Z]` 标记）
- 在「变更记录」节顶部新增版本条目（倒序，最新在前）

---

## 文件索引

### references/ — 方法论

| 文件 | 内容 | 何时加载 |
|------|------|---------|
| [research-protocol.md](references/research-protocol.md) | 调研协议：知识缺口清单、信息源矩阵、两种调研模式 | Phase 1 必读 |
| [component-layering.md](references/component-layering.md) | 组件库层次设计：原子层/业务层模型、组合关系、判定流程 | Phase 1 必读 |
| [api-design.md](references/api-design.md) | API 设计原则：最小表面、正交设计、默认值、受控/非受控 | Phase 2 必读 |
| [style-architecture.md](references/style-architecture.md) | 三层样式架构：结构层/语义层/风格层、风格切换机制、业务层继承 | Phase 3 必读 |
| [state-quality.md](references/state-quality.md) | 四态矩阵、a11y/i18n/样式分离验证检查清单 | Phase 4 必读 |
| [checklist-bans.md](references/checklist-bans.md) | 检查清单（10 维度 60+ 项）+ 禁止事项（14 条带反例）+ Phase 映射表 | Phase 4-5 完成前必读 |
| [readme-convention.md](references/readme-convention.md) | README 结构规范（9 个固定 H2 节）+ 版本迭代更新策略 + AI 扫描友好设计原则 | Phase 5 产出/更新 README 时必读 |

### references/frameworks/ — 领域知识

| 文件 | 内容 | 何时加载 |
|------|------|---------|
| [vue.md](references/frameworks/vue.md) | Vue 3 组件：SFC 结构、props/emits/slots、composable、provide/inject | 选定 Vue 时 |
| [react.md](references/frameworks/react.md) | React 组件：函数组件、hooks、props/children、context | 选定 React 时 |
| [web-component.md](references/frameworks/web-component.md) | Web Component：Custom Element、Shadow DOM、attributes/properties/events | 选定 WC 时 |

### references/style-presets/ — 风格预设

| 文件 | 风格 | 何时加载 |
|------|------|---------|
| [apple.md](references/style-presets/apple.md) | Apple HIG：清晰/顺应/深度，系统色，毛玻璃 | 需要应用 Apple 风格时 |
| [vercel.md](references/style-presets/vercel.md) | Vercel：极简黑白，高对比度，Geist 字体 | 需要应用 Vercel 风格时 |
| [github.md](references/style-presets/github.md) | GitHub：实用主义，信息密度，Mona Sans | 需要应用 GitHub 风格时 |
| [material.md](references/style-presets/material.md) | Material Design：材质隐喻，物理阴影，Roboto | 需要应用 Material 风格时 |

### examples/ — 模板

| 文件 | 内容 | 何时加载 |
|------|------|---------|
| [component-spec.md](examples/component-spec.md) | 组件设计规格模板 | Phase 2 产出 spec 时 |
| [README.template.md](examples/README.template.md) | 组件 README 模板（9 个 H2 节骨架 + 填写指南） | Phase 5 产出/更新 README 时 |

---

## 质量闸门

组件完成前必须对照检查清单自检。完整检查项（10 个维度、60+ 检查点）见 [references/checklist-bans.md](references/checklist-bans.md)，覆盖职责与 API、四态、a11y（含 WCAG 2.2）、i18n、主题、响应式、性能、安全、测试、可维护性。Phase 4-5 完成前必读。

---

## 禁止事项

12 条禁令及反例见 [references/checklist-bans.md](references/checklist-bans.md) 的「二、禁止事项」模块，每条附 ❌ 错误示例、✅ 正确示例和判定标准。
