# uluo-skill-creator 质量增强 Spec

## Why

当前 uluo-skill-creator 实现了基础的"软硬约束分工 + 十阶段流程"，但存在三个差距：

1. **高质量 skill 标准未覆盖**——用户提出 5 个标准（流程编排禁止细节、校验+内部 loop、mermaid 优先、agents 决策、短重点）尚未实现
2. **职能边界未明确**——容易过度设计，需明确"做什么、不做什么"
3. **测试/审计 benchmark 能力缺失**——uluo-skill-creator 应像 skill-creator 一样能独立运行测试、生成 benchmark 数据、启动 viewer，只是角度不同（规范化创建 vs 通用创建），流程和产出对齐

### benchmark 能力对齐分析

| 维度 | skill-creator | uluo-skill-creator（本 skill） |
|------|--------------|------------------------------|
| 角度 | 通用 skill 创建+测试 | 规范化+流程化创建+测试 |
| 测试流程 | evals → with-skill/baseline 并行 → grader 评分 → aggregate → viewer | **相同** |
| benchmark 产出 | benchmark.json + benchmark.md + viewer | **相同** |
| 评分维度 | assertions pass_rate + time + tokens | **相同** + 质量 rubric 评分 |
| 脚本工具 | 自带 run_eval.py / aggregate_benchmark.py / generate_review.py | **引用 skill-creator 的脚本**（远程或本地），不重写 |
| agents | grader.md / analyzer.md / comparator.md | **引用 skill-creator 的 agents**，或自建规范化视角的 agents |

**核心原则**：uluo-skill-creator 不重写 skill-creator 的测试工具，而是引用它们。但要有自己的测试流程编排（Phase 8），产出对齐的 benchmark 数据。

## 职能边界分析

### 核心职能（必做）

```
uluo-skill-creator 职能边界
├── 规范化创建流程（Phase 0-9 编排）
├── 软硬约束分工设计（md vs scripts）
├── 本地硬约束校验（validate-skill.js）
├── 测试/审计 benchmark 流程编排（Phase 8）  ← 对齐 skill-creator
├── SKILL.md 写作规范（流程编排、mermaid、短重点）  ← 新增
├── agents 目录决策规则                              ← 新增
└── 质量评分标准（rubric，作为 benchmark 的额外维度） ← 新增
```

### 不做的事（避免过度设计）

```
不做（引用 skill-creator 完成）
├── 不重写 eval 运行器（引用 run_eval.py）
├── 不重写 benchmark 聚合器（引用 aggregate_benchmark.py）
├── 不重写 viewer（引用 generate_review.py）
├── 不重写 description optimization（引用 run_loop.py）
└── 不重写 package 工具（引用 package_skill.py）
```

**设计原则**：uluo-skill-creator 专注"规范化创建 + 流程编排 + 质量评分"，执行类工具引用 skill-creator。

## What Changes

### MODIFIED: SKILL.md 重构

- **修改** Phase 流程图：plain text art → mermaid flowchart（含 loop 回退）
- **修改** 写作风格：长段落 → "短重点：描述/细节展开"
- **修改** 核心理念章节：精简，细节抽离到 references/
- **新增** 内部 loop 机制：mermaid flowchart 表达校验→回退→重新执行
- **新增** 职能边界章节：明确做什么、不做什么
- **新增** agents 决策指针：引用 references/agents-decision.md
- **修改** Phase 8 重构：从"远程引用 skill-creator 做审计"改为"对齐 skill-creator 的测试/benchmark 流程编排"

### MODIFIED: references/skillmd-spec.md 扩展

- **新增** "SKILL.md 是流程编排，禁止细节"规则
- **新增** "mermaid 优先"规则（流程图、决策树、状态转换用 mermaid）
- **新增** "短重点：描述/细节展开"写作风格指南

### ADDED: references/agents-decision.md

- **新增** agents 目录决策规则（何时需要、何时不需要）
- **新增** 决策树（mermaid flowchart）
- **新增** 子代理设计规范（输入/输出/并行策略）

### ADDED: references/skill-quality-rubric.md

- **新增** skill 质量评分标准（5 维度评分卡）
- **新增** 评分维度：结构合规、流程编排、约束分工、文档质量、测试覆盖
- **新增** 评分等级：A（优秀）/ B（合格）/ C（需改进）/ D（不合格）
- **说明**：rubric 作为 benchmark 的额外维度，与 skill-creator 的 assertions pass_rate/time/tokens 互补

