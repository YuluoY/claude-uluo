# uluo-skill-creator Spec

## Why

当前 `skill-creator`（anthropics 原版）是通用 skill 创建器，依赖 md 指令对 AI 做软约束，存在三个问题：

1. **软约束不可靠**——md 指令对 AI 是"建议"而非"强制"，AI 可能跳过结构校验、frontmatter 规范、脚本可执行性检查
2. **流程非结构化**——skill-creator 描述了"草稿→测试→迭代"循环，但没有明确的 Phase 模型和质量闸门
3. **token 浪费**——本该用脚本确定性执行的固定流程（目录结构校验、frontmatter 校验、脚本可执行性检查），却写成长篇 md 让 AI 逐字阅读

用户期望：md 只写需要 AI 判断的部分（决策逻辑、流程编排、何时调用什么），能用脚本确定的就写脚本（硬约束稳住下限，利用 node/python 生态提升能力，降低 token 消耗）。skill-creator 降级为"校验审计工具"，通过远程引用使用（GitHub raw 读取或 npx skills 加载），不依赖本地相对路径。

## 核心理念：软约束 + 硬约束分工

| 约束类型 | 载体 | 作用 | 适用场景 |
|---------|------|------|---------|
| **软约束** | md 文件 | 指导 AI 行为、决策逻辑、流程编排 | 需要 AI 判断的部分（何时调研、如何选型、何时迭代） |
| **硬约束** | scripts/ | 结构校验、格式校验、固定流程自动化 | 能确定性执行的部分（目录结构、frontmatter、脚本可执行性） |

**设计原则**：
- 能用脚本确定的就不写 md（降低 token）
- md 只写需要 AI 判断的部分
- 脚本利用 node/python 生态（如 ajv 校验 JSON Schema、glob 匹配文件、markdown-it 解析 md）
- 硬约束稳住下限，软约束提升上限

## What Changes

### 新增 Skill: `uluo-skill-creator`

- **新增** `skills/uluo-skill-creator/` 目录
- **新增** `SKILL.md`：编排器，定义规范化创建流程（Phase 模型）、软硬约束分工原则、远程引用 skill-creator 的方式
- **新增** `references/skill-anatomy.md`：skill 目录结构规范（SKILL.md / references / scripts / agents / evals / .claude-plugin 的位置和命名规则）
- **新增** `references/skillmd-spec.md`：SKILL.md 内容规范（YAML frontmatter 字段、description 写法、progressive disclosure 三层模型、<500 行约束）
- **新增** `references/hard-soft-constraint.md`：软硬约束设计原则（哪些用 md，哪些用脚本，如何分工）
- **新增** `references/remote-skill-creator.md`：远程引用 skill-creator 的方式（GitHub raw 读取 + npx skills 加载）
- **新增** `examples/skill-template/`：标准 skill 目录模板（含 SKILL.md / .claude-plugin/plugin.json / references/ / scripts/ / evals/ 骨架）
- **新增** `examples/evals-template.json`：evals.json 模板
- **新增** `scripts/validate-skill.js`：主编排器（硬约束校验管线：结构→SKILL.md→脚本可执行性→evals）
- **新增** `scripts/checks/structure.js`：目录结构校验（必需文件存在、命名规范、.claude-plugin/plugin.json 合法）
- **新增** `scripts/checks/skillmd.js`：SKILL.md 内容校验（frontmatter 字段完整、description 非空、行数 <500）
- **新增** `scripts/checks/scripts-executable.js`：脚本可执行性校验（scripts/ 下的 .js/.py 可执行、无语法错误）
- **新增** `scripts/lib/utils.js`：共享工具函数
- **新增** `scripts/__tests__/`：测试套件
- **新增** `evals/evals.json`：本 skill 的 evals
- **新增** `.claude-plugin/plugin.json`：最小 plugin 包装
- **修改** `marketplace.json`：注册新 skill

### 不做的事

- **不修改本地 skill-creator**——本地 skill-creator 保持原样（与 anthropic 上游同步），两者并存
- **不替代 skill-creator 的测试/benchmark 功能**——本 skill 只做规范化创建，测试和 benchmark 通过远程引用 skill-creator 完成
- **不做 skill 描述优化（description optimization）**——那是 skill-creator 的 run_loop.py 的职责，本 skill 只在 Phase 8 远程调用

## Impact

