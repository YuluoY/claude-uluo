---
name: uluo-spec-driven
version: 0.1.0
description: >-
  Spec-Driven 设计稿引擎——覆盖项目全生命周期的设计文档产出：设计稿（战略/领域/组件）+ 细化流程（spec/plan/tasks）+ 记录（changelog/验收/复盘）。面向开发者同行，文档写回代码仓库。Use this skill whenever the user asks AI to implement a feature, fix a bug, refactor code, design a system, produce design documents (roadmap/tech-selection/architecture/layout/component), or do any coding task that requires planning and tracking. Also use when the user mentions any of: spec, plan, tasks, changelog, 验收, 复盘, 文档规范, 路线图, 技术选型, 架构, 布局, 组件设计, 设计稿, or any task that sounds like it needs structured before/after documentation.
---

# uluo-spec-driven

**编排器**：3 部分文档模型（3 层设计稿 + 细化流程 + 记录层）。方法论见 `references/`，模板见 `examples/`，硬约束校验见 `scripts/`。

---

## 文档概念模型

文档模型由三部分组成，覆盖项目全生命周期：

**Part 1：设计稿（3 层递进流程，战略→领域→组件）**

| 层级 | 文档类型 | 职责 | 产出物 |
|------|---------|------|--------|
| L0 战略层 | roadmap / tech-selection / architecture | 项目方向、技术决策、整体架构 | 路线图、技术选型决策、架构设计文档 |
| L1 领域层 | layout-interaction / feature-domain | 领域内的布局交互设计与功能设计 | 布局交互文档、功能领域文档 |
| L2 组件层 | atomic-component / business-component | 原子组件与业务组件需求清单 | 组件需求清单（仅列需求，不写详细 API） |

L0/L1/L2 是一个递进流程：战略层定方向 → 领域层定业务 → 组件层定实现单元。每层可独立触发，但建议按顺序。

**Part 2：细化流程（spec/plan/tasks 三层递进，按需启用）**

| 层级 | 文档 | 职责 | 产出物 |
|------|------|------|--------|
| 调研层 | research-report | 信息采集与综合 | 多渠道信息综合、多方案对比、记录探索过程和死胡同 |
| 定义层 | spec.md | What & Why | 背景与动机 → 用户故事 → 目标/非目标 → 功能需求 → 非功能性需求 → 验收标准 → 调研依据 |
| 设计层 | plans/ | How | 架构概览 → 关键设计决策 → 代码库分析 → 模块设计 → 数据模型 → API 契约 → 测试策略 → 回滚方案 |
| 执行层 | tasks/ | Steps | 按 phase 拆分，每任务标注产出路径、参考代码、复用模块 |

spec / plan / tasks **不是独立的执行层级**，而是对设计稿（L0/L1/L2）中某些功能或需求进一步细化到可执行的工具流程。当设计稿的某个产出需要细化到编码可执行时，才启用 spec→plan→tasks 三层递进。某些情况下可能不适用，只需要一个 md 文档就能产出的就不强制走三层递进。

**Part 3：记录层（changelog / verification / retrospective）**

| 文档 | 职责 | 产出物 |
|------|------|--------|
| CHANGELOG | 面向下游开发者的变更记录 | 按 Keep a Changelog 规范追加 |
| verification-report | 对照 spec 逐条验证 | 验收清单 + 偏差说明 |
| retrospective | 闭环复盘 | What Went Well / Better / Lessons / Action Items |

**关键关系链：**
- **设计稿流程（L0→L1→L2）**：战略定方向 → 领域定业务 → 组件定实现单元
- **research-report → spec** 是提炼链：调研报告记录探索过程，spec 只保留结论
- **spec + plan = 需求设计文档**：合起来是传统 Design Doc，分开因为评审受众不同
- **spec → verification** 是 1:1 验证链：验收报告逐条对照 spec 的验收标准
- **plan → tasks** 是拆解链：plan 的模块设计决定 tasks 的 phase 划分
- **CHANGELOG 对外，verification 对内，retrospective 闭环**
- **设计稿结论可被 spec.md 引用为调研依据**：L0/L1/L2 的结论可被细化流程的 spec.md 引用

