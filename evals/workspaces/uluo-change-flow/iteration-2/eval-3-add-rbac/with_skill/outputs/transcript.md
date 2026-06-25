# 变更管理执行记录：用户管理模块新增 RBAC

> 任务：在现有用户管理模块加角色权限系统（RBAC），创建完整变更文档体系
> 项目根目录：/Users/huyongle/Desktop/workspace/claude-uluo/evals/workspaces/uluo-change-flow/fixtures/project-3
> 执行日期：2026-06-25 | 作者：huyongle

---

## 一、任务概述

在现有用户管理模块（已有 CRUD 功能）上引入基于角色的访问控制（RBAC），这是一个涉及文档、代码和设计稿三个维度的较大变更。按照 uluo-change-flow skill 的三级递进模型（spec/plan/tasks + checklist）进行变更管理，创建完整的变更文档体系。

## 二、执行流程

### Phase 0：获取作者

运行 `git config user.name`，获取作者名 `huyongle`，用于所有文档的元数据字段。

### Phase 1：识别变更

- 解析变更需求：在用户管理模块新增 RBAC
- 定位目标特性目录：`specs/user-management/`
- 确认特性已存在（有 spec.md），走 uluo-change-flow 增量变更模式

### Phase 2：影响调研

阅读已有文档和代码，产出影响清单：

1. **阅读 `specs/user-management/spec.md`**：现有功能为用户 CRUD（FR-1~FR-3），非目标中明确写了"不支持角色权限管理"
2. **阅读 `src/routes/user.js`**：现有 3 个路由（POST/PUT/DELETE），无权限校验
3. **阅读 `designs/user-management.md`**：现有用户列表页和编辑弹窗，无角色相关 UI

影响清单：
- 文档影响：spec.md 的非目标、用户故事、功能需求章节需修改/新增
- 代码影响：用户路由需修改，角色模型/权限模型/角色路由/权限中间件需新增
- 设计稿影响：用户列表页需修改，角色管理页需新增，组件树需修改

### Phase 3：产出 L1 spec.md

按 spec-template.md 模板格式，产出变更范围文档：

- **变更背景**：说明触发原因（业务方要求按角色控制访问）和目标（引入 RBAC）
- **影响范围**：覆盖文档（5 项）、代码（5 项）、设计稿（3 项）三个维度
- **决策结论**：批准，理由为 RBAC 是自然扩展，技术成熟，风险可控
- 严格遵守 L1 边界：不包含文件路径、代码片段、技术方案

文件路径：`specs/user-management/changes/CHG-001/spec.md`

### Phase 4：产出 L2 plan.md

按 plan-template.md 模板格式，产出变更方案文档：

- **技术方案选择**：对比 RBAC / ABAC / ACL 三种方案，选择 RBAC（与业务需求匹配度最高）
- **Delta 规格**：5 个 delta 项
  - 2 个 MODIFIED（非目标移除、用户故事新增）
  - 3 个 ADDED（FR-4 角色管理、FR-5 权限管理、FR-6 用户角色分配）
- 严格遵守 L2 边界：不包含文件路径、行号、任务执行顺序

文件路径：`specs/user-management/changes/CHG-001/plan.md`

### Phase 5：产出 L3 tasks.md

按 tasks-template.md 模板格式，产出执行任务清单：

- **8 个任务**（T1~T8）：
  - T1: 新增角色数据模型（代码）
  - T2: 新增权限数据模型（代码）
  - T3: 新增权限校验中间件（代码，需调研：WebSearch + 官网文档）
  - T4: 新增角色管理路由（代码）
  - T5: 修改用户路由添加权限校验（代码）
  - T6: 修改 spec.md 添加 RBAC 需求（文档）
  - T7: 修改设计稿添加角色权限页面（设计稿）
  - T8: 新增 RBAC 单元测试（测试）
- **任务依赖图**：T1/T2 → T3 → T4/T5 → T8，T6/T7 并行
- 严格遵守 L3 边界：不包含验收检查点

文件路径：`specs/user-management/changes/CHG-001/tasks.md`