- **Affected specs**: 无（新 skill，不修改现有 spec）
- **Affected code**:
  - `skills/uluo-skill-creator/`（全部新增）
  - `marketplace.json`（新增注册项）
- **Dependencies**: 
  - 远程引用 `anthropics/skills` 仓库的 `skill-creator`（GitHub raw 或 npx skills）
  - 复用 claude-uluo 工作区的 plugin 包装模式（`.claude-plugin/plugin.json`）

## 远程引用 skill-creator 的方式

本 skill 在 Phase 8（校验审计）远程引用 skill-creator，不依赖本地相对路径。两种方式：

### 方式 1：GitHub raw 读取（主推）

直接读取 anthropic 仓库中 skill-creator 的关键文件：

```
https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md
https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/scripts/aggregate_benchmark.py
https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/eval-viewer/generate_review.py
```

适用场景：需要读取 skill-creator 的指令内容或单个脚本时。

### 方式 2：npx skills 加载（备选）

通过 skills.sh 的 npx 工具加载完整 skill-creator：

```bash
npx skills add anthropics/skills/skill-creator
# 或
npx skills-installer install @anthropics/claude-code/skill-creator --client claude-code
```

适用场景：需要完整安装 skill-creator 到本地环境运行其测试/benchmark 脚本时。

**选择规则**：
- 只需读取指令/单个文件 → GitHub raw
- 需要运行 skill-creator 的完整测试/benchmark 管线 → npx skills 加载
- 两种方式都不可用（离线环境）→ 回退到本地 `skills/skill-creator/`（仅作为离线 fallback，非默认）

## ADDED Requirements

### Requirement: 规范化创建流程（Phase 模型）

系统 SHALL 提供十阶段的 skill 创建流程，每个阶段有明确的输入、输出和质量闸门。流程强制结构化，避免"直接写草稿"的随意性。

#### Scenario: 完整创建流程

- **WHEN** 用户请求创建一个新 skill
- **THEN** 系统按以下 Phase 递进执行：
  - Phase 0: 需求收集（skill 用途、触发场景、输出格式、是否需要测试）
  - Phase 1: 调研（搜索类似 skill、最佳实践，WebSearch/MCP）
  - Phase 2: 软硬约束设计（哪些用 md 软约束，哪些用脚本硬约束）
  - Phase 3: 产出目录结构（按 skill-anatomy 规范）
  - Phase 4: 编写 SKILL.md（按 skillmd-spec 规范）
  - Phase 5: 编写 references/scripts/agents（软约束 + 硬约束分工）
  - Phase 6: 编写 evals（测试用例）
  - Phase 7: 本地硬约束校验（运行 validate-skill.js）
  - Phase 8: 远程校验审计（引用 skill-creator 做 benchmark）
  - Phase 9: 迭代或打包（基于 benchmark 结果改进，或产出 .skill 文件）

#### Scenario: Phase 跳过规则

- **WHEN** 创建简单 skill（单文件、无脚本）
- **THEN** 允许跳过 Phase 2（软硬约束设计）和 Phase 5（scripts 编写）
- **AND** 必须执行 Phase 7（本地硬约束校验）
- **AND** Phase 8（远程审计）可选

### Requirement: 软硬约束分工设计

系统 SHALL 在 Phase 2 明确区分软约束（md）和硬约束（scripts），确保能用脚本确定性执行的就不写 md。

#### Scenario: 软硬约束分类

- **WHEN** 设计 skill 的约束体系
- **THEN** 系统按以下规则分类：
  - **硬约束（scripts/）**：目录结构校验、frontmatter 字段校验、脚本可执行性校验、JSON Schema 校验、固定流程自动化（打包、聚合 benchmark）
  - **软约束（md）**：AI 行为指导（何时调研、如何选型、何时迭代）、决策逻辑、流程编排、子代理调度
- **AND** 每个"需要校验"的需求，优先考虑是否能用脚本硬约束实现
- **AND** 只有"需要 AI 判断"的需求才写 md 软约束

#### Scenario: 脚本利用 node/python 生态

- **WHEN** 编写硬约束脚本
- **THEN** 优先利用生态库：
  - node: `glob`（文件匹配）、`ajv`（JSON Schema 校验）、`markdown-it`（md 解析）、`gray-matter`（frontmatter 解析）
  - python: `jsonschema`、`pathlib`、`subprocess`
- **AND** 脚本可独立执行（`node scripts/validate-skill.js <path>`），不依赖 AI 上下文
- **AND** 脚本输出结构化结果（JSON 或 pass/fail + 具体错误），便于 AI 解析

