# 同步协议（Sync Protocol）

## 目的

变更执行后，确保四层文档对齐，且与代码一致。

## 四层对齐规则

### spec → plan 对齐

L1 spec 中标记的每个影响范围项，在 L2 plan 中都有对应 delta（MODIFIED/ADDED/REMOVED）。

### plan → tasks 对齐

L2 plan 中的每个 delta，在 L3 tasks 中都有对应执行任务。

### tasks → checklist 对齐

L3 tasks 中的每个任务，在 checklist 中都有对应 review 检查点。

### checklist → 代码对齐

checklist 中标记为通过的任务，对应的代码文件已实际变更。

## 一致性校验方法

1. 提取 spec 的影响范围清单中的每一项
2. 在 plan 中搜索对应的 delta 标记
3. 在 tasks 中搜索对应的任务
4. 在 checklist 中搜索对应的 review 检查点
5. 在代码中验证文件已变更（通过 `git diff` 或文件修改时间）

## 回退规则

- **spec → plan 不对齐**：回退到 L1 spec，补充缺失的影响范围项
- **plan → tasks 不对齐**：回退到 L2 plan，补充缺失的 delta
- **tasks → checklist 不对齐**：回退到 L3 tasks，补充缺失的任务
- **checklist → 代码不对齐**：回退到执行阶段，补充缺失的代码变更

## 校验输出格式

```markdown
## 同步一致性校验结果

### spec → plan 对齐
- [x] FR-1 修改 → plan.md MODIFIED spec.md > FR-1
- [-] FR-3 新增 → plan.md 中未找到对应 ADDED ❌ 回退到 L2 plan

### plan → tasks 对齐
- [x] plan.md MODIFIED spec.md > FR-1 → tasks.md 修改 spec.md FR-1
- [x] plan.md ADDED spec.md > FR-3 → tasks.md 新增 spec.md FR-3

### tasks → checklist 对齐
- [x] tasks.md T1 → checklist.md spec-review FR-1
- [x] tasks.md T2 → checklist.md spec-review FR-3

### checklist → 代码对齐
- [x] checklist.md tasks-review T1 → src/coupon/service.js 已修改
- [-] checklist.md tasks-review T2 → src/coupon/stack.js 未找到 ❌ 回退到执行阶段
```