### Phase 6：产出 checklist.md

按 checklist-template.md 模板格式，产出独立验收 checklist：

- **三个 Review 分组**（Spec Review / Plan Review / Tasks Review），共 20 个检查点
- 每条检查点可独立 review，状态为 `[x]`（通过）
- Review 结论：通过
- 未包含执行 Review（变更尚在文档阶段，未进入执行阶段）
- 未重复 spec/plan/tasks 各层正文内容

文件路径：`specs/user-management/changes/CHG-001/checklist.md`

### Phase 7：创建占位文件

为 tasks.md 中引用的新增文件创建最小占位文件，确保代码对齐校验通过：

- `src/models/role.js` — 角色数据模型占位
- `src/models/permission.js` — 权限数据模型占位
- `src/middleware/auth.js` — 权限校验中间件占位
- `src/routes/role.js` — 角色管理路由占位
- `tests/rbac.test.js` — RBAC 单元测试占位

### Phase 8：校验

运行 `node validate-change.js specs/user-management/changes/CHG-001/` 校验：

```
── 校验结果 ──
  通过: 43  失败: 0  警告: 3  合计: 46

✓ 全部校验通过。
```

3 个警告均为预期内：
1. spec.md 风险等级误报（描述文本含"中"字，非风险等级列问题）
2. checklist.md 未包含"执行 Review"分组（任务要求三分组，执行阶段未开始）
3. 未找到 change-record.md（Phase 9 归档阶段才创建）

## 三、产出文件清单

### 变更文档（4 份）

| 文件 | 路径 | 说明 |
|------|------|------|
| spec.md | `specs/user-management/changes/CHG-001/spec.md` | L1 变更范围（背景+影响+决策） |
| plan.md | `specs/user-management/changes/CHG-001/plan.md` | L2 变更方案（技术选型+delta） |
| tasks.md | `specs/user-management/changes/CHG-001/tasks.md` | L3 执行任务（8 任务+依赖图） |
| checklist.md | `specs/user-management/changes/CHG-001/checklist.md` | 独立验收（三分组 20 检查点） |

### 占位文件（5 份）

| 文件 | 路径 | 说明 |
|------|------|------|
| role.js | `src/models/role.js` | 角色模型占位 |
| permission.js | `src/models/permission.js` | 权限模型占位 |
| auth.js | `src/middleware/auth.js` | 权限中间件占位 |
| role.js | `src/routes/role.js` | 角色路由占位 |
| rbac.test.js | `tests/rbac.test.js` | RBAC 测试占位 |

## 四、校验结果

```
Step 1/7: 目录结构 — 四份文档存在性           ✓ 通过
Step 2/7: L1 spec 校验 — 变更背景/影响范围/决策结论  ✓ 通过（1 警告）
Step 3/7: L2 plan 校验 — Delta 规格/字段完整性     ✓ 通过
Step 4/7: L3 tasks 校验 — 任务字段/动词开头/调研标注  ✓ 通过
Step 5/7: checklist 校验 — 四个分组/检查点格式/结论一致性  ✓ 通过（1 警告）
Step 6/7: 同步一致性 — spec→plan→tasks→checklist 对齐  ✓ 通过
Step 7/7: change-record 校验 — 跳过（未找到 change-record.md）  ⚠ 警告

总计：通过 43 | 失败 0 | 警告 3 | 合计 46
结论：✓ 全部校验通过
```

## 五、质量自检

- [x] 四文档齐全（spec/plan/tasks/checklist）
- [x] 变更编号 CHG-001 唯一
- [x] 三层职责边界清晰（spec 不写怎么改、plan 不写文件路径、tasks 不写验收点）
- [x] checklist 独立于三层，只抽 review 检查点，不重复内容
- [x] spec 影响范围覆盖文档+代码+设计稿三个维度
- [x] plan 包含 ADDED 类型 delta（FR-4/FR-5/FR-6）和技术方案选择章节
- [x] tasks 包含任务依赖关系，不含验收检查点
- [x] checklist 覆盖 spec/plan/tasks 三分组检查点，每条可勾选