### Requirement: skill 目录结构规范

系统 SHALL 强制 skill 遵循标准目录结构，通过硬约束脚本校验。

#### Scenario: 必需文件存在

- **WHEN** 运行 `validate-skill.js` 校验 skill
- **THEN** 检查以下必需文件存在：
  - `SKILL.md`（必需）
  - `.claude-plugin/plugin.json`（必需，plugin 包装）
- **AND** 检查 `plugin.json` 包含 `name`、`version`、`description`、`skills` 字段
- **AND** 缺失任一必需文件 → 报 fail，列出缺失文件

#### Scenario: 可选目录命名规范

- **WHEN** skill 包含可选目录
- **THEN** 检查目录名符合规范：
  - `references/`（文档参考）
  - `scripts/`（可执行脚本）
  - `agents/`（子代理指令）
  - `evals/`（测试用例）
  - `examples/`（模板和示例）
  - `assets/`（静态资源）
- **AND** 出现非规范目录名 → 报 warning（不 fail，但提示）

### Requirement: SKILL.md 内容规范

系统 SHALL 强制 SKILL.md 遵循内容规范，通过硬约束脚本校验。

#### Scenario: YAML frontmatter 完整

- **WHEN** 校验 SKILL.md
- **THEN** 检查 frontmatter 包含：
  - `name`：非空，与目录名一致
  - `description`：非空，包含"Use when"触发条件
- **AND** `name` 与目录名不一致 → 报 fail
- **AND** `description` 不包含触发条件 → 报 fail

#### Scenario: 行数约束

- **WHEN** 校验 SKILL.md
- **THEN** 检查 SKILL.md 行数 < 500
- **AND** 行数 ≥ 500 → 报 warning（建议拆分到 references/）
- **AND** 行数 ≥ 800 → 报 fail（必须拆分）

#### Scenario: progressive disclosure 三层模型

- **WHEN** 编写 SKILL.md
- **THEN** 遵循三层加载模型：
  - L1: frontmatter（name + description）— 始终在上下文（~100 词）
  - L2: SKILL.md body — skill 触发时加载（<500 行）
  - L3: references/scripts/ — 按需加载（无限制）
- **AND** SKILL.md 中明确引用 references/ 文件，标注何时读取

### Requirement: 脚本可执行性校验

系统 SHALL 校验 scripts/ 下的脚本可独立执行，无语法错误。

#### Scenario: 脚本无语法错误

- **WHEN** 运行 `scripts-executable.js` 校验
- **THEN** 对 scripts/ 下的每个 .js 文件执行 `node --check`
- **AND** 对 scripts/ 下的每个 .py 文件执行 `python -m py_compile`
- **AND** 语法错误 → 报 fail，列出错误文件和错误信息

#### Scenario: 脚本可独立执行

- **WHEN** 校验脚本
- **THEN** 检查脚本不依赖 AI 上下文（无 `require('claude')` 之类的非法依赖）
- **AND** 检查脚本有明确的入口（`main` 函数或可直接 `node script.js` 执行）
- **AND** 脚本依赖外部库时，检查 package.json 或 requirements.txt 存在

### Requirement: 远程引用 skill-creator 做校验审计

系统 SHALL 在 Phase 8 远程引用 skill-creator 做测试和 benchmark，不依赖本地相对路径。

#### Scenario: GitHub raw 读取 skill-creator 指令

- **WHEN** 只需读取 skill-creator 的指令内容或单个脚本
- **THEN** 通过 GitHub raw URL 读取：
  - `https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md`
  - `https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/scripts/<script>.py`
- **AND** 读取后按 skill-creator 的指令执行测试/benchmark 流程

#### Scenario: npx skills 加载完整 skill-creator

- **WHEN** 需要运行 skill-creator 的完整测试/benchmark 管线
- **THEN** 执行 `npx skills add anthropics/skills/skill-creator` 加载
- **AND** 加载后调用 skill-creator 的 `scripts/aggregate_benchmark.py`、`eval-viewer/generate_review.py` 等

#### Scenario: 离线环境 fallback

- **WHEN** 远程引用不可用（离线环境）
- **THEN** 回退到本地 `skills/skill-creator/`（claude-uluo 工作区副本）
- **AND** 提示用户这是离线 fallback，建议联网时使用远程版本以保证最新

### Requirement: 质量闸门

系统 SHALL 在关键 Phase 设置质量闸门，未通过则回退。

