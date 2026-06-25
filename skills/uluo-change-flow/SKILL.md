---
name: uluo-change-flow
version: 0.1.0
description: >-
  需求变更管理工作流——三级递进变更文档（spec/plan/tasks）+ 独立 checklist review 机制，解决需求变更后文档/设计稿/代码同步更新和变更留痕。面向开发者同行，文档写回代码仓库。Use this skill whenever the user asks to handle requirement changes, update existing specs, sync documents after changes, or any task that sounds like it needs structured change management — even if the user doesn't explicitly mention change-flow. Also use when the user mentions any of: 变更, 需求变化, 改需求, 文档同步, 变更留痕, change management, spec update, or any task that sounds like it needs structured change tracking for existing features.
---

# uluo-change-flow

需求变更管理工作流。本文件是**编排器**——定义三级递进变更文档（spec/plan/tasks）+ 独立 checklist review 机制的概念模型、执行流程、子代理调度和加载策略。模板见 `examples/`，子代理指令见 `agents/`，硬约束校验见 `scripts/`。

---

## 概述

**核心问题**：已有文档发生需求变化时如何同步更新并留痕。

直接改代码不留痕、改了代码忘了改 spec——这些是变更管理最常见的痛点。本 skill 用「三级递进 + 独立验收」模型强制变更过程结构化：

- **三级递进**：spec（范围）→ plan（方案）→ tasks（执行），粒度由粗到细
- **独立验收**：checklist 贯穿三层，逐条 review，失败则回退到对应层级

变更不是"再写一遍"，而是"在已有文档上做增量"。原始 spec/plan/tasks 被修改，变更过程归档到 `changes/CHG-<NNN>/`。

---

## 三级递进 + 独立验收模型

**四文档模型**：spec（范围）→plan（方案）→tasks（执行）+checklist（验收）。

```mermaid
flowchart TD
    L1["L1 spec.md<br/>变更范围确定（宏观）<br/>变了什么/为什么/影响多大"]
    L2["L2 plan.md<br/>变更方案设计（中观）<br/>怎么改/delta/技术选型"]
    L3["L3 tasks.md<br/>执行任务清单（微观）<br/>文件级任务/依赖/调研标注"]
    CL["独立 checklist.md<br/>Review 机制（贯穿三层）<br/>逐条 review/通过/回退"]
    L1 --> L2 --> L3
    L1 -.抽取检查点.-> CL
    L2 -.抽取检查点.-> CL
    L3 -.抽取检查点.-> CL
    CL -.失败回退.-> L1
    CL -.失败回退.-> L2
    CL -.失败回退.-> L3
```

**关键关系链：**
- **spec → plan → tasks** 是粒度递进链：范围 → 方案 → 执行
- **checklist 独立于三层**：不重复内容，只抽检查点；失败则回退，不绕过
- **三层职责严格隔离**：spec 不写怎么改、plan 不写文件路径、tasks 不写验收检查点

---

## 三层职责边界

**职责隔离**：每层只回答一个问题，不越界。

| 级别 | 文件 | 职责 | 粒度 | 不做的事 |
|------|------|------|------|---------|
| L1 | spec.md | 范围确定 + 决策 | 模块/章节级 | 不写具体怎么改 |
| L2 | plan.md | 方案设计 + delta | 章节级 | 不写文件路径、行号 |
| L3 | tasks.md | 执行任务 | 文件/模块级 | 不写验收检查点 |
| 独立 | checklist.md | Review 机制（通过/回退） | 贯穿三层 | 不重复各层内容，只抽 review 检查点 |

---

## 与 uluo-doc-standards 的关系

**分工边界**：首次创建走 doc-standards，后续变更走 change-flow。

| 维度 | uluo-doc-standards | uluo-change-flow |
|------|--------------------|------------------|
| 模式 | 全量创建 | 增量变更 |
| 触发时机 | 首次创建特性 | 已有特性发生需求变化 |
| 共享资源 | `specs/<feature>/` 目录 | 同一目录 |
| 命名体系 | spec/plan/tasks | spec/plan/tasks + checklist |
| 产出位置 | `specs/<feature>/` 顶层 | `specs/<feature>/changes/CHG-<NNN>/` |

**核心规则：**
- 首次创建走 uluo-doc-standards，后续变更走 uluo-change-flow
- 两者共享 `specs/` 目录，命名体系完全一致
- 变更过程中，原始 spec/plan/tasks 会被修改（不是只读），变更过程归档到 `changes/`

---

## 软硬约束分工

**约束分工**：md 写 AI 判断，scripts 写确定性校验。

