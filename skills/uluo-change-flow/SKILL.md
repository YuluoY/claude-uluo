---
name: uluo-change-flow
description: >-
  需求变更管理工作流——三级递进变更文档（spec/plan/tasks）+ 独立 checklist review 机制，解决需求变更后文档/设计稿/代码同步更新和变更留痕。面向开发者同行，文档写回代码仓库。Use this skill whenever the user asks to handle requirement changes, update existing specs, sync documents after changes, or any task that sounds like it needs structured change management — even if the user doesn't explicitly mention change-flow. Also use when the user mentions any of: 变更, 需求变化, 改需求, 文档同步, 变更留痕, change management, spec update, or any task that sounds like it needs structured change tracking for existing features.
---

# uluo-change-flow

需求变更管理工作流。本文件是**编排器**——定义三级递进变更文档（spec/plan/tasks）+ 独立 checklist review 机制的概念模型、执行流程、子代理调度和加载策略。模板见 `examples/`，子代理指令见 `agents/`，硬约束校验见 `scripts/`。

---

## 概述

当 spec/设计稿/代码已存在后需求发生变化时，如何同步更新文档并留痕？这是本 skill 解决的核心问题。

直接改代码不留痕、改了代码忘了改 spec、改了 spec 忘了改 plan——这些是变更管理最常见的痛点。本 skill 用「三级递进 + 独立验收」模型强制变更过程结构化：

- **三级递进**：spec（范围）→ plan（方案）→ tasks（执行），粒度由粗到细，每层只回答一个问题
- **独立验收**：checklist 贯穿三层，逐条 review，失败则回退到对应层级重新执行

变更不是"再写一遍"，而是"在已有文档上做增量"。原始 spec/plan/tasks 被修改，变更过程归档到 `changes/CHG-<NNN>/`。

---

## 三级递进 + 独立验收模型

四份文档不是平级清单，而是三层递进 + 一层独立验收——

```
L1 spec.md      变更范围确定（宏观）
  变了什么？为什么变？影响范围多大？是否值得做？
  ├ 变更背景 → 影响范围清单 → 决策结论 → 变更编号
  └ 不涉及具体怎么改、改哪个文件

L2 plan.md      变更方案设计（中观）
  怎么改？delta 是什么？技术方案选哪个？
  ├ 变更方案设计 → delta 规格（MODIFIED/ADDED/REMOVED）
  └ 允许方案对比、技术选型；不涉及文件路径、行号

L3 tasks.md     执行任务清单（微观）
  哪些地方需要改？每个任务做什么？需要调研吗？
  ├ 文件级任务清单（路径 + 动词描述）→ 依赖关系
  └ 允许标注"需调研"任务（WebSearch/MCP/Context7/官网资料）；不涉及验收检查点

独立 checklist.md   Review 机制（贯穿三层）
  从 spec/plan/tasks 抽出 review 检查点
  ├ 逐条 review → 通过 / 回退到对应层级
  └ 不重复各层内容，只抽 review 检查点
```

**关键关系链：**
- **spec → plan → tasks** 是粒度递进链：范围 → 方案 → 执行，每层只回答一个问题
- **checklist 独立于三层**：不重复内容，只抽检查点；失败则回退，不绕过
- **三层职责严格隔离**：spec 不写怎么改、plan 不写文件路径、tasks 不写验收检查点

---

## 三层职责边界

| 级别 | 文件 | 职责 | 粒度 | 不做的事 |
|------|------|------|------|---------|
| L1 | spec.md | 范围确定 + 决策 | 模块/章节级 | 不写具体怎么改 |
| L2 | plan.md | 方案设计 + delta | 章节级 | 不写文件路径、行号 |
| L3 | tasks.md | 执行任务 | 文件/模块级 | 不写验收检查点 |
| 独立 | checklist.md | Review 机制（通过/回退） | 贯穿三层 | 不重复各层内容，只抽 review 检查点 |

---

## 与 uluo-doc-standards 的关系

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
- uluo-doc-standards 是"全量创建"模式，uluo-change-flow 是"增量变更"模式
- 变更过程中，原始 spec/plan/tasks 会被修改（不是只读），变更过程归档到 `changes/`

