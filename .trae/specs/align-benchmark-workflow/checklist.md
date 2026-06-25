# Checklist

## references/benchmark-workflow.md 重构
- [x] 4 步流程对齐 skill-creator
- [x] rubric 集成到 Step 3（不再独立 Step）
- [x] "角度差异"章节新增
- [x] mermaid 流程图更新为 4 步
- [x] 引用 skill-creator 脚本的方式保留

## SKILL.md Phase 8 更新
- [x] mermaid 流程图对齐 4 步
- [x] 描述强调"流程和产出对齐 skill-creator"

## references/skill-quality-rubric.md 更新
- [x] "与 benchmark 的融合"章节更新
- [x] rubric 定位为 benchmark.json 扩展字段

## 测试验证
- [x] 所有测试通过（31 passed, 0 failed, 2 skipped）
- [x] validate-skill.js 通过
- [x] grade-skill.js 评分 100/100 (A)

## 核心对齐验证
- [x] 流程步数与 skill-creator 一致（4 步）
- [x] 产出格式与 skill-creator 一致（benchmark.json + viewer）
- [x] 角度差异清晰（规范角度 vs 执行角度）
- [x] rubric 不破坏 skill-creator viewer 兼容性