---

## 项目启动主流程

项目启动主流程编排设计稿流程 + 细化流程 + 记录：

```mermaid
flowchart TD
    START[项目启动] --> L0[L0 战略设计<br/>路线图/技术选型/架构]
    L0 --> L1[L1 领域设计<br/>布局交互/功能领域]
    L1 --> L2[L2 组件设计<br/>原子组件/业务组件清单]
    L2 --> REFINE{设计稿中某些功能<br/>需要进一步细化?}
    REFINE -->|是| SPEC[细化流程<br/>spec → plan → tasks<br/>Phase 0-9]
    REFINE -->|否| RECORD[记录层<br/>changelog/verification/retrospective]
    SPEC --> RECORD

    L0 -.->|可独立触发| STANDALONE[单层产出]
    L1 -.->|可独立触发| STANDALONE
    L2 -.->|可独立触发| STANDALONE
```

设计稿流程（L0→L1→L2）是主流程的核心，三层递进。细化流程（spec/plan/tasks）是对设计稿中某些功能/需求的进一步细化，按需启用，不强制。

---

## 细化流程（spec/plan/tasks，Phase 0-9）

> **定位**：这是对设计稿（L0/L1/L2）中某些功能/需求进一步细化到可执行的工具流程，不是独立层级。当设计稿的某个产出需要细化到编码可执行时才启用。某些情况下可能不适用，只需要一个 md 文档就能产出的就不强制走三层递进。

**十阶段流程**：Phase 0-9 递进，中功能及以上在 Phase 2/8 启用子代理。

```mermaid
flowchart TD
    P0[Phase 0: 获取作者<br/>运行 git config user.name] --> P1[Phase 1: 识别场景<br/>冲突识别+布局+形态判定]
    P1 --> P2[Phase 2: 信息调研<br/>🎯 启动 researcher 子代理<br/>产出 research-report.md]
    P2 --> P3[Phase 3: 产出 spec<br/>从调研报告提炼结论]
    P3 --> P4[Phase 4: 源码分析<br/>加载 analysis-protocol.md]
    P4 --> P5[Phase 5: 产出 plans<br/>加载 plan-template.md]
    P5 --> P6[Phase 6: 产出 tasks<br/>加载 tasks-template.md]
    P6 --> P7[Phase 7: 执行编码<br/>按 tasks 逐 phase 实现<br/>测试通过 → 追加 CHANGELOG]
    P7 --> P8[Phase 8: 验收<br/>🎯 可选启动 reviewer 子代理<br/>加载 verification-report-template.md]
    P8 --> P9[Phase 9: 复盘<br/>加载 retrospective-template.md]

    P0 -.- R0["禁止使用占位符或字面量 'git config user.name'"]
    P2 -.- L2["调研层"]
    P3 -.- L3["Layer 1: 定义"]
    P5 -.- L5["Layer 2: 设计"]
    P6 -.- L6["Layer 3: 执行"]
    P8 -.- L8["Layer 4: 记录"]
    P9 -.- L9["Layer 4: 记录"]

    V[🔧 文档产出后<br/>运行 validate-docs.js --strict] -.-> P7
```

**Phase 1 子步骤（识别场景 + 决定 specs/ 内部布局）：**

> ⚠️ **遵循 SKILL.md 编排的流程框架**。流程深度按场景区分：
> - **需要细化深入的特性开发**（Bug 修复/小/中/大功能/重构）：走完整 Phase 0-9 十步流程 + 三层递进（spec → plan → tasks）。既有场景跳过规则不变
> - **设计探索类产出**（路线图/技术选型/布局设计/ADR/概念验证）：仅执行 Phase 0/1 + 可选 Phase 2 调研，不走 Phase 2-9，直接产出单文件或设计目录