---

## 执行协议

AI 接到变更需求后，按十阶段递进执行。中变更及以上建议在 Phase 2 启用子代理（见 [子代理调度](#子代理调度)）：

```
Phase 0: 获取作者 → 运行 git config user.name，将输出作为所有文档的「作者」字段值。
                   禁止使用占位符或字面量 "git config user.name"。

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

🔧  文档产出后，运行 scripts/validate-change.js 做硬约束校验
    node scripts/validate-change.js specs/<feature>/changes/CHG-<NNN>/ --strict
```

---

## 场景跳过规则

| 变更规模 | 跳过 | 文档产出 |
|---------|------|---------|
| 小变更（单字段/单样式） | Phase 2 可从简 | spec + tasks + checklist（L2 合并到 L1） |
| 中变更（单模块功能调整） | 无 | 完整 spec + plan + tasks + checklist |
| 大变更（跨模块/架构调整） | 无 | 完整四文档 + 复盘 |
| 紧急修复 | Phase 2/3 跳过 | tasks + checklist + 事后补 spec |

**默认走中变更方案。** 不确定时走完整流程——宁可多写文档，不可事后补。

---

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

**关键约定：**
- 原始 spec/plan/tasks 位于特性目录顶层，变更时被修改（不是只读）
- 每次变更归档到独立的 `CHG-<NNN>/` 目录，编号递增（CHG-001、CHG-002...）
- `CHANGELOG-changes.md` 是变更历史索引，汇总所有变更摘要
- `change-record.md` 在 Phase 9 执行后产出，记录 review 结论和回退历史

---

## checklist review 状态约定

checklist.md 中每条检查点使用以下状态标记：

- `[ ]` 待 review
- `[x]` review 通过
- `[-]` review 不通过（需标注回退层级和原因）

**回退标注格式：**
```
- [-] 检查点描述
  → 回退层级：L2 plan
  → 原因：delta 规格遗漏了 REMOVED 项
  → 处理：修复 plan.md → 同步更新 tasks.md → 重新 review
```

---

## 文档产出后校验

```
🔧  文档产出后，运行 scripts/validate-change.js 做硬约束校验
    node scripts/validate-change.js specs/<feature>/changes/CHG-<NNN>/ --strict
```

校验覆盖（7 步管线）：目录结构、L1 spec（变更背景/影响范围/决策结论）、L2 plan（delta 格式/字段完整性）、L3 tasks（任务字段/动词开头/调研标注）、checklist（三分组/检查点格式/结论一致性）、同步一致性（spec→plan→tasks→checklist 对齐 + 代码对齐）、change-record（归档文档完整性，如存在）。

---

## 子代理调度

中变更及以上场景，建议在 Phase 2 启用子代理执行影响调研：

| 子代理 | 指令文件 | 触发阶段 | 用途 |
|--------|---------|---------|------|
| **impact-analyzer** | [agents/impact-analyzer.md](agents/impact-analyzer.md) | Phase 2 | 影响调研——扫描已有 spec/plan/tasks + 相关代码，产出受影响章节、模块、风险清单 |

**调度规则：**
- **impact-analyzer**：中变更及以上必启，大变更建议拆分模块分派多个并行
- 小变更和紧急修复可跳过子代理，直接在主循环中完成影响调研

---

## 质量闸门

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

---

## 禁止事项

- **禁止跳过 checklist 直接执行**——checklist 是变更质量的最后一道闸门
- **禁止 checklist 不通过却继续推进**——必须回退到对应层级修复
- **禁止只归档不更新原始文档**——原始 spec/plan/tasks 必须同步修改
- **禁止三层职责越界**——spec 不写怎么改、plan 不写文件路径、tasks 不写验收点
- **禁止 checklist 重复三层内容**——checklist 只抽 review 检查点，不复制文档正文
- **禁止变更编号跳号**——CHG-001 → CHG-002 连续递增
- **禁止事后补 change-record**——Phase 9 留痕归档在 review 通过后立即执行
