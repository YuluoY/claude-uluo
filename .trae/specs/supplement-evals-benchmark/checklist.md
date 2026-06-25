# Checklist

## 修正现有 eval 3
- [x] expected_output 中"完整十阶段流程"→"完整九阶段流程（Phase 0-8）"
- [x] 移除"Phase 9"引用，流程终点改为"完成"
- [x] assertions 中"aggregate_benchmark.py 聚合产出 benchmark.json"→"Phase 8 引用 skill-creator 的 aggregate_benchmark.py 聚合结果"

## 新增 eval 6（researcher agent 测试）
- [x] prompt 涉及调研场景
- [x] expected_output 说明 Phase 1 触发 researcher agent
- [x] assertions 验证调研报告 JSON 产出

## 新增 eval 7（grader agent 测试）
- [x] prompt 涉及 Phase 8 评分场景
- [x] expected_output 说明 Phase 8 触发 grader agent
- [x] assertions 验证评分报告 JSON 产出

## 新增 eval 8（version 字段测试）
- [x] prompt 要求创建 skill 时包含 version
- [x] expected_output 说明 frontmatter 包含 version
- [x] assertions 验证 version 字段符合 semver

## 新增 eval 9（指令式写作测试）
- [x] prompt 要求创建 skill 时指令式写作
- [x] expected_output 说明 SKILL.md 以指令为主
- [x] assertions 验证指令式写作 + 边界约束保留

## 新增 eval 10（plugin.json 移除测试）
- [x] prompt 要求创建 skill 时不创建 plugin.json
- [x] expected_output 说明无 .claude-plugin/plugin.json
- [x] assertions 验证无 plugin.json

## 创建 benchmark-example.json
- [x] `evals/benchmark-example.json` 已创建
- [x] 对齐 benchmark-workflow.md 的 benchmark.json 产出规范
- [x] 包含 metadata/configurations/runs/run_summary/rubric_score/notes 字段
- [x] rubric_score 字段为 uluo-skill-creator 扩展字段

## 测试验证
- [x] 所有测试通过（37 passed, 2 skipped, 0 failed）
- [x] validate-skill.js 通过
- [x] grade-skill.js 评分 100/100 (A)

## 核心纠正验证
- [x] eval 3 已修正（无 Phase 9、无十阶段流程）
- [x] 新增 5 个 evals 覆盖新功能（researcher、grader、version、指令式写作、plugin.json 移除）
- [x] benchmark-example.json 对齐产出规范
- [x] 规范适用于用户使用 uluo-skill-creator 创建的所有 skill