| 约束 | 载体 | 适用 |
|------|------|------|
| 软约束 | SKILL.md + references/ + examples/ | 变更流程编排、三级文档模型、场景跳过规则、质量检查清单 |
| 硬约束 | scripts/ | 目录结构校验、L1/L2/L3/checklist 格式校验、同步一致性校验 |

---

## 执行协议

**十阶段流程**：Phase 0-9 递进执行，Phase 8 review 失败回退。

### Phase 0-5：产出文档

```mermaid
flowchart TD
    P0["Phase 0 获取作者<br/>git config user.name"]
    P1["Phase 1 识别变更<br/>定位目标特性目录"]
    P2["Phase 2 影响调研<br/>启用 impact-analyzer"]
    P3["Phase 3 产出 L1 spec<br/>加载 spec-template"]
    P4["Phase 4 产出 L2 plan<br/>加载 plan-template"]
    P5["Phase 5 产出 L3 tasks<br/>加载 tasks-template"]
    P0 --> P1 --> P2 --> P3 --> P4 --> P5
```

- Phase 0：禁止使用占位符或字面量 "git config user.name"
- Phase 1：目标特性不存在 → 提示走 uluo-doc-standards 创建
- Phase 2：扫描已有 spec/plan/tasks + 相关代码，产出影响清单（受影响章节 + 模块 + 风险）
- Phase 3-5：每层只回答本层问题，不越界；允许标注"需调研"任务（WebSearch/MCP/Context7/官网资料）

### Phase 6-9：执行 + Review + 归档

```mermaid
flowchart TD
    P6["Phase 6 产出 checklist<br/>从三层抽 review 检查点"]
    P7["Phase 7 执行变更<br/>按 L3 tasks 逐项执行"]
    P8["Phase 8 Review<br/>逐条检查 checklist"]
    P9["Phase 9 留痕归档<br/>产出 change-record.md"]
    V["运行 validate-change.js<br/>--strict 硬约束校验"]
    P6 --> P7 --> P8
    P8 -->|全部通过| V
    P8 -->|有不通过| BACK["回退到出问题层级<br/>修复→同步下游→重新 review"]
    BACK --> P8
    V -->|通过| P9
    V -->|失败| FIX["回退到出问题层级修复"]
    FIX --> P6
```

- Phase 6：checklist 独立于三层，逐条可 review
- Phase 7：修改 spec.md / plan.md / tasks.md / 代码 / 设计稿
- Phase 8：回退时修复该层级文档 + 同步更新下游 + 重新执行相关任务
- Phase 9：记录 review 通过结论 + 回退历史（如有），归档到 `changes/CHG-<NNN>/`

---

## 场景跳过规则

**按规模跳过**：小/中/大/紧急四档，默认走中变更方案。

| 变更规模 | 跳过 | 文档产出 |
|---------|------|---------|
| 小变更（单字段/单样式） | Phase 2 可从简 | spec + tasks + checklist（L2 合并到 L1） |
| 中变更（单模块功能调整） | 无 | 完整 spec + plan + tasks + checklist |
| 大变更（跨模块/架构调整） | 无 | 完整四文档 + 复盘 |
| 紧急修复 | Phase 2/3 跳过 | tasks + checklist + 事后补 spec |

**默认走中变更方案。** 不确定时走完整流程——宁可多写文档，不可事后补。

---

## 文件存放约定

**目录结构**：原始文档在顶层，变更归档到 changes/CHG-<NNN>/。

- `specs/<feature-name>/`
  - `spec.md` / `plan.md` / `tasks.md` ← 原始文档（被变更修改）
  - `changes/`
    - `CHG-001/` → spec.md / plan.md / tasks.md / checklist.md / change-record.md
    - `CHG-002/` → ...
    - `CHANGELOG-changes.md` ← 变更历史索引
  - `verification-report.md`

**关键约定：**
- 原始 spec/plan/tasks 位于特性目录顶层，变更时被修改（不是只读）
- 每次变更归档到独立的 `CHG-<NNN>/` 目录，编号递增（CHG-001、CHG-002...）
- `CHANGELOG-changes.md` 汇总所有变更摘要
- `change-record.md` 在 Phase 9 执行后产出，记录 review 结论和回退历史

---

## checklist review 状态约定

**三态标记**：[ ]待review/[x]通过/[-]不通过（标注回退）。

checklist.md 中每条检查点使用以下状态标记：

- `[ ]` 待 review
- `[x]` review 通过
- `[-]` review 不通过（需标注回退层级和原因）

**回退标注格式：**
- `[-] 检查点描述`
  - 回退层级：L2 plan
  - 原因：delta 规格遗漏了 REMOVED 项
  - 处理：修复 plan.md → 同步更新 tasks.md → 重新 review

---

## 文档产出后校验

**硬约束校验**：validate-change.js 七步管线全覆盖。

