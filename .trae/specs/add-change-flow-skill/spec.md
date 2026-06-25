# 需求变更管理工作流 Skill Spec

## Why

当前 `uluo-doc-standards` skill 解决了"从 0 到 1 创建文档"的问题，但开发中更常见的痛点是"从 1 到 1.1"——需求变更后的文档同步。用户反馈：当 spec/设计稿/代码已存在后，需求发生变化时，没有 skill 解决以下问题：

1. **文档与设计稿同步更新**——改了需求，spec 和设计稿对不上
2. **变更留痕**——无法追溯"为什么改、改了什么、影响了什么"
3. **变更精度不足**——变更文档太粗，落到代码层不知道改哪个文件哪一行

用户期望的 workflow：先调研 → 基于当前项目情况思考 → 写变更 spec → 文档分三级逐级递进 → 保证最后实施精准修改。

## 命名统一方案

两个 skill 统一采用 **spec / plan / tasks 三层递进 + checklist 独立验收**：

| 级别 | 创建场景（uluo-doc-standards） | 变更场景（uluo-change-flow） |
|------|------|------|
| L1 spec.md | 需求规格：背景、用户故事、功能需求、验收标准 | 变更规格：变更背景、影响范围、决策结论 |
| L2 plan.md | 技术方案：架构、模块设计、API 契约、测试策略 | 变更方案：delta 规格、技术方案选择 |
| L3 tasks.md | 任务分解：分阶段任务、文件级任务、依赖关系 | 变更任务：文件级任务、调研标注、依赖关系 |
| 独立 checklist.md | 验收检查：从 spec/plan/tasks 抽出的检查点 | 验收检查：从 spec/plan/tasks 抽出的检查点 |

**核心原则**：checklist 不混入任何一层，而是独立的验收层，贯穿 spec/plan/tasks 三层，逐条可勾选。

### 与 uluo-doc-standards 的关系

| 维度 | uluo-doc-standards | uluo-change-flow（本 skill） |
|------|-------------------|---------------------------|
| 场景 | 从 0 创建 | 从 1 到 1.1 变更 |
| 输入 | 用户需求 | 变更需求 + 已有 specs/ 目录 |
| 三层 | spec / plan / tasks | spec / plan / tasks（命名一致） |
| 验收 | checklist.md（独立） | checklist.md（独立） |
| 粒度 | 模块级 | 文件级 / 行号级 |
| 留痕 | CHANGELOG（对外） | change-record（对内，可追溯） |
| 前置 | 无 | 已有 spec.md + 代码 |

**协作模式**：首次创建走 `uluo-doc-standards`，后续变更走 `uluo-change-flow`。两者共享 `specs/` 目录，命名体系完全一致。

## 三级递进 + 独立验收模型

```
变更触发
    │
    ▼
L1: spec.md（宏观 — 范围确定）
    │  回答：变了什么？为什么变？影响范围多大？是否值得做？
    │  产出：变更背景 + 影响范围清单 + 决策结论 + 变更编号
    │  不涉及：具体怎么改、改哪个文件
    │
    ▼
L2: plan.md（中观 — 变更方案）
    │  回答：怎么改？delta 是什么？技术方案选哪个？
    │  产出：变更方案设计 + delta 规格（MODIFIED/ADDED/REMOVED）
    │  允许：方案对比、技术选型、调研结论引用
    │  不涉及：具体文件路径、行号
    │
    ▼
L3: tasks.md（微观 — 执行任务）
    │  回答：哪些地方需要改？每个任务做什么？需要调研吗？
    │  产出：文件级任务清单（路径 + 动词描述）+ 依赖关系
    │  允许：任务前置标注需要调研（WebSearch/MCP/Context7/官网资料）
    │  不涉及：验收检查点（那是 checklist 的事）
    │
    ▼
独立: checklist.md（Review 机制 — 贯穿三层，失败则回退）
    │  回答：spec 的范围都覆盖了吗？plan 的方案都落实了吗？tasks 都执行了吗？
    │  产出：从 spec/plan/tasks 抽出的 review 检查点
    │  逐条 review，不通过则回退到对应层级重新执行
    │  不混入任何一层
    │
    ▼
Review 通过 → 留痕归档
Review 不通过 → 回退到出问题的层级（spec/plan/tasks）→ 修复 → 重新 review
```

