# UI 组件库 skill 重定位 + 样式结构分离 + 层次设计 Spec

## Why

当前 skill 名为 `component-creator`，定位为「通用组件创建」，但实际只适合 UI 组件库场景。非 UI 组件（纯逻辑工具函数、业务模块、页面组件）不应触发此 skill。

同时，UI 组件库的组件需要支持**样式与结构分离**——同一套组件结构，切换不同视觉风格（Apple HIG / Vercel / GitHub / Material 等）时只需替换样式层，不改组件代码。

此外，组件库本身有**层次设计**需求：原子化通用组件库（Button/Input/Modal 等基础组件）和业务层复用组件库（基于原子组件封装的 UserSelect/OrderTable 等业务组件）都可以用此 skill 创建，但两者设计考量不同——原子层注重通用性、样式分离、a11y；业务层注重组合原子组件、业务语义、领域抽象。

## What Changes

- **BREAKING** 重命名 skill：`component-creator` → `ui-component-creator`（目录、plugin.json、marketplace.json、SKILL.md frontmatter 全部同步）
- **BREAKING** 调整 description 和触发条件：明确限定为「UI 组件库组件」（含原子层和业务层），排除纯逻辑/页面组件
- **新增** `references/component-layering.md`——组件库层次设计指南，定义原子层和业务层的职责边界、设计差异、组合关系
- **新增** `references/style-architecture.md`——样式与结构分离架构指南，定义三层样式模型（结构层 / 语义层 / 风格层）和风格切换机制
- **新增** `references/style-presets/` 目录——预置风格预设（apple.md / vercel.md / github.md / material.md），每个预设定义该风格的 token 值
- **修改** `SKILL.md`——Phase 1 新增「组件层次定位」决策点，Phase 3 新增「样式架构决策」步骤
- **修改** `references/state-quality.md`——主题检查项扩展为「样式分离验证」
- **修改** `references/checklist-bans.md`——新增样式分离检查项和禁令
- **修改** `references/frameworks/*.md`——三个框架的样式实现示例改为三层分离架构
- **修改** `examples/README.template.md`——元信息表新增「组件层次」和「风格兼容性」字段
- **修改** `examples/component-spec.md`——新增「组件层次定位」和「样式架构」节
- **修改** `scripts/validate_output.py`——新增样式分离和层次标注检查项

## Impact

- Affected specs: component-creator skill（重命名为 ui-component-creator）
- Affected code:
  - `skills/component-creator/` → `skills/ui-component-creator/`（目录重命名）
  - `skills/ui-component-creator/SKILL.md`
  - `skills/ui-component-creator/.claude-plugin/plugin.json`
  - `skills/ui-component-creator/references/component-layering.md`（新建）
  - `skills/ui-component-creator/references/style-architecture.md`（新建）
  - `skills/ui-component-creator/references/style-presets/apple.md`（新建）
  - `skills/ui-component-creator/references/style-presets/vercel.md`（新建）
  - `skills/ui-component-creator/references/style-presets/github.md`（新建）
  - `skills/ui-component-creator/references/style-presets/material.md`（新建）
  - `skills/ui-component-creator/references/state-quality.md`
  - `skills/ui-component-creator/references/checklist-bans.md`
  - `skills/ui-component-creator/references/frameworks/vue.md`
  - `skills/ui-component-creator/references/frameworks/react.md`
  - `skills/ui-component-creator/references/frameworks/web-component.md`
  - `skills/ui-component-creator/examples/README.template.md`
  - `skills/ui-component-creator/examples/component-spec.md`
  - `skills/ui-component-creator/scripts/validate_output.py`
  - `marketplace.json`
  - `CLAUDE.md`

## ADDED Requirements

### Requirement: skill 重命名为 ui-component-creator

skill SHALL 重命名为 `ui-component-creator`，明确限定为 UI 组件库组件创建（含原子层和业务层）。

#### Scenario: 目录重命名

- **WHEN** 执行重命名
- **THEN** `skills/component-creator/` 目录 SHALL 重命名为 `skills/ui-component-creator/`

#### Scenario: frontmatter 和 plugin.json 更新

- **WHEN** 查看 SKILL.md frontmatter
- **THEN** `name` 字段 SHALL 为 `ui-component-creator`
- **AND** description SHALL 明确包含「UI 组件库」限定词，覆盖原子层和业务层

#### Scenario: marketplace.json 更新

- **WHEN** 查看 marketplace.json
- **THEN** component-creator 条目 SHALL 更新为 ui-component-creator，source 指向新目录

### Requirement: 触发条件调整为 UI 组件库专用

description SHALL 明确触发场景为 UI 组件库组件（原子层 + 业务层），排除非 UI 组件。

#### Scenario: 应触发场景

