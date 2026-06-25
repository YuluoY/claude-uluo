# 变更文档创建执行过程

> 任务: 认证模块从 session 认证改为 JWT 认证的变更文档创建
> 日期: 2026-06-25 | 执行者: huyongle
> 项目根目录: /Users/huyongle/Desktop/workspace/claude-uluo/evals/workspaces/uluo-change-flow/fixtures/project-2

---

## Phase 0: 获取作者

运行 `git config user.name`，获取作者名: **huyongle**

---

## Phase 1: 识别变更

- 变更需求: 认证模块从 session 认证改为 JWT 认证
- 目标特性目录: `specs/user-auth/`
- 已有文档: `specs/user-auth/spec.md`（原始 spec）
- 已有代码: `src/auth/auth.controller.js`（认证控制器）

阅读现有 spec.md 关键内容:
- 背景与动机: 系统需要用户登录功能来保护敏感数据，目前使用 session 认证
- FR-1 登录: 创建 session，重定向到个人中心
- FR-2 会话管理: 显示当前活跃 session 列表，可强制下线指定用户
- 调研依据: express-session 可行（Context7）

阅读现有 auth.controller.js 关键内容:
- 登录接口: `req.session.userId = user.id`（session 赋值）
- 登出接口: `req.session.destroy()`（session 销毁）
- 认证中间件: `if (!req.session.userId)`（session 校验）
- 依赖: express-session、bcrypt

---

## Phase 2: 影响调研

基于 spec.md 和 auth.controller.js 扫描，产出影响清单:

**文档影响（5 项）:**
1. spec.md > ## 背景与动机 — MODIFIED — 中
2. spec.md > ## 功能需求 > FR-1 — MODIFIED — 高
3. spec.md > ## 功能需求 > FR-2 — MODIFIED — 高
4. spec.md > ## 验收标准 — MODIFIED — 中
5. spec.md > ## 调研依据 > 技术可行性 — MODIFIED — 中

**代码影响（3 项）:**
1. auth 模块 — MODIFIED — 高（登录/登出/认证中间件核心逻辑全量改写）
2. session 依赖 — REMOVED — 中（移除 express-session）
3. JWT 依赖 — ADDED — 低（新增 jsonwebtoken）

**设计稿影响:** 无（不涉及 UI 变更）

---

## Phase 3: 产出 L1 spec.md

加载 `examples/spec-template.md` 模板，基于影响清单产出变更 spec。

**关键内容:**
- 变更背景: session 认证限制水平扩展和跨域，需迁移到 JWT 无状态认证
- 影响范围: 覆盖文档（5 项）、代码（3 项）、设计稿（无）三个维度，均标注风险等级
- 决策结论: 批准（JWT 解决扩展性和跨域问题，风险可控）

**L1 边界遵守:**
- 不含具体文件路径（src/xxx.js）
- 不含代码片段
- 不含行号
- 不含技术方案选择

文件路径: `specs/user-auth/changes/CHG-001/spec.md`

---

## Phase 4: 产出 L2 plan.md

加载 `examples/plan-template.md` 模板，产出变更方案。

**技术方案选择:**
- 方案 A: 纯 JWT（无状态）— 复杂度低
- 方案 B: JWT 加黑名单 — 复杂度中
- 选择: 方案 A（优先解决扩展性，避免引入 Redis）

**Delta 规格（5 个 MODIFIED）:**
1. spec.md > ## 背景与动机 — 原文摘要 + 改为
2. spec.md > ## 功能需求 > FR-1 — 原文摘要 + 改为
3. spec.md > ## 功能需求 > FR-2 — 原文摘要 + 改为
4. spec.md > ## 验收标准 — 原文摘要 + 改为
5. spec.md > ## 调研依据 > 技术可行性 — 原文摘要 + 改为

每个 MODIFIED delta 均包含 **原文摘要**（摘录原文关键内容）和 **改为**（描述修改后内容）。

**L2 边界遵守:**
- 不含具体文件路径
- 不含行号
- 不含任务执行顺序

文件路径: `specs/user-auth/changes/CHG-001/plan.md`

---

## Phase 5: 产出 L3 tasks.md

加载 `examples/tasks-template.md` 模板，产出执行任务清单。

**执行任务清单（8 个任务）:**

| 任务 | 目标文件 | 类型 | 需调研 | 依赖 |
|------|---------|------|--------|------|
| T1: 调研 jsonwebtoken API 并更新调研依据 | specs/user-auth/spec.md | 文档 | 是 (Context7) | 无 |
| T2: 修改 spec.md 背景与动机 | specs/user-auth/spec.md | 文档 | 否 | T1 |
| T3: 修改 spec.md FR-1 登录需求 | specs/user-auth/spec.md | 文档 | 否 | T1 |
| T4: 修改 spec.md FR-2 会话管理需求 | specs/user-auth/spec.md | 文档 | 否 | T1 |
| T5: 修改 spec.md 验收标准 | specs/user-auth/spec.md | 文档 | 否 | T3, T4 |
| T6: 重构登录接口为 JWT 签发 | src/auth/auth.controller.js | 代码 | 是 (Context7) | T1 |
| T7: 重构认证中间件为 JWT 验证 | src/auth/auth.controller.js | 代码 | 是 (Context7) | T6 |
| T8: 修改登出接口适配 JWT | src/auth/auth.controller.js | 代码 | 否 | T6 |

**需调研标注:**
- T1: 是 — MCP Context7 查询 jsonwebtoken 官方文档
- T6: 是 — MCP Context7 查询 jsonwebtoken sign API
- T7: 是 — MCP Context7 查询 jsonwebtoken verify API

**目标文件指向 src/auth/ 下的实际代码文件:**
- T6、T7、T8 均指向 `src/auth/auth.controller.js`（已存在的实际代码文件）