1. 执行 specs/ 冲突识别（若冲突则创建 `specs/features/`、`specs/designs/` 隔离）
2. 判定布局模式（单层/领域分层）
3. 判定文档形态与流程深度（三层递进/单文件/设计目录）
4. 查场景表确定文档清单

**各场景的阶段跳过规则：**
- **Bug 修复**：跳过 Phase 4/5/6（不写 plan），tasks 简化为 2 phase；调研从简（不产 research-report）
- **小功能**：调研从简（research-report 可选），Phase 4/5/6 简化执行（源码分析可从简，plan 单文件，tasks 2-3 phase）
- **技术方案评审**：跳过 Phase 6/7/8/9（不执行编码）；产 research-report + spec + plans/(README)
- **事后复盘**：仅执行 Phase 8/9（已有代码和 CHANGELOG）
- **设计探索**：仅执行 Phase 0/1（可选 Phase 2 调研），跳过 Phase 3-9；产出单文件或设计目录

---

## 场景选择表

| 场景 | 涉及层 | 文档产出 | 子代理 | 变体 |
|------|--------|---------|--------|------|
| **Bug 修复** | L1+L4 | spec + tasks(2 phase) + CHANGELOG | 无 | 简化 |
| **小功能新增** | 调研+L1+L2+L3+L4 | research-report(可选) + spec + plan(单文件) + tasks(2-3 phase) + CHANGELOG | researcher(可选) | 简化 |
| **中功能新增** | 调研+L1+L2+L3+L4 | research-report + spec + plans/(README+子plan) + tasks(3-4 phase) + CHANGELOG + 验收 | researcher + reviewer(验收) | 标准 |
| **大功能/重构** | 全五层 | 中功能全部 + 复盘 | researcher + reviewer(验收+复盘) | 标准 |
| **技术方案评审** | 调研+L1+L2 | research-report + spec + plans/(README) | researcher | 简化 |
| **事后复盘** | L4 | CHANGELOG + 验收 + 复盘（如缺失则补） | reviewer(可选) | N/A |
| **路线图** | L0 战略 | roadmap.md | 无 | 简化 |
| **技术选型** | L0 战略 | tech-selection.md | researcher(可选) | 简化 |
| **架构设计** | L0 战略 | architecture/（设计目录） | researcher(可选) | 简化 |
| **布局交互** | L1 领域 | layout-interaction.md 或 layout/ | 无 | 简化 |
| **功能领域** | L1 领域 | feature-domain.md | 无 | 简化 |
| **原子组件清单** | L2 组件 | atomic-component.md | 无 | 简化 |
| **业务组件清单** | L2 组件 | business-component.md | 无 | 简化 |
| **设计探索** | 单文件/设计目录 | `<topic>.md` 或 `<topic>/`（路线图/技术选型/布局设计/ADR） | researcher(可选) | 简化 |

---

## 简化 vs 标准 决策规则

**标准方案是默认，简化方案是例外。** 不确定时走标准——宁可多写文档，不可事后补。

简化方案触发条件（满足任一即可）：

| 条件 | 阈值 |
|------|------|
| 预估开发时间 | ≤ 2 天 |
| 影响模块数 | ≤ 2 个 |
| 跨端范围 | 纯后端或纯前端（不跨栈） |
| plan 复杂度 | 不涉及多 slice（无多子系统协作） |

满足标准方案的条件（满足任一即触发）：预估 >2 天、影响模块 ≥3、跨前后端/跨服务、涉及 DB schema 变更、涉及外部 API 对接。

详细目录结构（标准/简化两种树）见 [references/file-conventions.md](references/file-conventions.md)。

---

## 文件存放约定

顶层规则。完整细节见 [references/file-conventions.md](references/file-conventions.md)。