### 三层职责边界

| 级别 | 文件 | 职责 | 粒度 | 不做的事 |
|------|------|------|------|---------|
| L1 | spec.md | 范围确定 + 决策 | 模块/章节级 | 不写具体怎么改 |
| L2 | plan.md | 方案设计 + delta | 章节级 | 不写文件路径、行号 |
| L3 | tasks.md | 执行任务 | 文件/模块级 | 不写验收检查点 |
| 独立 | checklist.md | Review 机制（通过/回退） | 贯穿三层 | 不重复各层内容，只抽 review 检查点 |

## What Changes

### 新增 Skill: `uluo-change-flow`

- **新增** `skills/uluo-change-flow/` 目录
- **新增** `SKILL.md`：编排器，定义三级递进 + 独立验收模型、执行协议、场景表
- **新增** `references/impact-analysis-protocol.md`：影响分析协议——如何评估变更对已有文档/代码/设计稿的影响
- **新增** `references/sync-protocol.md`：同步协议——如何确保 spec ↔ 设计稿 ↔ 代码三者一致
- **新增** `examples/spec-template.md`：L1 变更 spec 模板（范围确定）
- **新增** `examples/plan-template.md`：L2 变更 plan 模板（方案设计 + delta）
- **新增** `examples/tasks-template.md`：L3 变更 tasks 模板（执行任务，含调研标注）
- **新增** `examples/checklist-template.md`：独立验收 checklist 模板（贯穿三层）
- **新增** `examples/change-record-template.md`：留痕归档模板
- **新增** `agents/impact-analyzer.md`：影响分析子代理
- **新增** `scripts/validate-change.js`：变更文档校验（三层完整性 + checklist 覆盖 + 同步一致性）
- **新增** `scripts/checks/change-spec.js`：L1 校验
- **新增** `scripts/checks/change-plan.js`：L2 校验
- **新增** `scripts/checks/change-tasks.js`：L3 校验
- **新增** `scripts/checks/change-checklist.js`：checklist 校验（覆盖三层）
- **新增** `scripts/checks/sync-consistency.js`：同步一致性校验
- **修改** `marketplace.json`：注册新 skill

### 不做的事

- **不修改 uluo-doc-standards**——本 spec 只管 uluo-change-flow。uluo-doc-standards 的命名统一（plan/tasks → checklist 抽离）作为独立变更另行处理
- **不做代码自动修改**——只产出精准的修改指令，由开发者/AI 执行
- **不做设计稿自动生成**——只产出设计稿需要改什么的规格

## Impact

- **Affected specs**: 无（新 skill，不修改现有 spec）
- **Affected code**:
  - `skills/uluo-change-flow/`（全部新增）
  - `marketplace.json`（新增注册项）
- **Dependencies**: 依赖 `uluo-doc-standards` 产出的 `specs/` 目录结构

## ADDED Requirements

### Requirement: 三级递进 + 独立验收文档模型

系统 SHALL 提供三级递进的变更文档（spec / plan / tasks）加一个独立的验收文档（checklist），确保变更从决策到实施到验收可追溯。命名与 uluo-doc-standards 统一。

#### Scenario: 需求变更触发三层 + 验收文档产出

- **WHEN** 用户提出需求变更（如"优惠券模块需要支持叠加使用"）
- **AND** 已存在 `specs/coupon-module/` 目录（含 spec.md + plan.md + tasks.md）
- **THEN** 系统产出 L1 变更 spec（`specs/coupon-module/changes/CHG-001/spec.md`）
- **AND** 系统产出 L2 变更 plan（`specs/coupon-module/changes/CHG-001/plan.md`）
- **AND** 系统产出 L3 变更 tasks（`specs/coupon-module/changes/CHG-001/tasks.md`）
- **AND** 系统产出独立验收 checklist（`specs/coupon-module/changes/CHG-001/checklist.md`）
- **AND** 三级逐级递进：L1 范围 → L2 方案 → L3 任务
- **AND** checklist 独立于三层，贯穿验收

