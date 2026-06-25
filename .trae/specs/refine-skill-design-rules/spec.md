# 完善 skill 设计规则 Spec

## Why

用户指出三个关键纠正：

1. **产出 skill 也要遵循高质量标准**——当前 references/ 中的规范（skillmd-spec.md 等）被误解为只给 uluo-skill-creator 自身用。实际上，这些规范是**用户使用 uluo-skill-creator 创建 skill 时，产出的 skill 也必须遵循的设计要求**。需要在规范中明确这一点。

2. **补充内容结构化描述**——除了"短重点：描述"写作风格，还需要让内容结构化描述（表格、列表、代码块、mermaid 图），避免长段落。

3. **放宽 SKILL.md 行数限制**——SKILL.md 虽然是流程编排，但如果有重点内容也可以放里面。150 行限制太严格，应放宽。行数不是质量指标，"短重点 + 结构化"才是。

## What Changes

### MODIFIED: references/skillmd-spec.md

- **修改** 明确规范的适用范围：不仅 uluo-skill-creator 自身遵循，**它创建的 skill 也必须遵循**
- **新增** "内容结构化描述"规则——除了短重点，还要用表格/列表/代码块/mermaid 结构化呈现
- **修改** 行数约束：放宽限制（< 300 行正常，300-500 警告，≥ 800 fail）
- **修改** "SKILL.md 是流程编排，禁止细节"规则——补充"重点内容可以放 SKILL.md，但要结构化呈现"

### MODIFIED: references/skill-quality-rubric.md

- **修改** 文档质量维度的评分细则：
  - 行数约束放宽（< 300 得 5 分，300-499 得 4 分，500-799 得 2 分，≥800 得 0 分）
  - 新增"内容结构化"评分项（检查是否使用表格/列表/mermaid 等结构化格式）

### MODIFIED: scripts/grade-skill.js

- **修改** 文档质量维度的行数评分逻辑（放宽阈值）
- **新增** 内容结构化检查（检查 SKILL.md 是否包含表格、列表、mermaid 等结构化格式）

### MODIFIED: scripts/checks/skillmd.js

- **修改** 行数校验阈值（< 300 正常，300-500 警告，≥ 800 fail）

### MODIFIED: SKILL.md

- **修改** 禁止事项中的行数约束描述
- **新增** 明确 references/ 规范适用于"产出的 skill"

## Impact

- **Affected code**:
  - `skills/uluo-skill-creator/references/skillmd-spec.md`（修改）
  - `skills/uluo-skill-creator/references/skill-quality-rubric.md`（修改）
  - `skills/uluo-skill-creator/scripts/grade-skill.js`（修改）
  - `skills/uluo-skill-creator/scripts/checks/skillmd.js`（修改）
  - `skills/uluo-skill-creator/SKILL.md`（修改）
  - `skills/uluo-skill-creator/scripts/__tests__/`（更新测试）

## ADDED Requirements

### Requirement: 规范适用于产出的 skill

系统 SHALL 明确 references/ 中的设计规范不仅适用于 uluo-skill-creator 自身，更适用于**用户使用 uluo-skill-creator 创建的所有 skill**。

#### Scenario: 创建 skill 时应用规范

- **WHEN** 用户使用 uluo-skill-creator 创建新 skill
- **THEN** 产出的 skill 必须遵循 references/ 中的设计规范
- **AND** 包括：流程编排禁止细节、mermaid 优先、短重点+结构化、agents 决策规则
- **AND** Phase 7 校验时检查产出 skill 是否符合这些规范

### Requirement: 内容结构化描述

系统 SHALL 要求 SKILL.md 和 references/ 的内容结构化描述，除了"短重点"写作风格，还要用表格、列表、代码块、mermaid 图等结构化格式呈现。

#### Scenario: 结构化呈现

- **WHEN** 编写 SKILL.md 或 references/ 文档
- **THEN** 优先使用结构化格式：
  - 表格（对比、清单、映射）
  - 列表（步骤、规则、禁止事项）
  - 代码块（命令、示例、mermaid）
  - mermaid 图（流程、决策、状态）
- **AND** 避免超过 3 行的纯文本段落
- **AND** "短重点"开头 + 结构化展开

## MODIFIED Requirements

### Requirement: SKILL.md 行数约束放宽

当前行数约束（< 150 行目标，< 500 警告，≥ 800 fail）过于严格。修改为：
- < 300 行：正常
- 300-500 行：警告（建议拆分）
- 500-799 行：强警告
- ≥ 800 行：fail（必须拆分）

**理由**：SKILL.md 是流程编排，但重点内容可以放里面。行数不是质量指标，"短重点 + 结构化"才是。

### Requirement: "流程编排禁止细节"规则补充

当前规则禁止细节。补充：重点内容可以放 SKILL.md，但要结构化呈现（表格/列表/mermaid），而非长段落。

## REMOVED Requirements

无。