- `specs/` 指项目根目录下的 `specs/`，独立于 `docs/`；CHANGELOG 位于项目根 `./CHANGELOG.md`（全局唯一，追加写入）
- **冲突隔离**：当 `specs/` 已被项目用作 API 规格（OpenAPI/Swagger）、JSON Schema、测试规格等非本规范用途时，在 `specs/` **内部**创建隔离子目录——`specs/features/`（放特性文档）与 `specs/designs/`（放设计文档），已有内容保持原位不动。**不引入 `specs/` 外的备选根目录**
- `specs/` 下支持三种文档结构：
  - **特性文档**（三层递进，目录含 `spec.md`）：`specs/<feature>/` 或 `specs/<domain>/<feature>/`
    - research-report → `<feature>/research-report.md`；spec → `<feature>/spec.md`（永远单文件）；plans → `<feature>/plans/README.md`（总入口必在）+ 子 plan（按需）；tasks → `<feature>/tasks/phase*.md`（必须按 phase 拆分，≥2 个文件）；验收报告 → `<feature>/verification-report.md`；复盘 → `<feature>/retrospective.md`
  - **设计文档单文件**（路线图/技术选型/ADR/概念验证，一个结论一个文件）：`specs/<topic>.md` 或 `specs/<domain>/<topic>.md`
  - **设计文档目录**（布局设计/架构设计，多子文档组成一个设计，目录**不含** `spec.md`）：`specs/<topic>/` 或 `specs/<domain>/<topic>/`
- 设计文档（L0/L1/L2）的路径规则：
  - L0 战略层（全局）：`specs/roadmap-<year>.md`、`specs/tech-selection-<topic>.md`、`specs/architecture/`
  - L1 领域层（按领域）：`specs/<domain>/layout.md` 或 `specs/<domain>/layout/`、`specs/<domain>/feature-<name>.md`
  - L2 组件层（全局清单）：`specs/components/atomic.md`、`specs/components/business.md`
- 领域名使用 kebab-case（如 `user/`、`payment/`、`infrastructure/`）；跨领域特性归入 `shared/` 领域

---

## 文件索引

### references/ — 方法论与约定

| 文件 | 内容 | 何时加载 |
|------|------|---------|
| [research-protocol.md](references/research-protocol.md) | 信息调研协议：知识缺口清单、信息源矩阵、调研深度 L1-L3、spec 前复盘 | 启动调研前必读 |
| [analysis-protocol.md](references/analysis-protocol.md) | 源码分析协议：四层分析、锚点模块法、调用链追踪、复用识别 | plan 产出前必读 |
| [file-conventions.md](references/file-conventions.md) | 详细目录结构（标准/简化两棵树）、粒度规则、简化 vs 标准决策矩阵 | 首次建目录时参考 |
| [design-doc-protocol.md](references/design-doc-protocol.md) | 设计文档产出协议：场景映射、信息源要求、依赖关系 | 产出设计文档时加载 |

### examples/ — 模板与填写指南

| 文件 | 内容 | 何时加载 |
|------|------|---------|
| [research-report-template.md](examples/research-report-template.md) | 调研报告模板 + 填写指南 | Phase 2 产出调研报告时加载 |
| [spec-template.md](examples/spec-template.md) | spec.md 模板 + 填写指南 | Phase 3 产出 spec 时加载 |
| [plan-template.md](examples/plan-template.md) | plans/README.md 模板 + 填写指南 | Phase 5 产出 plan 时加载 |
| [tasks-template.md](examples/tasks-template.md) | tasks/ 模板（phase 拆分）+ 填写指南 | Phase 6 产出 tasks 时加载 |
| [changelog-template.md](examples/changelog-template.md) | CHANGELOG 模板（Keep a Changelog） | Phase 7 追加 CHANGELOG 时加载 |
| [verification-report-template.md](examples/verification-report-template.md) | 验收报告模板 + 填写指南 | Phase 8 验收时加载 |
| [retrospective-template.md](examples/retrospective-template.md) | 总结复盘模板 + 填写指南 | Phase 9 复盘时加载 |
| [roadmap.md](examples/roadmap.md) | 路线图模板 + 填写指南 | L0 战略层产出路线图时加载 |
| [tech-selection.md](examples/tech-selection.md) | 技术选型模板 + 填写指南 | L0 战略层产出技术选型时加载 |
| [architecture.md](examples/architecture.md) | 架构文档模板 + 填写指南 | L0 战略层产出架构设计时加载 |
| [layout-interaction.md](examples/layout-interaction.md) | 布局交互领域模板 + 填写指南 | L1 领域层产出布局交互时加载 |
| [feature-domain.md](examples/feature-domain.md) | 功能领域模板 + 填写指南 | L1 领域层产出功能领域时加载 |
| [atomic-component.md](examples/atomic-component.md) | 原子组件需求清单模板 + 填写指南 | L2 组件层产出原子组件清单时加载 |
| [business-component.md](examples/business-component.md) | 业务组件需求清单模板 + 填写指南 | L2 组件层产出业务组件清单时加载 |

