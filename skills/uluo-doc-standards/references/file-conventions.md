# 文件存放约定

AI 产出物全部写回项目仓库。关键在于分清"执行前准备"和"执行后交付"两层：

- **specs/** —— AI 编码的完整产出集散地（独立于 `docs/`）。一个特性目录同时收容执行前和执行后文档
- **docs/** —— 项目自有文档，不受本规范管辖
- **CHANGELOG.md** —— 项目根全局唯一

---

## 标准方案目录结构

```
specs/<feature-name>/                    ← 一个特性 = 一个目录（独立于 docs/）
├── research-report.md                    ← 执行前：调研报告（多源信息综合，spec 的前置输入）
├── spec.md                              ← 执行前：1 个文件，需求单一事实来源
│
├── plans/                               ← 执行前：目录，按大 slice 拆分
│   ├── README.md                        ← 总入口：全局架构 + 跨 slice 决策（必在）
│   ├── backend-architecture.md          ← 后端方案（多 slice 时拆分，可选）
│   └── frontend-architecture.md         ← 前端方案（多 slice 时拆分，可选）
│
├── tasks/                               ← 执行前：目录，按 phase 拆分
│   ├── README.md                        ← 全局总览：跨阶段依赖 + 风险
│   ├── phase1-infrastructure.md         ← Phase 1: 基础设施/数据层
│   ├── phase2-core-logic.md             ← Phase 2: 核心业务逻辑
│   ├── phase3-api-integration.md        ← Phase 3: 接口/集成层
│   └── phase4-testing-docs.md           ← Phase 4: 测试/文档收尾
│
├── verification-report.md               ← 执行后：验收报告（归入特性目录）
└── retrospective.md                     ← 执行后：总结复盘（归入特性目录）

多个特性同时进行时，各自独立目录，互不混淆：
specs/
├── coupon-module/          ← 特性 A：research-report + spec + plans + tasks + 报告 + 复盘
├── user-search-refactor/   ← 特性 B：同上
└── payment-gateway/        ← 特性 C：同上
```

---

## 简化方案目录结构

当任务满足简化条件（预估 ≤2 天 且 影响模块 ≤2 且 不跨端）时，降级为单文件结构：

```
specs/<feature-name>/
├── research-report.md       ← 执行前：调研报告（可选，Bug修复可跳过）
├── spec.md                  ← 执行前：需求规格（单文件）
├── plan.md                  ← 执行前：执行计划（单文件，不建 plans/ 目录）
├── tasks.md                 ← 执行前：任务分解（单文件，2-3 phase 合并）
│
├── verification-report.md   ← 执行后可选
└── retrospective.md         ← 执行后可选
```

> **重要**：tasks.md 即使是单文件，内部也必须按 phase 分节，禁止把所有任务混在一起。最少 2 个 phase。

---

## 粒度规则

| 文档 | 文件数 | 规则 |
|------|--------|------|
| **research-report.md** | 1 个 | 调研层产出，spec 前置输入。小功能可选，中功能及以上必产 |
| **spec.md** | 1 个 | 永远只有一份——需求的单一事实来源，不允许拆散 |
| **plans/** | ≥1 个 | README.md 总入口必在；多 slice 时拆子文件。大功能通常 2-4 个 |
| **tasks/** | ≥2 个 | 按 phase 拆分，最小编制 2 个文件——禁止单文件巨型清单 |
| **验收报告** | 1 个 | 归入所属特性目录，不另建全局 reports |
| **复盘** | 1 个 | 同上 |
| **CHANGELOG** | 1 个 | 项目根全局唯一，所有特性追加写入 |

---

## 统一路径规则

| 产出物 | 推荐路径 | 说明 |
|--------|---------|------|
| 调研报告 | `specs/<feature>/research-report.md` | 执行前，单文件，spec 的前置输入 |
| spec | `specs/<feature>/spec.md` | 执行前，单文件 |
| plans | `specs/<feature>/plans/README.md` + 子 plan | 执行前，目录 |
| tasks | `specs/<feature>/tasks/phase*.md` | 执行前，目录 |
| 验收报告 | `specs/<feature>/verification-report.md` | 执行后，归入特性目录 |
| 复盘 | `specs/<feature>/retrospective.md` | 执行后，归入特性目录 |
| CHANGELOG | `./CHANGELOG.md` | 全局追加 |

---

## 简化 vs 标准 决策矩阵

**标准方案是默认；简化方案是例外。**

触发简化方案的条件（满足任一即可）：

| 条件 | 阈值 |
|------|------|
| 预估开发时间 | ≤ 2 天 |
| 影响模块数 | ≤ 2 个 |
| 跨端范围 | 纯后端 或 纯前端（不跨栈） |
| plan 复杂度 | 不涉及多 slice（无多子系统协作） |

触发标准方案的条件（满足任一即触发）：

| 条件 | 阈值 |
|------|------|
| 预估开发时间 | > 2 天 |
| 影响模块数 | ≥ 3 个 |
| 跨端范围 | 跨前后端 / 跨服务 |
| 涉及数据库 | schema 变更 |
| 涉及外部 | API 对接 |

**当不确定时，默认走标准方案。** 宁可多写文档，不可事后补。

---

## 相关文件

- [research-protocol.md](./research-protocol.md) — 信息调研协议
- [analysis-protocol.md](./analysis-protocol.md) — 源码分析协议
- [spec-template.md](../examples/spec-template.md) — spec 模板
- [plan-template.md](../examples/plan-template.md) — plan 模板
- [tasks-template.md](../examples/tasks-template.md) — tasks 模板
