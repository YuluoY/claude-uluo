# Checklist

## agents/README.md 删除
- [x] 删除 agents/README.md

## agents/skill-quality-grader.md 新增
- [x] 定义角色（质量评分子代理）
- [x] 定义输入（skill_path/rubric_path/output_path）
- [x] 定义流程（5 Step：读取/评分/计算/识别/写入）
- [x] 定义输出（JSON 评分报告）
- [x] 定义 Guidelines（7 条行为护栏）
- [x] 202 行（在 200-230 行目标范围内）

## references/agent-creation-guide.md 新增
- [x] 必需章节规范（8 章节表格）
- [x] 写作规范（6 条）
- [x] 通用 vs 特定场景元素（4 类表格）
- [x] 长度控制建议
- [x] 适用范围说明
- [x] 10 条关键经验

## examples/agent-template.md 新增
- [x] 通用模板骨架（6 必需章节）
- [x] 占位符说明（8 个占位符表格）
- [x] JSON 输出示例

## references/agents-decision.md 修改
- [x] 更新决策规则（三类场景）
- [x] 区分运行时 agent 和 benchmark agent

## SKILL.md 修改
- [x] agents 目录决策部分更新
- [x] references 引用时机表更新

## 核心验证
- [x] agents/ 目录放实际 agent md 文件（不是 README）
- [x] skill-quality-grader.md 是 uluo-skill-creator 自身使用的子代理
- [x] agent-creation-guide.md 指导用户创建 agent
- [x] 适用范围明确（用户创建的所有 skill）
- [x] 所有测试通过（29 passed, 0 failed, 2 skipped）
- [x] validate-skill.js 通过
- [x] grade-skill.js 评分 100/100 (A)