#### Scenario: 变更编号唯一且可追溯

- **WHEN** 同一特性目录下产生多次变更
- **THEN** 每次变更分配唯一编号（CHG-001, CHG-002, ...）
- **AND** 每个变更目录包含完整的 spec + plan + tasks + checklist
- **AND** 变更之间有依赖标注（如 CHG-002 依赖 CHG-001 已合并）

### Requirement: L1 变更 spec 聚焦范围确定

系统 SHALL 在 L1 变更 spec 中聚焦于范围确定和决策，不涉及具体实施细节。

#### Scenario: L1 包含影响范围清单

- **WHEN** 产出 L1 变更 spec
- **THEN** spec 包含"影响范围"章节，列出：
  - 受影响的已有 spec 章节（精确到 `## 功能需求 > FR-1`）
  - 受影响的设计稿组件（精确到组件名）
  - 受影响的代码模块（精确到模块/目录，不精确到文件）
- **AND** 每个受影响项标注影响类型：新增 / 修改 / 删除
- **AND** 每个受影响项标注风险等级：高 / 中 / 低

#### Scenario: L1 包含决策结论

- **WHEN** L1 spec 给出"批准/拒绝/需更多信息"决策
- **THEN** 决策必须附带理由
- **AND** 如果是"需更多信息"，列出具体缺失的信息项

#### Scenario: L1 不涉及实施细节

- **WHEN** 编写 L1 变更 spec
- **THEN** 不包含具体文件路径
- **AND** 不包含代码片段
- **AND** 不包含行号
- **AND** 不包含任务执行顺序
- **AND** 不包含技术方案选择（那是 L2 的事）

### Requirement: L2 变更 plan 聚焦方案设计

系统 SHALL 在 L2 变更 plan 中设计变更方案，使用 delta 格式描述对已有文档的修改，不涉及具体文件路径和行号。

#### Scenario: L2 使用 delta 格式

- **WHEN** 变更影响已有 spec.md 的某个章节
- **THEN** plan.md 使用 `### MODIFIED` / `### ADDED` / `### REMOVED` 标记
- **AND** 每个 delta 引用原文位置（如"修改 spec.md 的 `## 功能需求 > FR-1`"）
- **AND** MODIFIED 项包含"原文摘要"和"改为"两部分
- **AND** ADDED 项包含"插入位置"和"新内容"
- **AND** REMOVED 项包含"删除位置"和"删除原因"

#### Scenario: L2 含技术方案选择

- **WHEN** 变更涉及技术选型
- **THEN** plan.md 列出候选方案对比
- **AND** 给出选择结论和理由
- **AND** 允许引用调研结论（来自 tasks 层的调研任务或前置调研）

#### Scenario: L2 不涉及文件级细节

- **WHEN** 编写 L2 变更 plan
- **THEN** 不包含具体文件路径（那是 L3 的事）
- **AND** 不包含行号
- **AND** 不包含任务执行顺序

### Requirement: L3 变更 tasks 聚焦执行任务

系统 SHALL 在 L3 变更 tasks 中列出具体的执行任务，定位到文件级，允许标注需要调研的任务。

#### Scenario: L3 任务定位到文件级

- **WHEN** 产出 L3 变更 tasks
- **THEN** 每个任务包含：
  - 目标文件或模块路径
  - 任务描述（动词开头：修改/新增/删除/重构）
  - 任务类型（代码 / 文档 / 设计稿 / 测试）
- **AND** 任务之间标注依赖关系

#### Scenario: L3 任务可标注需要调研

- **WHEN** 某个任务在实施前需要确认技术方案
- **THEN** 任务标注"需调研"标记
- **AND** 任务列出建议的调研方式（WebSearch / MCP Context7 / GitHub / 官网文档）
- **AND** 调研不是强制步骤——如果开发者已了解方案，可直接跳过

