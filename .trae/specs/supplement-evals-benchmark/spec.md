# Spec: 补充 evals/benchmark

## 背景

当前 uluo-skill-creator 的 evals.json 有 5 个测试用例，但存在以下问题：
1. **eval 3 过时**——expected_output 提到"完整十阶段流程"和"Phase 9"，但当前流程是 Phase 0-8（9 阶段），Phase 9 已移除
2. **eval 3 引用过时**——assertions 提到 aggregate_benchmark.py 直接产出，但应引用 skill-creator 脚本
3. **缺少新功能测试**——researcher agent、grader agent、version 字段、指令式写作、plugin.json 移除等新功能未覆盖
4. **缺少 benchmark 数据**——无 benchmark.json 示例数据，Phase 8 测试无法验证

## 目标

### 纠正 1：修正现有 evals

**eval 3 修正**：
- expected_output 中"完整十阶段流程"→"完整九阶段流程（Phase 0-8）"
- expected_output 中"Phase 9"→移除（当前流程终点是"完成"）
- assertions 中"aggregate_benchmark.py 聚合产出 benchmark.json"→"Phase 8 引用 skill-creator 的 aggregate_benchmark.py 聚合结果"

### 纠正 2：补充新 evals

**新增 eval 6: researcher agent 测试**
- 场景：用户需要创建一个涉及调研的 skill（如"调研现有 PDF 处理方案并创建 skill"）
- 验证：Phase 1 触发 researcher agent，产出调研报告 JSON

**新增 eval 7: grader agent 测试**
- 场景：用户创建 skill 后，Phase 8 触发 grader agent 评分
- 验证：Phase 8 触发 grader agent，产出评分报告 JSON

**新增 eval 8: version 字段测试**
- 场景：用户创建 skill 时，frontmatter 必须包含 version 字段
- 验证：产出的 SKILL.md frontmatter 包含 version 字段且符合 semver 格式

**新增 eval 9: 指令式写作测试**
- 场景：用户创建 skill 时，SKILL.md 内容以指令为主
- 验证：SKILL.md 内容以指令为主（怎么做/怎么做得更好/禁止做什么），边界约束保留

**新增 eval 10: plugin.json 移除测试**
- 场景：用户创建 skill 时，不创建 .claude-plugin/plugin.json
- 验证：产出的 skill 无 .claude-plugin/plugin.json（plugin.json 是 workspace 绑定，非 skill 必需）

### 纠正 3：创建 benchmark 数据

**新增 `evals/benchmark-example.json`**：
- 作为 Phase 8 benchmark.json 的示例数据
- 对齐 benchmark-workflow.md 中的 benchmark.json 产出规范
- 包含 metadata、configurations、runs、run_summary、rubric_score、notes 字段
- 用于验证 benchmark 流程的输出格式

## 修改范围

| 文件 | 修改内容 |
|------|---------|
| `evals/evals.json` | 修正 eval 3，新增 eval 6-10 |
| `evals/benchmark-example.json` | 新建——benchmark.json 示例数据 |

## 非目标

- 不修改 scripts/（脚本逻辑不变）
- 不修改 SKILL.md（流程不变）
- 不修改 references/（规范不变）
- 不实际运行 benchmark（仅补充测试用例和示例数据）

## 规范适用范围

**关键**：本 spec 的规范不仅适用于 uluo-skill-creator 自身，更适用于**用户使用 uluo-skill-creator 创建的所有 skill**。

| 规范 | 适用对象 |
|------|---------|
| evals 测试用例覆盖新功能（researcher、grader、version、指令式写作、plugin.json 移除） | uluo-skill-creator 自身 |
| benchmark.json 示例数据格式 | uluo-skill-creator 自身 + 产出的 skill（Phase 8 benchmark 时参考） |
