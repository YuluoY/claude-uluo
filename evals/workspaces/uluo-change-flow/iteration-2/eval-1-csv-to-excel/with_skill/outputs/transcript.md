# 变更管理执行过程：CSV 导出 → 支持 Excel 导出

> 任务: 在已有用户数据 CSV 导出功能基础上，新增 Excel 导出能力
> 项目根目录: `/Users/huyongle/Desktop/workspace/claude-uluo/evals/workspaces/uluo-change-flow/fixtures/project-1`
> 执行日期: 2026-06-25 | 作者: huyongle | 变更编号: CHG-001

---

## Phase 0: 获取作者

运行 `git config user.name`，输出 `huyongle`，作为所有文档的作者字段值。

---

## Phase 1: 识别变更

- 变更需求: 产品要求支持 Excel 导出
- 目标特性目录: `specs/user-csv-export/`（已存在）
- 已有文档: `specs/user-csv-export/spec.md`
- 已有代码: `src/routes/export.js`（CSV 导出路由 + convertToCSV 函数）
- 结论: 特性已存在，走 uluo-change-flow 增量变更模式

---

## Phase 2: 影响调研

扫描已有 spec.md 和 export.js，识别影响点：

**spec.md 现状:**
- 用户故事: US-1（CSV 导出）、US-2（导出上限）
- 非目标: 明确写了"不支持 Excel 导出"
- 功能需求: FR-1（CSV 导出）、FR-2（导出上限 10 万条）
- 验收标准: FR-1、FR-2 两条

**export.js 现状:**
- `GET /export/csv` 路由，查询 User（limit 100000），convertToCSV 转换，text/csv 响应
- convertToCSV 函数: 表头 + 逗号分隔行

**影响清单:**
- 文档: spec.md 的非目标（REMOVED）、功能需求（ADDED FR-3）、用户故事（MODIFIED）、验收标准（MODIFIED）
- 代码: 导出路由模块（MODIFIED，新增 Excel 接口）、依赖管理（ADDED，引入 exceljs）
- 设计稿: 无（项目无设计稿资源）

---

## Phase 3: 产出 L1 spec.md

文件: `specs/user-csv-export/changes/CHG-001/spec.md`

- 变更背景: 运营反馈 CSV 在 Excel 中乱码/科学计数法/日期错乱，需新增 Excel 原生格式导出
- 影响范围: 文档影响 4 项 + 代码影响 2 项 + 设计稿无影响
- 决策结论: 批准（新增独立接口，不破坏现有 CSV 逻辑）
- 边界遵守: 不含文件路径、不含代码片段、不含技术方案

---

## Phase 4: 产出 L2 plan.md

文件: `specs/user-csv-export/changes/CHG-001/plan.md`

- 技术方案选择: 对比 exceljs / xlsx(SheetJS) / node-xlsx 三方案
- 选择结论: exceljs（社区版免费提供样式能力 + 流式写入，覆盖 10 万条上限）
- Delta 规格（4 项）:
  - REMOVED: spec.md > ## 非目标（删除"不支持 Excel 导出"）
  - ADDED: spec.md > ## 功能需求 > FR-3（新增 Excel 导出需求）
  - MODIFIED: spec.md > ## 用户故事（新增 US-3）
  - MODIFIED: spec.md > ## 验收标准（新增 FR-3 验收标准）
- 边界遵守: 不含文件路径、不含行号、不含任务依赖图

---

## Phase 5: 产出 L3 tasks.md

文件: `specs/user-csv-export/changes/CHG-001/tasks.md`

- T1: 修改 spec.md 文档（文档类型，无依赖）
- T2: 新增 Excel 导出路由和转换函数（代码类型，依赖 T1，需调研 exceljs API）
- 任务依赖图: T1 → T2
- 边界遵守: 不含验收检查点字段

---

## Phase 6: 产出 checklist.md

文件: `specs/user-csv-export/changes/CHG-001/checklist.md`

- Spec Review: 5 个检查点（影响范围覆盖、决策批准、编号唯一、L1 边界）
- Plan Review: 5 个检查点（delta 字段完整性、技术方案结论、L2 边界）
- Tasks Review: 5 个检查点（目标文件、动词开头、调研标注、依赖无循环、L3 边界）
- Review 结论: 通过（15 个检查点均为 [x]）
- 边界遵守: 不重复 spec/plan/tasks 正文内容，只抽 review 检查点

---

## 校验结果

运行命令:
```
node /Users/huyongle/Desktop/workspace/claude-uluo/skills/uluo-change-flow/scripts/validate-change.js specs/user-csv-export/changes/CHG-001/
```