### scripts/ — 硬约束校验

| 文件 | 内容 | 何时运行 |
|------|------|---------|
| [validate-docs.js](scripts/validate-docs.js) | 文档规范校验（5 步管线：结构→章节→格式→链接→CHANGELOG） | 文档产出后运行 |
| [lib/utils.js](scripts/lib/utils.js) | 校验工具函数 | validate-docs.js 依赖 |

---

## 子代理调度

| 子代理 | 指令文件 | 触发阶段 | 用途 |
|--------|---------|---------|------|
| **researcher** | [agents/researcher.md](agents/researcher.md) | Phase 2 | 多源信息调研——跨 Context7/GitHub/WebSearch/SO 并行搜索，综合为调研报告 |
| **reviewer** | [agents/reviewer.md](agents/reviewer.md) | Phase 8 | 文档质量审查——对抗性审查 spec/plan/tasks/report |

**调度规则：**
- **researcher**：中功能及以上必启，大功能建议拆分知识缺口分派多个并行
- **reviewer**：中功能验收阶段至少启动一次审查 verification-report
- 简化场景（Bug 修复、小功能）可跳过子代理

---

## 质量闸门

任何文档产出后必须自检：

- [ ] 文件命名和路径符合约定？
- [ ] 每个章节回答了一个明确的问题？
- [ ] 关键决策附带原因（why），而不只是结果（what）？
- [ ] 纯 Markdown，无特殊语法；代码块标注了语言？
- [ ] 流程图用 Mermaid，目录树用 plain text？
- [ ] 链接使用相对路径；关联文档之间有链接？
- [ ] 读一遍：能独立理解吗？
- [ ] 不适用章节标注 "N/A"，不编造内容？

### spec 专项
- [ ] 核心结论有信息源支撑？参考资料列出了调研来源？
- [ ] 用户故事覆盖了所有受影响角色（不只"用户"——运维/合规/客服常被遗漏）？
- [ ] 验收标准可验证（不是"用户体验好"这种）？

### plan 专项
- [ ] 每个设计决策有源码依据或业界基准？
- [ ] 涉及多 slice 时拆分了子 plan？

### tasks 专项
- [ ] 按 phase 拆分为多个文件（禁止单文件巨型清单）？
- [ ] 每个任务有明确的产出路径、参考代码、复用模块？

---

## 禁止事项

- **禁止凭想象写 spec**——任何影响核心判断的结论必须有信息源支撑
- **禁止不读源码写 plan**——不分析项目现有架构就出方案，会导致方案无法落地
- **禁止把所有 plan 塞一个文件**——多 slice 必须拆分子 plan，README.md 做索引
- **禁止把所有 tasks 放一个文件**——必须按 phase 拆分（简化方案也至少 2 phase 分节）
- **禁止事后补文档**——文档和代码同步产出，不事后回忆
- **禁止堆砌无意义内容**——不适用章节标注 "N/A"，不编造