```
node scripts/validate-change.js specs/<feature>/changes/CHG-<NNN>/ --strict
```

校验覆盖（7 步管线）：目录结构、L1 spec（变更背景/影响范围/决策结论）、L2 plan（delta 格式/字段完整性）、L3 tasks（任务字段/动词开头/调研标注）、checklist（三分组/检查点格式/结论一致性）、同步一致性（spec→plan→tasks→checklist 对齐 + 代码对齐）、change-record（归档文档完整性，如存在）。

---

## references 引用时机

| references 文件 | 何时读取 |
|----------------|---------|
| [impact-analysis-protocol.md](references/impact-analysis-protocol.md) | Phase 2 影响调研时 |
| [sync-protocol.md](references/sync-protocol.md) | Phase 7 执行变更同步文档时 |

---

## 子代理调度

**并行调研**：中变更以上启用 impact-analyzer 子代理。

| 子代理 | 指令文件 | 触发阶段 | 用途 |
|--------|---------|---------|------|
| **impact-analyzer** | [agents/impact-analyzer.md](agents/impact-analyzer.md) | Phase 2 | 影响调研——扫描已有 spec/plan/tasks + 相关代码，产出受影响章节、模块、风险清单 |

**调度规则：**
- **impact-analyzer**：中变更及以上必启，大变更建议拆分模块分派多个并行
- 小变更和紧急修复可跳过子代理，直接在主循环中完成影响调研

---

## 质量闸门

**自检清单**：四文档齐全+编号连续+职责边界+同步更新+留痕归档。

任何变更文档产出后必须自检：

- [ ] 四文档齐全（spec/plan/tasks/checklist）？紧急修复除外
- [ ] 变更编号连续（CHG-001 → CHG-002，不跳号）？
- [ ] 三层职责边界清晰（spec 不写怎么改、plan 不写文件路径、tasks 不写验收点）？
- [ ] checklist 独立于三层，只抽 review 检查点，不重复内容？
- [ ] 原始 spec/plan/tasks 已同步修改（不是只归档不更新）？
- [ ] change-record.md 记录了 review 结论和回退历史（如有）？

### spec 专项
- [ ] 变更背景说明了 why（业务驱动 / 技术驱动 / 缺陷修复）？
- [ ] 影响范围清单覆盖了所有受影响模块和章节？
- [ ] 决策结论明确（做 / 不做 / 部分做）？

### plan 专项
- [ ] delta 规格区分了 MODIFIED / ADDED / REMOVED？
- [ ] 技术选型有方案对比（如有多个候选）？

### tasks 专项
- [ ] 每个任务有明确的文件路径 + 动词描述？
- [ ] "需调研"任务标注了调研方式（WebSearch/MCP/Context7/官网资料）？
- [ ] 依赖关系明确（任务间的前置后置）？

### checklist 专项
- [ ] 检查点从三层抽出，覆盖 spec/plan/tasks 各层关键点？
- [ ] 每条检查点可独立 review（不依赖其他检查点的结论）？
- [ ] 回退标注完整（层级 + 原因 + 处理）？

### change-record 专项（归档时）
- [ ] 元数据完整（变更编号/日期/发起人/状态）？
- [ ] 执行结果数字一致（任务数 = 完成数 + 失败数）？
- [ ] Review 结论与 checklist 一致？
- [ ] 回退历史已记录（如有回退）？
- [ ] Diff 引用完整（spec/plan/tasks/代码 四项）？

```mermaid
flowchart TD
    DOC[文档产出] --> V{validate-change.js 通过?}
    V -->|失败| FIX[回退到出问题的层级修复]
    FIX --> DOC
    V -->|通过| REVIEW[Phase 8 Review]
    REVIEW --> R{全部通过?}
    R -->|失败| BACK[回退到对应层级]
    BACK --> DOC
    R -->|通过| ARCHIVE[Phase 9 留痕归档]
```

---

## 禁止事项

**七条禁令**：跳过checklist/不通过却推进/只归档不更新/职责越界/重复内容/编号跳号/事后补record。

- **禁止跳过 checklist 直接执行**——checklist 是变更质量的最后一道闸门
- **禁止 checklist 不通过却继续推进**——必须回退到对应层级修复
- **禁止只归档不更新原始文档**——原始 spec/plan/tasks 必须同步修改
- **禁止三层职责越界**——spec 不写怎么改、plan 不写文件路径、tasks 不写验收点
- **禁止 checklist 重复三层内容**——checklist 只抽 review 检查点，不复制文档正文
- **禁止变更编号跳号**——CHG-001 → CHG-002 连续递增
- **禁止事后补 change-record**——Phase 9 留痕归档在 review 通过后立即执行