### ADDED: references/benchmark-workflow.md

- **新增** 测试/审计 benchmark 流程规范（对齐 skill-creator）
- **新增** 流程：evals → with-skill/baseline 并行 → grader 评分 → aggregate → viewer
- **新增** 引用 skill-creator 脚本的方式（远程 GitHub raw / npx skills / 本地 fallback）
- **新增** benchmark.json 产出规范（对齐 skill-creator 的 schemas.md）
- **新增** uluo-skill-creator 特有的 rubric 评分如何融入 benchmark

### ADDED: scripts/grade-skill.js

- **新增** 基于 rubric 的评分脚本（5 维度评分）
- **新增** 输出评分报告（JSON + 人类可读）
- **新增** 退出码：A/B → 0，C/D → 1
- **说明**：这是 uluo-skill-creator 特有的，skill-creator 没有 rubric 评分

### ADDED: agents/（如需要）

- **新增** agents/grader.md（如自建规范化视角的 grader）或引用 skill-creator 的
- **新增** agents/analyzer.md（如自建规范化视角的 analyzer）或引用 skill-creator 的
- **说明**：按 agents-decision.md 的决策规则决定是否自建

### MODIFIED: evals/evals.json 完善

- **修改** 增加 assertions（当前只有 prompt/expected_output）
- **新增** 更多测试用例覆盖边界场景

## Impact

- **Affected specs**: `add-uluo-skill-creator`（已完成的初始 spec，本次为增强迭代）
- **Affected code**:
  - `skills/uluo-skill-creator/SKILL.md`（重构）
  - `skills/uluo-skill-creator/references/skillmd-spec.md`（扩展）
  - `skills/uluo-skill-creator/references/agents-decision.md`（新增）
  - `skills/uluo-skill-creator/references/skill-quality-rubric.md`（新增）
  - `skills/uluo-skill-creator/references/benchmark-workflow.md`（新增）
  - `skills/uluo-skill-creator/scripts/grade-skill.js`（新增）
  - `skills/uluo-skill-creator/scripts/__tests__/grade-skill.test.js`（新增）
  - `skills/uluo-skill-creator/evals/evals.json`（完善）
  - `skills/uluo-skill-creator/agents/`（可能新增，按决策规则）
- **Dependencies**: 引用 skill-creator 的脚本工具（run_eval.py / aggregate_benchmark.py / generate_review.py）

## ADDED Requirements

### Requirement: SKILL.md 是流程编排，禁止细节

系统 SHALL 强制 SKILL.md 只写流程编排，禁止具体细节。细节必须抽离到 references/。

#### Scenario: SKILL.md 只包含流程编排

- **WHEN** 编写 SKILL.md
- **THEN** 只包含：Phase 流程图、决策点、引用指针、禁止事项
- **AND** 禁止包含：具体校验逻辑、长代码示例、超过 3 行的描述性段落
- **AND** 细节抽离到 references/，SKILL.md 中只放引用链接 + "何时读取"说明

### Requirement: 流程编排+校验+内部 loop

系统 SHALL 在 SKILL.md 中用 mermaid flowchart 表达流程编排和内部 loop 机制。校验不通过时必须回退到对应 Phase 重新执行。

#### Scenario: mermaid flowchart 表达流程

- **WHEN** 编写 SKILL.md 的流程章节
- **THEN** 使用 mermaid flowchart 而非 plain text art
- **AND** 包含决策节点（如"校验通过？"）
- **AND** 包含回退边（如"不通过 → 回退到 Phase N"）

#### Scenario: 校验不通过触发回退 loop

- **WHEN** Phase 7 校验有 fail
- **THEN** 回退到 Phase 3-6 修复
- **AND** 修复后重新执行 Phase 7 校验
- **AND** 形成 loop 直到全部通过

### Requirement: mermaid 优先

系统 SHALL 在 SKILL.md 和 references/ 中优先使用 mermaid 代码表述图表和逻辑，而非 plain text。

#### Scenario: 流程图用 mermaid

- **WHEN** 需要表达流程、决策树、状态转换
- **THEN** 使用 mermaid flowchart / sequenceDiagram / stateDiagram
- **AND** 禁止使用 plain text art（├ └ │ 等字符画）

### Requirement: agents 目录决策规则

系统 SHALL 提供明确的 agents 目录决策规则，避免过度设计。

