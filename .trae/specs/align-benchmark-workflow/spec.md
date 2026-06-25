# Spec: 对齐 benchmark 流程至 skill-creator

## 背景

用户反馈："测试和审计 benchmark 数据的能力需要对齐 skill-creator，只是你们的角度可能不一样，流程和最后产出是差不多的。"

当前 `references/benchmark-workflow.md` 将 rubric 评分作为独立 Step 5，导致：
- 流程 6 步 vs skill-creator 4 步——不对齐
- rubric 标记为"特有"——过度强调差异
- 角度差异未清晰表述

## 目标

重构 benchmark 流程，使其与 skill-creator 对齐：
- **流程对齐**：4 步结构，与 skill-creator 一致
- **产出对齐**：benchmark.json + benchmark.md + viewer，与 skill-creator 一致
- **角度差异**：uluo-skill-creator 从"规范/流程"角度补充 rubric 评分，作为 benchmark.json 的扩展字段，不破坏 skill-creator viewer 兼容性

## 设计决策

### 决策 1：4 步流程对齐 skill-creator

| skill-creator 步骤 | uluo-skill-creator 对齐步骤 | 差异 |
|-------------------|---------------------------|------|
| Step 1: Spawn runs (with-skill + baseline) | Step 1: 准备 evals + 并行 spawn runs | 无差异 |
| Step 2: Draft assertions (while runs in progress) | Step 2: 起草 assertions + 捕获 timing | 无差异 |
| Step 3: Capture timing (as runs complete) | （合并到 Step 2） | 无差异 |
| Step 4: Grade + aggregate + analyst + viewer | Step 3: Grade + aggregate（含 rubric）+ analyst | rubric 作为 aggregate 的扩展 |
| - | Step 4: Launch viewer | 无差异 |

**注**：skill-creator 的 Step 2-3 在 uluo-skill-creator 中合并为 Step 2（因为都是 runs 进行中的并行工作）。

### 决策 2：rubric 集成到 aggregate 步骤

rubric 评分不再是独立步骤，而是 Step 3 (Grade + aggregate) 的扩展：
- Grade: 引用 skill-creator 的 grader.md（对齐）
- Aggregate: 引用 skill-creator 的 aggregate_benchmark.py（对齐）
- **Rubric 扩展**: 运行 grade-skill.js，将 rubric_score 写入 benchmark.json（uluo-skill-creator 角度）
- Analyst: 引用 skill-creator 的 analyzer.md（对齐）

### 决策 3：角度差异表述

| 维度 | skill-creator 角度 | uluo-skill-creator 角度 |
|------|-------------------|----------------------|
| 评估对象 | skill 是否正确执行任务 | skill 本身是否规范 |
| 指标 | pass_rate / time / tokens | rubric 5 维度评分 |
| 产出 | benchmark.json + viewer | benchmark.json（含 rubric_score）+ viewer |
| 工具 | 自带脚本（grader/aggregate/viewer） | 引用 skill-creator 脚本 + 自带 grade-skill.js |

## 修改范围

1. `references/benchmark-workflow.md`——重构为 4 步流程
2. `SKILL.md` Phase 8 mermaid 流程图——对齐 4 步
3. `references/skill-quality-rubric.md`——更新"与 benchmark 的融合"章节，去掉"独立步骤"表述

## 非目标

- 不修改 grade-skill.js 逻辑（评分逻辑不变）
- 不修改 benchmark.json schema（rubric_score 字段保留）
- 不修改测试用例（除非流程描述变化导致断言失败）