#### Scenario: Phase 7 本地硬约束校验闸门

- **WHEN** Phase 7 运行 `validate-skill.js`
- **THEN** 校验必须全部通过（无 fail）
- **AND** 有 fail → 回退到 Phase 3-6 修复，修复后重新校验
- **AND** 只有 warning → 可继续，但建议修复

#### Scenario: Phase 8 远程审计闸门

- **WHEN** Phase 8 引用 skill-creator 做 benchmark
- **THEN** benchmark 结果需用户 review
- **AND** 用户不满意 → 回退到 Phase 4-6 改进 SKILL.md 和 references
- **AND** 用户满意 → 进入 Phase 9 打包

## 执行协议

```
Phase 0: 需求收集
         ├ 明确 skill 用途（做什么）
         ├ 明确触发场景（何时用）
         ├ 明确输出格式（产出什么）
         └ 明确是否需要测试（客观可验证 → 需要；主观 → 不需要）

Phase 1: 调研
         ├ WebSearch/MCP 搜索类似 skill
         ├ 搜索最佳实践（anthropics/skills 仓库、skills.sh）
         └ 产出调研摘要（避免重复造轮子）

Phase 2: 软硬约束设计  ← 核心差异化
         ├ 列出所有"需要校验"的需求
         ├ 分类：能用脚本确定性执行 → 硬约束（scripts/）
         ├ 分类：需要 AI 判断 → 软约束（md）
         └ 产出约束分工表

Phase 3: 产出目录结构
         ├ 加载 examples/skill-template/ 模板
         ├ 按 skill-anatomy 规范创建目录
         └ 创建 .claude-plugin/plugin.json

Phase 4: 编写 SKILL.md
         ├ 按 skillmd-spec 规范编写 frontmatter
         ├ 编写 description（含"Use when"触发条件，可适当"pushy"）
         ├ 编写 body（<500 行，progressive disclosure）
         └ 明确引用 references/ 文件，标注何时读取

Phase 5: 编写 references/scripts/agents
         ├ 软约束：编写 references/*.md（AI 行为指导）
         ├ 硬约束：编写 scripts/*.js 或 *.py（结构化校验）
         ├ 子代理：编写 agents/*.md（如需要）
         └ 脚本利用 node/python 生态（glob/ajv/markdown-it/jsonschema）

Phase 6: 编写 evals
         ├ 加载 examples/evals-template.json
         ├ 编写 2-3 个真实测试用例
         └ 暂不写 assertions（Phase 8 远程引用 skill-creator 时再写）

Phase 7: 本地硬约束校验  ← 质量闸门
         ├ 运行 node scripts/validate-skill.js <skill-path>
         ├ 校验：目录结构 + SKILL.md frontmatter + 脚本可执行性
         ├ 有 fail → 回退到 Phase 3-6 修复
         └ 全部通过 → 进入 Phase 8

Phase 8: 远程校验审计  ← 引用 skill-creator
         ├ 方式 1: GitHub raw 读取 skill-creator/SKILL.md 指令
         ├ 方式 2: npx skills add anthropics/skills/skill-creator
         ├ 按 skill-creator 指令运行测试用例（with-skill + baseline）
         ├ 运行 aggregate_benchmark.py 聚合结果
         ├ 运行 generate_review.py 启动 viewer
         └ 用户 review benchmark → 不满意回退到 Phase 4-6

Phase 9: 迭代或打包
         ├ 用户满意 → 打包（npx skills package 或 skill-creator 的 package_skill.py）
         ├ 产出 .skill 文件
         └ 注册到 marketplace.json（如属于 claude-uluo 工作区）
```

### 场景跳过规则

| skill 复杂度 | 跳过 | 产出 |
|------------|------|------|
| 简单（单文件、无脚本） | Phase 2、5 | SKILL.md + evals |
| 中等（含 references） | 无 | 完整目录 + 本地校验 |
| 复杂（含 scripts/agents） | 无 | 完整目录 + 本地校验 + 远程审计 |
| 紧急（快速原型） | Phase 1、8 | SKILL.md + 目录结构 + 本地校验 |

## MODIFIED Requirements

### Requirement: marketplace.json 注册

`marketplace.json` 新增 `uluo-skill-creator` 条目，source 指向 `./skills/uluo-skill-creator`。

## REMOVED Requirements

无——本 skill 不删除任何现有功能。本地 skill-creator 保持原样，两者并存。