#### Scenario: 何时需要 agents 目录

- **WHEN** skill 满足以下任一条件
  - 有可并行的独立任务（如多个文件独立校验）
  - 有需要独立上下文的复杂分析（如影响分析、质量评估）
  - 有需要不同角色协作的流程（如 grader + analyzer + comparator）
- **THEN** 创建 agents/ 目录，为每个角色编写 .md 指令

#### Scenario: 何时不需要 agents 目录

- **WHEN** skill 是简单的线性流程
- **AND** 无并行需求
- **AND** 无独立上下文需求
- **THEN** 不创建 agents/ 目录，所有逻辑在 SKILL.md 中编排

### Requirement: 短重点写作风格

系统 SHALL 在 SKILL.md 中使用"短重点：描述/细节展开"的写作风格，避免长篇大话。

#### Scenario: 章节结构

- **WHEN** 编写 SKILL.md 的章节
- **THEN** 每个章节以【短重点】开头（1-2 句话概括）
- **AND** 后续展开描述/细节（如有需要）
- **AND** 单个章节不超过 20 行（超过的抽离到 references/）

### Requirement: 测试/审计 benchmark 流程对齐 skill-creator

系统 SHALL 提供对齐 skill-creator 的测试/审计 benchmark 流程，使 uluo-skill-creator 能独立运行测试、生成 benchmark 数据、启动 viewer。流程编排自建，执行工具引用 skill-creator。

#### Scenario: benchmark 流程对齐

- **WHEN** Phase 8 执行测试/审计
- **THEN** 流程对齐 skill-creator：
  1. 运行 evals（with-skill + baseline 并行）
  2. grader 评分（评估 assertions）
  3. 聚合 benchmark.json（pass_rate + time + tokens）
  4. 启动 viewer（generate_review.py）
  5. 用户 review
- **AND** 执行工具引用 skill-creator（run_eval.py / aggregate_benchmark.py / generate_review.py）
- **AND** 产出对齐：benchmark.json + benchmark.md + viewer

#### Scenario: rubric 评分作为额外 benchmark 维度

- **WHEN** benchmark 流程完成后
- **THEN** 运行 uluo-skill-creator 特有的 rubric 评分（grade-skill.js）
- **AND** rubric 评分结果融入 benchmark 报告
- **AND** 与 skill-creator 的 assertions pass_rate/time/tokens 互补

#### Scenario: 引用 skill-creator 脚本的方式

- **WHEN** 需要运行 skill-creator 的脚本工具
- **THEN** 按优先级选择：
  1. GitHub raw 读取脚本内容并执行
  2. npx skills 加载完整 skill-creator
  3. 离线 fallback 到本地 skills/skill-creator/

### Requirement: 质量评分标准（rubric）

系统 SHALL 提供 skill 质量评分标准，作为 benchmark 的额外维度。

#### Scenario: 5 维度评分卡

- **WHEN** 评估一个 skill 的质量
- **THEN** 从 5 个维度评分：
  - 结构合规（目录结构、必需文件、plugin.json）
  - 流程编排（Phase 模型、内部 loop、mermaid 图）
  - 约束分工（软硬约束分类、脚本硬约束）
  - 文档质量（SKILL.md 规范、references 引用、短重点风格）
  - 测试覆盖（evals 存在、assertions 完整、测试通过）
- **AND** 每个维度 0-20 分，总分 100 分
- **AND** 等级：A（90+）/ B（70-89）/ C（50-69）/ D（<50）

#### Scenario: 评分脚本可独立执行

- **WHEN** 运行 `node scripts/grade-skill.js <skill-path>`
- **THEN** 输出评分报告（JSON + 人类可读）
- **AND** 报告包含每个维度的得分、扣分原因、改进建议
- **AND** 退出码：A/B → 0，C/D → 1

## MODIFIED Requirements

### Requirement: SKILL.md 重构

当前 SKILL.md（198 行）需重构为 mermaid + 短重点风格，目标行数 < 150 行。

### Requirement: Phase 8 重构

当前 Phase 8 是"远程引用 skill-creator 做审计"，需重构为"对齐 skill-creator 的测试/benchmark 流程编排"。

### Requirement: evals 完善

当前 evals 只有 3 个测试用例无 assertions，需增加 assertions 和边界场景用例。

## REMOVED Requirements

无——本次为增强迭代，不删除现有功能。
