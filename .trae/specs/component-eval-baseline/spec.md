# component-creator skill 的 eval 基线与确定性下限脚本 Spec

## Why

component-creator skill 目前没有 evals 目录，从未跑过 skill-creator 的 benchmark，无法量化 skill 的通过率和稳定性。skill 中有大量确定性约定（目录结构、README 9 个 H2 节、API 表格列规范、四态必填、禁令红线），这些是可脚本化验证的「下限」——如果产出违反这些硬性约定，无需 LLM 评判即可判定失败。

需要：(1) 创建 evals/evals.json 建立测试用例基线；(2) 编写确定性检查脚本固化下限，让 LLM 评判聚焦于主观质量，硬性规范由脚本兜底；(3) 跑一次 benchmark 记录基线数据。

## What Changes

- **新增** `skills/component-creator/evals/evals.json`——测试用例 + 断言（覆盖 Vue/React/WC 创建、迭代更新、四态、README 等场景）
- **新增** `skills/component-creator/scripts/validate_output.py`——确定性检查脚本，验证组件产出是否符合硬性规范
- **新增** `skills/component-creator/scripts/__init__.py`——Python 包标识
- **运行** 一次 skill-creator 的 benchmark 流程，记录基线通过率到 `evals/baseline.md`

## Impact

- Affected specs: component-creator skill
- Affected code:
  - `skills/component-creator/evals/evals.json`（新建）
  - `skills/component-creator/scripts/validate_output.py`（新建）
  - `skills/component-creator/scripts/__init__.py`（新建）
  - `skills/component-creator/evals/baseline.md`（新建，记录基线数据）

## ADDED Requirements

### Requirement: evals 测试用例基线

系统 SHALL 提供 `evals/evals.json`，覆盖 component-creator 的核心场景，每个用例附可验证的 expectations。

#### Scenario: 测试用例覆盖度

- **WHEN** 查看 evals.json
- **THEN** 用例 SHALL 覆盖以下场景：
  - 创建 Vue 3 组件（含目录结构、README、四态）
  - 创建 React 组件（含 hooks 拆分、README）
  - 创建 Web Component（含 Shadow DOM 样式）
  - 迭代更新已有组件（新增 prop + 更新 README 变更记录）
  - 四态完整性验证（只写 success 的反例）
  - 触发词识别（用户说「封装一个组件」应触发 skill）

#### Scenario: expectations 可验证

- **WHEN** grader 评判用例产出
- **THEN** 每个用例的 expectations SHALL 是客观可验证的语句，如「产出包含 README.md」「README 包含 9 个 H2 节」「API 参考有 Props 表格」

### Requirement: 确定性检查脚本

系统 SHALL 提供 `scripts/validate_output.py`，对组件产出做硬性规范检查，无需 LLM 评判。

#### Scenario: 脚本输入输出

- **WHEN** 运行 `python -m scripts.validate_output <组件目录路径>`
- **THEN** 脚本 SHALL 检查该目录下的组件产出，输出 JSON 格式结果：`{"passed": bool, "checks": [{"name": str, "passed": bool, "message": str}], "summary": str}`

#### Scenario: 检查项覆盖

- **WHEN** 脚本验证组件产出
- **THEN** SHALL 检查以下确定性项：
  - **目录结构**：README.md 存在、docs/ 存在、index 入口存在、types.ts 存在
  - **README 结构**：9 个 H2 节齐全（元信息/是什么/快速上手/API参考/四态说明/使用示例/设计决策/可访问性/变更记录）
  - **README 元信息表**：包含组件名、版本、框架、状态、入口路径、依赖 6 个字段
  - **README API 表格**：Props 表格有表头且至少 1 行数据；Emits/Slots/Methods 表格有表头（无数据时标注「无」）
  - **README 变更记录**：至少 1 个版本条目，格式为 `### vX.Y.Z (YYYY-MM-DD)`
  - **四态说明**：四态表格包含 Loading/Error/Empty/Success 四行
  - **版本号格式**：元信息节的版本号符合 SemVer（vX.Y.Z）

#### Scenario: 禁令红线检查

- **WHEN** 脚本验证组件产出
- **THEN** SHALL 检查以下禁令红线：
  - README 中无 `outline: none`（禁令 7）
  - README 中无 `key={index}` 或 `:key="index"`（禁令 9）
  - 如组件有迭代变更记录，废弃项有 `deprecated since` 标记（禁令 13）

#### Scenario: 脚本可独立运行

- **WHEN** 在 skill 目录下运行脚本
- **THEN** 脚本 SHALL 不依赖外部 LLM API，纯 Python 标准库实现（仅用 os/re/json/pathlib）

### Requirement: 基线 benchmark 数据

系统 SHALL 记录一次 benchmark 基线运行结果到 `evals/baseline.md`。

#### Scenario: 基线内容

- **WHEN** 查看 baseline.md
- **THEN** 文件 SHALL 包含：运行日期、evals 总数、通过率（expectations pass rate）、每个用例的通过情况、已知失败项和原因分析

#### Scenario: 基线作为后续优化参照

- **WHEN** 后续优化 skill
- **THEN** baseline.md 的数据 SHALL 作为对比基准，优化后跑同一套 evals 对比通过率变化

## MODIFIED Requirements

### Requirement: SKILL.md 文件索引

文件索引表 SHALL 新增 evals 和 scripts 条目说明。