#### Scenario: L3 不涉及验收检查点

- **WHEN** 编写 L3 变更 tasks
- **THEN** 不包含验收检查点（那是独立 checklist 的事）
- **AND** 不包含"怎么验证改对了"（那是 checklist 的事）

### Requirement: 独立 checklist 作为 Review 机制

系统 SHALL 提供独立的 checklist 文档作为 review 机制，从 spec/plan/tasks 三层中抽出 review 检查点。如果 review 发现问题，必须回退到出问题的层级重新执行，修复后重新 review。

#### Scenario: checklist 覆盖三层 review

- **WHEN** 产出 checklist
- **THEN** checklist 包含三个分组：
  - **spec review**：影响范围是否都覆盖？决策结论是否落实？
  - **plan review**：delta 是否都已应用？技术方案是否按选型实施？
  - **tasks review**：每个任务是否执行完成？调研结论是否记录？
- **AND** 每条检查点可勾选（`- [ ]` 通过 / `[-]` 不通过）

#### Scenario: checklist 不重复各层内容

- **WHEN** 编写 checklist
- **THEN** 不重复 spec 的范围描述
- **AND** 不重复 plan 的方案设计
- **AND** 不重复 tasks 的任务描述
- **AND** 只抽取"可 review 的检查点"

#### Scenario: Review 不通过则回退

- **WHEN** checklist review 过程中某条检查点不通过
- **THEN** 标注该检查点为不通过（`[-]`）
- **AND** 记录不通过原因
- **AND** 标注需回退到的层级（spec / plan / tasks）
- **AND** 回退到对应层级，修复问题
- **AND** 修复后重新产出受影响的下游文档（如 spec 回退则 plan/tasks 需同步更新）
- **AND** 重新执行 checklist review

#### Scenario: Review 全部通过才可归档

- **WHEN** checklist 中所有检查点均为通过状态（`[x]`）
- **THEN** review 结论为"通过"
- **AND** 可以进入留痕归档阶段
- **AND** 如果有任何检查点未通过，不可归档

### Requirement: 变更留痕可追溯

系统 SHALL 为每次变更产出可追溯的变更记录，归档到特性目录下。

#### Scenario: 变更记录归档

- **WHEN** 变更执行完成并通过校验
- **THEN** 系统在 `specs/<feature>/changes/CHG-<NNN>/` 下产出 `change-record.md`
- **AND** 记录包含：变更编号、变更日期、变更发起人、变更原因、影响清单、执行结果、验收结论
- **AND** 记录引用原始 spec 和变更后 spec 的 diff

#### Scenario: 变更历史可查询

- **WHEN** 用户查询某特性的变更历史
- **THEN** 系统列出 `specs/<feature>/changes/` 下所有 CHG-<NNN> 目录
- **AND** 每条记录显示编号、日期、变更摘要、状态（已合并/已拒绝/进行中）

### Requirement: 同步一致性校验

系统 SHALL 提供变更后的同步一致性校验，确保 spec ↔ plan ↔ tasks ↔ checklist 四者对齐，且与代码一致。校验失败等同于 review 不通过，触发回退流程。

#### Scenario: 变更后文档与代码一致

- **WHEN** 变更任务执行完成，进入 review 阶段
- **THEN** 系统运行 `validate-change.js` 校验：
  - L1 spec 中标记的影响范围，在 L2 plan 中都有对应 delta
  - L2 plan 中的每个 delta，在 L3 tasks 中都有对应任务
  - L3 tasks 中的每个任务，在 checklist 中都有对应 review 检查点
  - checklist 中所有检查点已 review 通过（`[x]`）
  - 变更后的 spec.md 与代码实现一致（调用 uluo-doc-standards 的 validate-docs.js）
- **AND** 校验失败时给出具体的未同步项
- **AND** 校验失败触发回退：标注不通过的检查点 + 回退层级 + 修复后重新校验

### Requirement: 影响分析子代理

系统 SHALL 提供影响分析子代理，在 L1 阶段自动扫描已有文档和代码，产出结构化影响清单。

