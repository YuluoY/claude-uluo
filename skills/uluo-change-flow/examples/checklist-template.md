# checklist.md 模板（独立验收 Checklist）

独立验收 Checklist 是变更工作流的 review 机制——从 spec/plan/tasks 三层抽出可 review 的检查点，加上执行阶段的验证。不重复各层内容，只抽取"可 review 的检查点"。

---

## 模板

```markdown
# [变更标题] Review Checklist

> 日期: YYYY-MM-DD | 审查人: `git config user.name` | 关联变更: ./spec.md ./plan.md ./tasks.md

## Review 状态约定
- `[ ]` 待 review
- `[x]` review 通过
- `[-]` review 不通过（需标注回退层级和原因）

## Spec Review
- [ ] 影响范围清单中所有文档影响项都有对应 plan delta
- [ ] 影响范围清单中所有代码影响项都有对应 tasks 任务
- [ ] 影响范围清单中所有设计稿影响项都有对应 tasks 任务
- [ ] 决策结论为"批准"
- [ ] 变更编号唯一

## Plan Review
- [ ] 每个 MODIFIED delta 都包含"原文摘要"和"改为"
- [ ] 每个 ADDED delta 都包含"插入位置"和"新内容"
- [ ] 每个 REMOVED delta 都包含"删除位置"和"删除原因"
- [ ] 技术方案选择有结论和理由（如适用）
- [ ] plan 中不含具体文件路径和行号

## Tasks Review
- [ ] 每个任务都有目标文件路径
- [ ] 每个任务描述都是动词开头
- [ ] 每个需调研任务都标注了调研方式
- [ ] 任务依赖关系清晰无循环
- [ ] tasks 中不含验收检查点

## 执行 Review
- [ ] 所有 tasks 任务已执行完成
- [ ] spec.md 已按 plan delta 更新
- [ ] plan.md 已按 plan delta 更新
- [ ] tasks.md 已更新
- [ ] 代码文件已修改
- [ ] 设计稿已修改（如适用）
- [ ] 调研结论已记录（如有调研任务）

## Review 结论
- **结论**: [通过 / 不通过]
- **不通过项**（如有）:
  - [-] [检查点描述] → 回退到 [spec/plan/tasks/执行] 层级，原因: [说明]
- **回退历史**（如有）:
  - 第 1 次回退: [层级] — [原因] — 已修复
```

---

## 填写指南

### Review 状态约定
- `[ ]`：待 review——尚未检查
- `[x]`：review 通过——检查无误
- `[-]`：review 不通过——需标注回退层级和原因

### 四个 Review 分组
checklist 必须包含以下四个分组，缺一不可：

1. **Spec Review**：检查 L1 spec 的完整性和决策状态
   - 验证影响范围清单是否被 plan 和 tasks 完整覆盖
   - 验证决策是否批准
   - 验证变更编号唯一性

2. **Plan Review**：检查 L2 plan 的 delta 格式和内容完整性
   - 验证每种 delta 类型（MODIFIED/ADDED/REMOVED）的字段完整性
   - 验证技术方案选择是否有结论（如适用）
   - 验证 plan 不越界（不含文件路径和行号）

3. **Tasks Review**：检查 L3 tasks 的任务规范性
   - 验证任务字段完整性
   - 验证任务描述规范（动词开头）
   - 验证依赖关系无循环

4. **执行 Review**：检查执行阶段的完成情况
   - 验证所有任务已执行
   - 验证文档已按 delta 更新
   - 验证代码和设计稿已修改
   - 验证调研结论已记录（如有）

### 不通过项处理
- 不通过项必须标注回退层级：`spec` / `plan` / `tasks` / `执行`
- 必须说明原因——便于后续修复和追溯
- 回退后需重新走对应层级的流程

### 回退历史
- 如有回退，必须记录每次回退的：
  - 回退层级（spec/plan/tasks/执行）
  - 回退原因
  - 修复状态（已修复/未修复）
- 回退历史按时间顺序记录，便于追溯变更过程

### Review 结论
- 只有所有检查点都通过（`[x]`），结论才能是"通过"
- 任何一个检查点不通过（`[-]`），结论必须是"不通过"
- **Review 全部通过才可归档**——归档时填写 change-record.md

### 不要包含的内容
- 不重复 spec/plan/tasks 各层的具体内容
- 只抽取"可 review 的检查点"——即可以用 `[x]` / `[-]` 判断的条目
- 不包含任务执行细节（那是 tasks 的事）
- 不包含技术方案（那是 plan 的事）