- **WHEN** 用户说以下任一短语
  - 「创建一个 UI 组件」「封装一个 UI 组件库组件」
  - 「设计一个 Button/Input/Modal/Table 组件」（原子层）
  - 「基于 Button 封装一个 UserSelect 组件」「封装一个 OrderTable 业务组件」（业务层）
  - 「组件库的组件」「UI component」「component library」
- **THEN** skill SHALL 触发

#### Scenario: 不应触发场景

- **WHEN** 用户说以下任一短语
  - 「写一个工具函数」「封装一个 hook」（纯逻辑）
  - 「创建一个页面」「写一个路由组件」（页面组件）
  - 「重构业务模块」（非组件类业务模块）
- **THEN** skill SHALL NOT 触发

### Requirement: 组件库层次模型

系统 SHALL 定义两层组件库模型，原子层和业务层都可由此 skill 创建。

#### Scenario: 原子层（Atomic Layer）

- **WHEN** 创建原子层组件
- **THEN** 组件 SHALL 具备以下特征：
  - 通用性强，不包含业务语义（如 Button、Input、Modal、Table）
  - 完整的三层样式分离（结构层/语义层/风格层）
  - 完整的四态处理（loading/error/empty/success）
  - 完整的 a11y 支持
  - 风格预设兼容（至少支持 2 种预设）
  - API 设计最小化，正交化

#### Scenario: 业务层（Business Layer）

- **WHEN** 创建业务层组件
- **THEN** 组件 SHALL 具备以下特征：
  - 基于原子层组件组合封装（如 UserSelect 组合 Input + Popover + List）
  - 包含业务语义（如 UserSelect 知道「用户」概念，OrderTable 知道「订单」概念）
  - 样式继承原子层组件的样式分离架构，不引入新的硬编码
  - 四态处理可委托给原子层组件（如 loading 委托给 Button 的 loading 态）
  - a11y 由原子层组件保证，业务层补充组合交互的 a11y
  - API 设计面向业务场景，提供领域语义化的 props

#### Scenario: 层次组合关系

- **WHEN** 业务层组件组合原子层组件
- **THEN** 业务层组件 SHALL 通过原子层组件的公开 API 组合，不直接访问原子层内部实现
- **AND** 业务层组件的样式继承原子层的语义 token，不覆盖原子层的结构层样式

### Requirement: 组件层次定位决策

Phase 1 SHALL 新增「组件层次定位」决策点，在调研阶段确定组件属于原子层还是业务层。

#### Scenario: 决策内容

- **WHEN** Phase 1 调研阶段
- **THEN** SHALL 确定组件层次：
  - **原子层**：组件是否是通用基础组件（无业务语义）？
  - **业务层**：组件是否基于原子组件组合 + 业务语义？
- **AND** 决策结果记录到 component-spec.md 的「组件层次定位」节

#### Scenario: 层次影响后续阶段

- **WHEN** 确定组件层次后
- **THEN** 后续阶段的侧重点 SHALL 不同：
  - 原子层：Phase 2 侧重 API 最小化，Phase 3 侧重完整三层样式分离，Phase 4 侧重完整四态和 a11y
  - 业务层：Phase 2 侧重业务语义化 API，Phase 3 侧重原子组件组合策略，Phase 4 侧重组合交互的 a11y

### Requirement: 三层样式架构

系统 SHALL 定义三层样式模型，实现样式与结构分离。

#### Scenario: 三层定义

- **WHEN** 创建 UI 组件库组件
- **THEN** 样式 SHALL 分为三层：
  - **结构层（Structural）**：布局、尺寸、定位——与风格无关，组件固有（如 Modal 的居中定位、Table 的表格布局）
  - **语义层（Semantic）**：语义化 token，与风格解耦（如 `--color-primary`、`--spacing-md`、`--radius-button`）
  - **风格层（Thematic）**：具体 token 值，由风格预设提供（如 Apple 风格的 `--color-primary: #007AFF`，Vercel 风格的 `--color-primary: #000000`）

#### Scenario: 组件代码只引用语义层

- **WHEN** 编写组件样式（原子层或业务层）
- **THEN** 组件代码 SHALL 只引用语义层 token（如 `var(--color-primary)`），不直接引用风格层值（如 `#007AFF`）

#### Scenario: 风格切换零代码改动

- **WHEN** 切换风格预设（如从 Apple 切换到 Vercel）
- **THEN** 组件代码 SHALL 无需任何改动（原子层和业务层均如此）
- **AND** 只需替换风格层的 token 值定义

#### Scenario: 业务层样式继承

- **WHEN** 业务层组件组合原子层组件
- **THEN** 业务层组件 SHALL 继承原子层的语义 token 引用，不引入新的硬编码值
- **AND** 业务层组件可定义业务语义 token（如 `--color-user-avatar-border`），但值仍引用语义层（如 `var(--color-border)`）