#### Scenario: 子代理扫描已有文档

- **WHEN** 启动 impact-analyzer 子代理
- **AND** 输入变更需求 + 特性目录路径
- **THEN** 子代理读取该目录下的 spec.md / plan.md / tasks.md
- **AND** 子代理读取相关代码文件（根据 spec 的影响范围章节定位）
- **AND** 子代理产出影响清单：受影响章节 + 受影响模块 + 影响类型 + 风险等级

## 执行协议

```
Phase 0: 获取作者 → 运行 git config user.name
Phase 1: 识别变更 → 解析变更需求，定位目标特性目录
          如果目标特性不存在 → 提示走 uluo-doc-standards 创建
Phase 2: 影响调研 → 🎯 启动 impact-analyzer 子代理
          扫描已有 spec/plan/tasks + 相关代码
          产出影响清单（受影响章节 + 模块 + 风险）
Phase 3: 产出 L1 spec → 加载 examples/spec-template.md
          基于影响清单，产出变更 spec（范围确定 + 决策）
          不涉及具体怎么改
Phase 4: 产出 L2 plan → 加载 examples/plan-template.md
          产出变更方案（delta 规格 + 技术选型）
          不涉及文件路径、行号
Phase 5: 产出 L3 tasks → 加载 examples/tasks-template.md
          产出执行任务清单（文件/模块级 + 动词描述）
          允许标注"需调研"任务（WebSearch/MCP/Context7）
Phase 6: 产出 checklist → 加载 examples/checklist-template.md
          从 spec/plan/tasks 三层抽出 review 检查点
          独立于三层，逐条可 review
Phase 7: 执行变更 → 按 L3 tasks 逐项执行
          修改 spec.md / plan.md / tasks.md / 代码 / 设计稿
Phase 8: Review → 逐条检查 checklist
          ├─ 全部通过 → 进入 Phase 9
          └─ 有不通过 → 回退到出问题的层级（spec/plan/tasks）
                         ├─ 修复该层级文档
                         ├─ 同步更新下游受影响文档
                         └─ 重新执行相关任务 → 重新 review（回到 Phase 8）
Phase 9: 留痕归档 → 加载 examples/change-record-template.md
          产出 change-record.md，归档到 changes/CHG-<NNN>/
          记录 review 通过结论 + 回退历史（如有）
```

### 场景跳过规则

| 变更规模 | 跳过 | 文档产出 |
|---------|------|---------|
| 小变更（单字段/单样式） | Phase 2 可从简 | spec + tasks + checklist（L2 合并到 L1） |
| 中变更（单模块功能调整） | 无 | 完整 spec + plan + tasks + checklist |
| 大变更（跨模块/架构调整） | 无 | 完整四文档 + 复盘 |
| 紧急修复 | Phase 2/3 跳过 | tasks + checklist + 事后补 spec |

## 文件存放约定

```
specs/<feature-name>/
├── spec.md                          ← 原始 spec（被变更修改）
├── plan.md                          ← 原始 plan（被变更修改）
├── tasks.md                         ← 原始 tasks（被变更修改）
├── changes/                         ← 变更归档目录
│   ├── CHG-001/                     ← 第一次变更
│   │   ├── spec.md                  ← L1 变更 spec（范围确定）
│   │   ├── plan.md                  ← L2 变更 plan（方案设计 + delta）
│   │   ├── tasks.md                 ← L3 变更 tasks（执行任务）
│   │   ├── checklist.md             ← 独立验收 checklist（贯穿三层）
│   │   └── change-record.md         ← 留痕归档（执行后产出）
│   ├── CHG-002/                     ← 第二次变更
│   │   └── ...
│   └── CHANGELOG-changes.md         ← 变更历史索引（所有变更摘要）
└── verification-report.md
```

## MODIFIED Requirements

### Requirement: marketplace.json 注册

`marketplace.json` 新增 `uluo-change-flow` 条目，source 指向 `./skills/uluo-change-flow`。

## REMOVED Requirements

无——本 skill 不删除任何现有功能。
