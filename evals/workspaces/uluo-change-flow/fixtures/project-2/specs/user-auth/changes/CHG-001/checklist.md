# 认证模块 Session → JWT Review Checklist

> 日期: 2026-06-25 | 审查人: huyongle | 关联变更: ./spec.md ./plan.md ./tasks.md

## Review 状态约定
- `[ ]` 待 review
- `[x]` review 通过
- `[-]` review 不通过（需标注回退层级和原因）

## Spec Review
- [x] 影响范围清单中所有文档影响项都有对应 plan delta
- [x] 影响范围清单中所有代码影响项都有对应 tasks 任务
- [x] 决策结论为"批准"
- [x] 变更编号唯一（CHG-001）
- [x] 影响范围覆盖文档、代码、设计稿三个维度

## Plan Review
- [x] 每个 MODIFIED delta 都包含"原文摘要"和"改为"
- [x] 技术方案选择有方案对比和选择结论
- [x] plan 中不含具体文件路径和行号
- [x] delta 引用位置格式为"文件名 > 章节 > 子章节"

## Tasks Review
- [x] 每个任务都有目标文件路径
- [x] 每个任务描述都是动词开头（修改/重构）
- [x] T1 和 T6 和 T7 标注了需调研及建议调研方式
- [x] 任务依赖关系清晰无循环
- [x] tasks 中不含验收检查点字段

## 执行 Review
- [ ] 所有 tasks 任务已执行完成
- [ ] spec.md 已按 plan delta 更新
- [ ] 代码文件已修改
- [ ] 调研结论已记录（T1 和 T6 和 T7）

## Review 结论
- **结论**: 不通过
- **不通过项**:
  - 执行 Review "所有 tasks 任务已执行完成" → 待执行，原因: 变更尚未进入执行阶段
  - 执行 Review "spec.md 已按 plan delta 更新" → 待执行，原因: 文档修改尚未实施
  - 执行 Review "代码文件已修改" → 待执行，原因: 代码重构尚未实施
  - 执行 Review "调研结论已记录" → 待执行，原因: 调研任务尚未执行
- **回退历史**:
  - 第 1 次回退: plan 层级 — 初稿遗漏了 spec.md > ## 调研依据 > 技术可行性 的 MODIFIED delta — 已修复，补充对应 delta 项