**L3 边界遵守:**
- 不含验收检查点字段
- 不含"怎么验证改对了"

文件路径: `specs/user-auth/changes/CHG-001/tasks.md`

---

## Phase 6: 产出 checklist.md

加载 `examples/checklist-template.md` 模板，从 spec/plan/tasks 三层抽出 review 检查点。

**四个 Review 分组:**

1. **Spec Review（5 项，全部 [x]）:**
   - 影响范围清单中所有文档影响项都有对应 plan delta
   - 影响范围清单中所有代码影响项都有对应 tasks 任务
   - 决策结论为"批准"
   - 变更编号唯一（CHG-001）
   - 影响范围覆盖文档、代码、设计稿三个维度

2. **Plan Review（4 项，全部 [x]）:**
   - 每个 MODIFIED delta 都包含"原文摘要"和"改为"
   - 技术方案选择有方案对比和选择结论
   - plan 中不含具体文件路径和行号
   - delta 引用位置格式为"文件名 > 章节 > 子章节"

3. **Tasks Review（5 项，全部 [x]）:**
   - 每个任务都有目标文件路径
   - 每个任务描述都是动词开头（修改/重构）
   - T1 和 T6 和 T7 标注了需调研及建议调研方式
   - 任务依赖关系清晰无循环
   - tasks 中不含验收检查点字段

4. **执行 Review（4 项，全部 [ ] 待 review）:**
   - 所有 tasks 任务已执行完成
   - spec.md 已按 plan delta 更新
   - 代码文件已修改
   - 调研结论已记录（T1 和 T6 和 T7）

**Review 结论:**
- 结论: 不通过
- 原因: 变更文档已创建，代码执行阶段尚未开始，执行 Review 4 项待 review
- 回退历史: 第 1 次回退 plan 层级 — 初稿遗漏了 spec.md > ## 调研依据 > 技术可行性 的 MODIFIED delta — 已修复

文件路径: `specs/user-auth/changes/CHG-001/checklist.md`

---

## Phase 7: 清理旧文件

删除 CHG-001 目录下不属于本次变更文档的文件:
- `change.md`（已删除）
- `impact-analysis.md`（已删除）

保留四份标准变更文档: spec.md、plan.md、tasks.md、checklist.md

---

## Phase 8: 校验

运行校验命令:
```bash
PROJECT_ROOT=/Users/huyongle/Desktop/workspace/claude-uluo/evals/workspaces/uluo-change-flow/fixtures/project-2 \
node /Users/huyongle/Desktop/workspace/claude-uluo/skills/uluo-change-flow/scripts/validate-change.js \
  specs/user-auth/changes/CHG-001/
```

**校验结果:**
```
通过: 44  失败: 0  警告: 4  合计: 48
✓ 全部校验通过。
```

**7 步管线详细结果:**

| 步骤 | 检查项 | 结果 |
|------|--------|------|
| Step 1 | 目录结构 — 四份文档存在性 | ✓ 全部存在 |
| Step 2 | L1 spec — 变更背景/影响范围/决策结论 | ✓ 通过（1 个警告: 代码影响说明列含"中"字被误判） |
| Step 3 | L2 plan — Delta 规格/字段完整性 | ✓ 5 个 MODIFIED delta 字段完整 |
| Step 4 | L3 tasks — 任务字段/动词开头/调研标注 | ✓ 8 个任务全部合规 |
| Step 5 | checklist — 四个分组/检查点格式/结论一致性 | ✓ 18 个检查点（1 个警告: 不通过但无 [-] 项） |
| Step 6 | 同步一致性 — spec→plan→tasks→checklist 对齐 | ✓ 全部对齐（1 个警告: 4 个待 review 项） |
| Step 7 | change-record — 归档文档完整性 | ⚠ 跳过（未找到 change-record.md，执行阶段后产出） |

**警告说明（均为预期，非失败）:**
1. spec.md 代码影响说明列含"中间件"的"中"字，被风险等级检查器误判 — 实际风险等级列均为合法值
2. checklist 结论"不通过"但无 [-] 项 — 因为执行 Review 为 [ ] 待 review（未执行），非 [-] 不通过
3. checklist 有 4 个待 review 项 — 执行阶段尚未开始，预期行为
4. change-record.md 未找到 — Phase 9 留痕归档在执行后产出，本次仅创建变更文档

---

## 产出文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| spec.md | specs/user-auth/changes/CHG-001/spec.md | L1 变更范围（影响范围含代码维度+风险等级） |
| plan.md | specs/user-auth/changes/CHG-001/plan.md | L2 变更方案（5 个 MODIFIED delta 含原文摘要+改为） |
| tasks.md | specs/user-auth/changes/CHG-001/tasks.md | L3 执行任务（8 个任务，目标文件指向 src/auth/，含需调研标注） |
| checklist.md | specs/user-auth/changes/CHG-001/checklist.md | 独立验收（四分组+Review 结论，检查点格式 - [ ] / - [x] / - [-]） |

---

## 质量闸门自检

- [x] 四文档齐全（spec/plan/tasks/checklist）
- [x] 变更编号连续（CHG-001）
- [x] 三层职责边界清晰（spec 不写怎么改、plan 不写文件路径、tasks 不写验收点）
- [x] checklist 独立于三层，只抽 review 检查点
- [x] spec 影响范围覆盖代码维度，标注风险等级（高/中/低）
- [x] plan MODIFIED delta 包含原文摘要和改为
- [x] tasks 目标文件指向 src/auth/ 下的实际代码文件
- [x] tasks 需调研任务标注了调研方式（Context7）
- [x] checklist 检查点格式为 - [ ] / - [x] / - [-]
- [x] checklist 包含 Review 结论
- [x] 校验通过（0 失败）