执行目录: `fixtures/project-1`（PROJECT_ROOT，用于代码对齐校验）

```
校验变更: CHG-001
─────────────────────────────────────────

── Step 1/7: 目录结构 — 四份文档存在性
  ✓ spec.md
  ✓ plan.md
  ✓ tasks.md
  ✓ checklist.md

── Step 2/7: L1 spec 校验 — 变更背景/影响范围/决策结论
  ✓ 作者字段有效
  ✓ 变更编号格式有效
  ✓ 包含"变更背景"章节
  ✓ 包含"影响范围"章节
  ✓ 影响范围包含文档影响表格
  ✓ 影响类型均为合法值（ADDED/MODIFIED/REMOVED）
  ✓ 风险等级均为合法值（高/中/低）
  ✓ 包含"决策结论"章节
  ✓ 决策为"批准"
  ✓ 未包含具体文件路径（符合 L1 边界）
  ✓ 未包含代码片段（符合 L1 边界）

── Step 3/7: L2 plan 校验 — Delta 规格/字段完整性
  ✓ 作者字段有效
  ✓ 包含"Delta 规格"章节
  ✓ Delta 规格含 4 个 delta 项
  ✓ 2 个 MODIFIED delta 字段完整
  ✓ 1 个 ADDED delta 字段完整
  ✓ 1 个 REMOVED delta 字段完整
  ✓ 技术方案选择包含方案对比
  ✓ 技术方案选择包含选择结论
  ✓ 未包含具体文件路径（符合 L2 边界）

── Step 4/7: L3 tasks 校验 — 任务字段/动词开头/调研标注
  ✓ 作者字段有效
  ✓ 包含"执行任务清单"章节
  ✓ 含 2 个任务（T1~T2）
  ✓ 所有任务均含"目标文件"字段
  ✓ 所有任务类型均为合法值（代码/文档/设计稿/测试）
  ✓ 所有任务描述均动词开头
  ✓ T2 调研标注含建议方式
  ✓ 未包含验收检查点字段（符合 L3 边界）

── Step 5/7: checklist 校验 — 四个分组/检查点格式/结论一致性
  ✓ 审查人字段有效
  ✓ 包含"Spec Review"分组
  ✓ 包含"Plan Review"分组
  ✓ 包含"Tasks Review"分组
  ⚠ 未找到"## 执行 Review"分组——如已有执行阶段，必须补充
  ✓ 包含"Review 结论"章节
  ✓ Review 结论为"通过"
  ✓ 含 15 个检查点
  ✓ 未重复 spec/plan/tasks 各层正文内容

── Step 6/7: 同步一致性 — spec→plan→tasks→checklist 对齐
  ✓ spec → plan 对齐（4 个文档影响项均有 delta）
  ✓ plan → tasks 对齐（4 个 delta 均有任务）
  ✓ tasks → checklist 对齐（2 个任务均有检查点）
  ✓ checklist 全部通过（15 个检查点均为 [x]）
  ✓ 代码对齐（2 个目标文件均存在）

── Step 7/7: change-record 校验 — 跳过（未找到 change-record.md）
  ⚠ 未找到 change-record.md——变更归档时需创建此文档

── 校验结果 ──
  通过: 45  失败: 0  警告: 2  合计: 47

✓ 全部校验通过。
```

**警告说明（均为预期）:**
1. 执行 Review 分组缺失——本次只在 Phase 3-6 创建变更文档，执行阶段（Phase 7）尚未开始，执行 Review 在代码实施后补充
2. change-record.md 缺失——该文档在 Phase 9（review 通过后归档）产出，本次未进入执行阶段

---

## 产出文件清单

| 文件 | 路径 | 级别 |
|------|------|------|
| spec.md | `specs/user-csv-export/changes/CHG-001/spec.md` | L1 范围确定 |
| plan.md | `specs/user-csv-export/changes/CHG-001/plan.md` | L2 方案设计 |
| tasks.md | `specs/user-csv-export/changes/CHG-001/tasks.md` | L3 执行任务 |
| checklist.md | `specs/user-csv-export/changes/CHG-001/checklist.md` | 独立验收 |

---

## 后续待办（Phase 7-9，本次未执行）

1. Phase 7: 按 tasks.md 逐项执行（T1 修改 spec.md → T2 新增 Excel 导出代码）
2. Phase 8: 补充执行 Review 分组，逐条 review
3. Phase 9: 产出 change-record.md 归档
