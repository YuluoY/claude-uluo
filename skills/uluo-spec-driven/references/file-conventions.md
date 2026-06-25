# 文件存放约定

AI 产出物全部写回项目仓库。关键在于分清"执行前准备"和"执行后交付"两层：

- **specs/** —— AI 编码的完整产出集散地（独立于 `docs/`）。一个特性目录同时收容执行前和执行后文档
- **docs/** —— 项目自有文档，不受本规范管辖
- **CHANGELOG.md** —— 项目根全局唯一

> 本规范所有 `specs/` 均指**项目根目录下**的 `specs/`，禁止在子目录里再嵌套同名目录。

---

## specs/ 冲突识别与内部隔离

`specs/` 是通用名，许多项目已将其用作 API 规格（OpenAPI/JSON Schema）、测试规格或通用规格文档库。Phase 1（识别场景）须先执行冲突识别，避免特性文档污染既有内容。

### 冲突识别启发式

扫描项目根 `specs/` 顶层内容，按以下标志判定：

| 判定 | 触发标志 |
|------|---------|
| **冲突** | 含 OpenAPI/Swagger 文件（`openapi.yaml`、`*.swagger.json`）、JSON Schema 目录、API 规格目录（`api/`、`schemas/`）、或顶层直接存在非本规范约定的 markdown 文件（非 `<feature>/spec.md` 结构） |
| **兼容** | 目录下均为含 `spec.md` 的特性子目录或设计文档（已按本规范使用） |
| **空** | 目录不存在或为空 |

### 冲突时的内部隔离

冲突时 SHALL 在 `specs/` **内部**创建隔离子目录，**不引入 specs/ 外的备选根目录**（如 `design/`）：

- `specs/features/` —— 放特性文档（三层递进）
- `specs/designs/` —— 放设计文档（单文件与目录形态）
- 已有的 API 规格等内容保持在 `specs/` 顶层原位不动

隔离子目录一旦建立，后续产出按子目录归入，不再混入 `specs/` 顶层。

```
specs/                              ← 项目根 specs/
├── openapi.yaml                    ← 已有 API 规格，保持原位
├── schemas/                        ← 已有 JSON Schema，保持原位
├── features/                       ← 隔离：特性文档
│   └── payment-gateway/
│       └── spec.md
└── designs/                        ← 隔离：设计文档
    └── roadmap-2024.md
```

> **流程约束**：冲突识别是 Phase 1 的子步骤，**不替代、不跳过** SKILL.md 编排的 Phase 0-9 流程。识别结果只影响后续产出路径，不影响阶段顺序与跳过规则。

---

## specs/ 内部三种文档结构

`specs/` 下支持三种文档结构，通过目录是否含 `spec.md` 区分：

### 结构 1：特性文档（三层递进）

适用于特性开发——走 spec → plan → tasks 三层递进。**识别标志：目录含 `spec.md`**。

- 单层模式：`specs/<feature>/`
- 领域分层模式：`specs/<domain>/<feature>/`

```
specs/<feature>/
├── spec.md                  ← 识别标志
├── research-report.md
├── plans/...
├── tasks/...
├── verification-report.md
└── retrospective.md
```

### 结构 2：设计文档单文件

适用于路线图、技术选型、ADR、概念验证等"一个结论一个文件"的设计探索产出。不需要 phase 拆分。

- 单层模式：`specs/<topic>.md`
- 领域分层模式：`specs/<domain>/<topic>.md`

命名规范：topic 名使用 kebab-case，体现文档类型与主题，如 `roadmap-2024.md`、`tech-selection-cache.md`、`adr-001-orm-selection.md`、`spike-realtime-push.md`。

**流程深度**：仅执行 Phase 0/1 + 可选 Phase 2 调研，**不走完整 Phase 0-9**（见"文档形态与流程深度选择"小节）。

### 结构 3：设计文档目录

适用于布局设计、架构设计等"多子文档组成一个设计"的产出。**识别标志：目录不含 `spec.md`**。

- 单层模式：`specs/<topic>/`
- 领域分层模式：`specs/<domain>/<topic>/`

目录内子文档自由组织，无强制结构。`README.md` 作为索引可选。

**流程深度**：仅执行 Phase 0/1 + 可选 Phase 2 调研，**不走完整 Phase 0-9**（见"文档形态与流程深度选择"小节）。

### 三者并存示例

```
specs/
├── roadmap-2026.md                     ← L0 战略：路线图（结构2 单文件）
├── tech-selection-state-mgmt.md        ← L0 战略：技术选型（结构2 单文件）
├── architecture/                       ← L0 战略：架构文档（结构3 设计目录）
│   ├── README.md
│   ├── system-layout.md
│   └── frontend-layout.md
├── components/                         ← L2 组件：需求清单
│   ├── atomic.md                       ← 原子组件需求清单（结构2 单文件）
│   └── business.md                     ← 业务组件需求清单（结构2 单文件）
├── user/                               ← 领域：用户
│   ├── layout.md                       ← L1 领域：布局交互（结构2 单文件）
│   ├── feature-user-profile.md         ← L1 领域：功能领域（结构2 单文件）
│   ├── coupon-module/                  ← 结构1：特性文档（含 spec.md，三层递进）
│   │   ├── spec.md
│   │   ├── plans/
│   │   └── tasks/
│   └── user-search-refactor/           ← 结构1：特性文档
│       └── spec.md
├── payment/                            ← 领域：支付
│   └── payment-gateway/
│       └── spec.md
└── roadmap-2024.md                     ← L0 战略：历史路线图（结构2 单文件）
```

---

## 布局文档设计结构

布局/架构类设计走**结构 3（设计文档目录）**形态——一个设计由多个子文档组成，归入一个目录。

- 目录内子文档自由组织，无强制结构
- `README.md` 作为索引可选（说明本设计目录的组织方式）
- **不产出 `spec.md`**——这是与特性文档（结构 1）的关键区别

示例：

```
specs/architecture/          ← 布局设计文档目录
├── README.md                ← 索引（可选，说明本设计目录的组织）
├── system-layout.md         ← 系统整体布局
├── frontend-layout.md       ← 前端布局
├── backend-layout.md        ← 后端布局
└── infra-layout.md          ← 基础设施布局
```

---

## 领域分层规则

`specs/` 支持两种布局模式：

| 模式 | 路径形态 | 适用场景 |
|------|---------|---------|
| **单层模式**（默认） | `specs/<feature>/` | 特性数少、领域边界不明显 |
| **领域分层模式** | `specs/<domain>/<feature>/` | 特性数多、可识别出多个业务领域 |

### 命名与归属

- 领域名使用 kebab-case：`user/`、`payment/`、`order/`、`infrastructure/`
- 跨领域特性（影响多个领域）归入 `shared/` 领域，不归属任一具体领域
- 领域分层模式同样适用于设计文档：`specs/<domain>/<topic>.md`（单文件）、`specs/<domain>/<topic>/`（设计目录）

### 模式选择阈值

- 默认单层模式
- 当项目特性数 **≥ 5** 且能识别出 **≥ 2** 个业务领域时，建议切换分层模式
- 一次选定后，同项目内可混用——已存在的单层特性保持原位，新特性可按领域归入

---

## 设计文档路径规则

设计文档（L0/L1/L2）的路径按层级与作用域划分：

| 文档类型 | 层级 | 路径 | 形态 |
|---------|------|------|------|
| 路线图 | L0 战略 | `specs/roadmap-<year>.md` | 结构2 单文件（全局） |
| 技术选型 | L0 战略 | `specs/tech-selection-<topic>.md` | 结构2 单文件（全局） |
| 架构文档 | L0 战略 | `specs/architecture/` | 结构3 设计目录（全局） |
| 布局交互 | L1 领域 | `specs/<domain>/layout.md` 或 `specs/<domain>/layout/` | 结构2 单文件 或 结构3 设计目录 |
| 功能领域 | L1 领域 | `specs/<domain>/feature-<name>.md` | 结构2 单文件 |
| 原子组件需求清单 | L2 组件 | `specs/components/atomic.md` | 结构2 单文件（全局清单） |
| 业务组件需求清单 | L2 组件 | `specs/components/business.md` | 结构2 单文件（全局清单） |

**路径规则说明**：
- L0 战略层文档是全局的，不按领域分层
- L1 领域层文档按领域分层，路径含 `<domain>/`
- L2 组件层文档是全局清单（单文件列出所有组件需求），不按领域分层
- 组件清单是单文件（`atomic.md` / `business.md`），不是每组件一文件

---

## 文档形态与流程深度选择

三种文档结构对应不同的流程深度：

| 文档形态 | 适用场景 | 流程深度 |
|---------|---------|---------|
| **结构 1：特性文档（三层递进）** | 需要细化深入的特性开发（Bug 修复/小/中/大功能/重构） | 完整 Phase 0-9 十步流程（按既有跳过规则，如 Bug 修复跳过 Phase 4/5/6） |
| **结构 2：设计文档单文件** | 一个结论的设计探索（路线图/技术选型/ADR/概念验证） | 仅 Phase 0/1 + 可选 Phase 2 调研，**不走 Phase 2-9** |
| **结构 3：设计文档目录** | 多子文档的设计探索（布局/架构设计） | 同结构 2，仅 Phase 0/1 + 可选 Phase 2 调研 |

### 判断原则

> **这份文档会被 tasks.md 引用并驱动编码吗？**
>
> - **会** → 走完整 Phase 0-9 十步流程 + 三层递进（结构 1）
> - **不会** → 走简化流程 + 单文件（结构 2）或设计目录（结构 3）

设计探索类产出如需信息支撑，可选择性启用 Phase 2 调研（researcher 子代理），但不强制产出 research-report.md / spec / plan / tasks。

---

## 标准方案目录结构

标准方案对应**结构 1（特性文档，三层递进）**的完整形态——一个特性 = 一个目录，收容执行前和执行后文档：

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

当任务满足简化条件（预估 ≤2 天 且 影响模块 ≤2 且 不跨端）时，降级为单文件结构（仍是结构 1，仅 plans/tasks 降级为单文件）：

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

> 粒度规则仅适用于**结构 1（特性文档）**。结构 2（单文件）与结构 3（设计目录）不产出 spec/plans/tasks，不受此表约束。

---

## 统一路径规则

| 产出物 | 单层模式路径 | 领域分层模式路径 |
|--------|------------|------------|
| 调研报告 | `specs/<feature>/research-report.md` | `specs/<domain>/<feature>/research-report.md` |
| spec | `specs/<feature>/spec.md` | `specs/<domain>/<feature>/spec.md` |
| plans | `specs/<feature>/plans/README.md` + 子 plan | `specs/<domain>/<feature>/plans/README.md` + 子 plan |
| tasks | `specs/<feature>/tasks/phase*.md` | `specs/<domain>/<feature>/tasks/phase*.md` |
| 验收报告 | `specs/<feature>/verification-report.md` | `specs/<domain>/<feature>/verification-report.md` |
| 复盘 | `specs/<feature>/retrospective.md` | `specs/<domain>/<feature>/retrospective.md` |
| **设计文档单文件** | `specs/<topic>.md` | `specs/<domain>/<topic>.md` |
| **设计文档目录** | `specs/<topic>/*.md` | `specs/<domain>/<topic>/*.md` |
| **路线图** | `specs/roadmap-<year>.md` | N/A（全局） |
| **技术选型** | `specs/tech-selection-<topic>.md` | N/A（全局） |
| **架构文档** | `specs/architecture/` | N/A（全局） |
| **布局交互** | `specs/<domain>/layout.md` 或 `specs/<domain>/layout/` | 同左 |
| **功能领域** | `specs/<domain>/feature-<name>.md` | 同左 |
| **原子组件需求清单** | `specs/components/atomic.md` | N/A（全局清单） |
| **业务组件需求清单** | `specs/components/business.md` | N/A（全局清单） |
| CHANGELOG | `./CHANGELOG.md`（不变） | `./CHANGELOG.md`（不变） |

> **冲突隔离前缀**：当 `specs/` 与项目已有内容冲突时（见"specs/ 冲突识别与内部隔离"小节），上述特性文档路径前加 `specs/features/`，设计文档路径前加 `specs/designs/`。例如 `specs/features/payment-gateway/spec.md`、`specs/designs/roadmap-2024.md`。

---

## 简化 vs 标准 决策矩阵

**标准方案是默认；简化方案是例外。** 此矩阵仅适用于**结构 1（特性文档）**内部的粒度选择——决定 plans/tasks 是目录还是单文件。结构 2/3 不适用。

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