### Requirement: 风格预设文件

系统 SHALL 提供预置风格预设，定义各风格的 token 值。

#### Scenario: 预置风格

- **WHEN** 查看 `references/style-presets/` 目录
- **THEN** SHALL 包含至少 4 个风格预设文件：
  - `apple.md`——Apple HIG 风格
  - `vercel.md`——Vercel 风格
  - `github.md`——GitHub 风格
  - `material.md`——Material Design 风格

#### Scenario: 预设文件内容

- **WHEN** 查看任一风格预设文件
- **THEN** SHALL 包含：
  - 风格名称和设计理念
  - 完整的 token 值定义（颜色、间距、字号、圆角、阴影、动效）
  - 暗色模式 token 值
  - CSS 变量定义块（可直接复制使用）

### Requirement: 样式架构决策步骤

Phase 3 SHALL 新增「样式架构决策」步骤，在结构拆分时确定三层样式划分。

#### Scenario: 决策内容

- **WHEN** Phase 3 拆分组件结构
- **THEN** SHALL 产出样式架构决策：
  - 哪些样式属于结构层（组件固有，不可被风格覆盖）
  - 哪些样式属于语义层（可被风格覆盖的 token 引用）
  - 风格层由预设文件提供，组件不实现
- **AND** 对于业务层组件，还需确定如何继承原子层组件的样式架构

### Requirement: README 元信息新增字段

README 元信息表 SHALL 新增「组件层次」和「风格兼容性」字段。

#### Scenario: 元信息表更新

- **WHEN** 查看 README 元信息表
- **THEN** SHALL 包含：
  - 「组件层次」字段：值为 `原子层` 或 `业务层`
  - 「风格兼容性」字段：值为 `apple, vercel, github, material` 或 `全部` 或特定子集

### Requirement: component-spec 新增节

component-spec.md 模板 SHALL 新增「组件层次定位」和「样式架构」节。

#### Scenario: 组件层次定位节

- **WHEN** 填写 component-spec
- **THEN** 「组件层次定位」节 SHALL 包含：
  - 层次分类（原子层/业务层）
  - 如为业务层，列出依赖的原子层组件
  - 设计侧重点说明

#### Scenario: 样式架构节

- **WHEN** 填写 component-spec
- **THEN** 「样式架构」节 SHALL 包含：
  - 结构层样式清单
  - 语义层 token 清单
  - 风格兼容性声明

### Requirement: 样式分离检查项

checklist-bans.md SHALL 新增样式分离检查项。

#### Scenario: 检查项

- **WHEN** 验证组件样式
- **THEN** SHALL 检查：
  - 组件样式无硬编码颜色值（必须走语义 token）
  - 组件样式无硬编码间距/字号/圆角（必须走语义 token）
  - 结构层样式与语义层样式分离（结构层用固定值或独立 token）
  - 风格切换测试通过（至少切换 2 种预设验证 UI 正确）
  - 业务层组件不引入新的硬编码值（继承原子层语义 token）

### Requirement: 样式分离禁令

checklist-bans.md SHALL 新增禁令：禁止在组件代码中硬编码风格层值。

#### Scenario: 禁令内容

- **WHEN** 编写组件样式（原子层或业务层）
- **THEN** 禁止在组件代码中出现具体颜色值（如 `#007AFF`）、具体间距值（如 `16px`）——这些属于风格层，必须走语义 token

### Requirement: validate_output.py 新增检查

确定性检查脚本 SHALL 新增样式分离和层次标注检查项。

#### Scenario: 检查项

- **WHEN** 运行 validate_output.py
- **THEN** SHALL 检查：
  - README 元信息表包含「组件层次」字段
  - README 元信息表包含「风格兼容性」字段
  - README 中无硬编码颜色值（正则匹配 `#[0-9a-fA-F]{3,8}`）
  - component-spec.md（如存在）包含「样式架构」节

## MODIFIED Requirements

### Requirement: SKILL.md Phase 1

Phase 1 SHALL 新增「组件层次定位」决策点。

### Requirement: SKILL.md Phase 3

Phase 3 SHALL 在结构拆分后新增「3.4 样式架构决策」步骤。

### Requirement: SKILL.md Phase 4

Phase 4 的主题检查 SHALL 扩展为「样式分离验证」，不仅检查「用 token」，还检查「三层分离」和「风格切换通过」。

### Requirement: state-quality.md 主题检查

主题检查项 SHALL 从「颜色用 token」扩展为「结构层/语义层/风格层三层分离 + 风格切换测试」。

### Requirement: 框架 reference 样式示例

vue.md / react.md / web-component.md 的样式实现示例 SHALL 改为三层分离架构，展示如何引用语义层 token。
