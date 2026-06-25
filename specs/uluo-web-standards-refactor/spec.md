# uluo-web-standards 架构重构 需求规格说明

> 日期: 2026-06-25 | 作者: huyongle | 状态: 草稿

## 背景与动机

当前 `uluo-web-standards` skill 总计 7413 行（31 个文件），其中 references/ 占 4956 行（18 个文件），在 marketplace 9 个 skill 中 references 体量排名第二（仅次于 impeccable）。虽然 SKILL.md 入口很轻（151 行，倒数第二），分级加载机制有效控制了单次加载量（平均 949-1521 行），但存在三个数据驱动的结构性问题：

1. **工具链与文档耦合**：scripts/（504 行）+ config/（312 行）与 references/ 在同一个 skill 内，但数据证明 scripts 与 references 完全解耦（零硬编码引用），工具链可独立运行
2. **弱耦合内容占位**：6 个 references 文件（api-design/security/observability/performance/git-conventions/naming，共 1388 行）被引用 0-1 次，与核心 web 工程规范关系弱
3. **边界预防性澄清**：`component-creator` 后续将收窄为"UI 组件库创建专用"，与 uluo-web-standards 的"常规业务组件开发"自然分离，但需在 SKILL.md 中显式声明边界，避免未来回退

不改会导致：工具链无法独立复用、references 体量继续膨胀、边界依赖口头约定易遗忘。

## 用户故事

| 编号 | 角色 | 故事 | 验收线索 |
|------|------|------|---------|
| US-1 | 前端开发者 | 作为前端开发者，我希望工程规范检查能独立运行，以便在非 Web 项目中也能复用工具链 | FR-1 |
| US-2 | skill 维护者 | 作为 skill 维护者，我希望每个 skill 职责单一，以便降低维护成本和版本同步难度 | FR-2 |
| US-3 | skill 维护者 | 作为 skill 维护者，我希望 references 文件之间耦合清晰，以便修改一处不会引发连锁更新 | FR-3 |
| US-4 | skill 维护者 | 作为 skill 维护者，我希望 uluo-web-standards 与 component-creator 的边界在文档中显式声明，以便未来不会回退到触发重叠 | FR-4 |

### 目标
- 将工具链（scripts + config）独立为可复用的 skill
- 移除或合并弱耦合的 references 文件，将 references 行数降低 ≥30%
- 保持分级加载机制有效，单次加载量不增加
- 在 SKILL.md 中显式声明与 component-creator 的边界（UI 组件库 vs 常规业务组件）

### 非目标（明确不做的事）
- 不重写 references 内容——只调整归属和边界
- 不改变 eslint/stylelint/tsc 的规则内容——只调整承载位置
- 不删除任何检查能力——所有现有检查必须保留
- 不引入新的检查能力——本次只做架构重构，不加功能

## 功能需求

### FR-1: 工具链独立成 skill
- **描述**: 将 scripts/ + config/ 独立为 `uluo-web-toolchain` skill
- **优先级**: P0
- **触发条件**: 需要运行 eslint/stylelint/tsc/层边界检查时
- **预期行为**:
  - 新 skill `uluo-web-toolchain` 包含 validate-rules.js + 4 个 lint/check 脚本 + eslint/stylelint 配置
  - `uluo-web-standards` 的 SKILL.md 引用 `uluo-web-toolchain` 执行检查
  - 工具链可在非 Web 项目中独立安装使用
- **边界条件**: 工具链不依赖 references 内容（已验证零硬编码引用），独立后功能完整

### FR-2: 弱耦合 references 移出
- **描述**: 将被引用 0-1 次且概念独立性强的 references 文件移出 `uluo-web-standards`
- **优先级**: P0
- **触发条件**: references 文件与核心 web 工程规范弱耦合
- **预期行为**:
  - `api-design.md`（404 行，被引 0 次）→ **合并到 `uluo-doc-standards`**（API 设计文档属"设计文档"范畴，避免新增 skill）
  - `observability-design.md`（274 行，被引 3 次）→ **独立成 `uluo-observability` skill**（概念独立性强，可复用于后端/移动端）
  - `git-conventions.md`（96 行，被引 0 次）→ **合并到 `uluo-doc-standards`**（96 行体量小，与文档流程同属"流程规范"）
  - `performance.md`（330 行，被引 6 次）→ **保留**（高耦合核心）
  - `security.md`（284 行，被引 0 次）→ **保留**（XSS/CSRF/CSP 与 Web 工程强相关，独立会导致 web 项目需双装）
  - `naming.md`（189 行，被引 3 次）→ **保留**（中耦合+高频触发）
- **边界条件**: 移出后需更新 SKILL.md 的场景映射表和按需加载触发表，移除对应条目；合并到 uluo-doc-standards 的文件需调整其 SKILL.md 的文件索引

### FR-3: 保留高耦合核心
- **描述**: 保持高耦合核心 references 在 `uluo-web-standards` 内
- **优先级**: P0
- **触发条件**: references 文件被引用 ≥3 次，或概念上与 Web 工程强相关
- **预期行为**: 以下文件保留不动：
  - `accessibility.md`（被引 6 次）
  - `architecture.md`（被引 6 次）
  - `performance.md`（被引 6 次）
  - `languages/vue.md`（被引 5 次）
  - `infrastructure-setup.md`（被引 4 次）
  - `ui-states.md`（被引 4 次）
  - `languages/react.md`（被引 4 次）
  - `naming.md`（被引 3 次）
  - `coding-paradigms.md`（被引 3 次）
  - `security.md`（被引 0 次但概念强相关）
  - `languages/javascript.md`（被引 2 次）
  - `languages/typescript.md`（被引 2 次）
  - `languages/html.md`（被引 1 次）
  - `languages/css.md`（被引 0 次）
  - `soft-rules.md`（被引 0 次但是自检入口）
- **边界条件**: 保留后 references/ 文件数从 18 降至 14（移出 api-design、observability-design、git-conventions 三个文件）

### FR-4: 显式声明与 component-creator 的边界
- **描述**: 在 SKILL.md 中声明 uluo-web-standards 与 component-creator 的职责边界
- **优先级**: P1
- **触发条件**: component-creator 收窄为"UI 组件库创建专用"后
- **预期行为**:
  - `uluo-web-standards` 的 SKILL.md 明确声明："本 skill 针对常规业务组件开发，不覆盖 UI 组件库创建场景"
  - `component-creator` 的 SKILL.md 明确声明："本 skill 针对 UI 组件库创建，不覆盖常规业务组件开发"
  - 两者触发条件无交集
- **边界条件**: 若用户在组件库项目中写业务组件，由 uluo-web-standards 覆盖；若在业务项目中抽取组件库，由 component-creator 覆盖

## 非功能性需求

### 性能
- 重构后 `uluo-web-standards` 的 SKILL.md 行数不增加（当前 151 行）
- 单次场景加载量不增加（当前平均 949-1521 行）
- references/ 总行数降低 ≥30%（目标从 4956 行降至 ≤3469 行）

### 安全
- N/A（不涉及安全相关变更）

### 可维护性
- 每个 skill 的 references/ 文件数 ≤10（当前 18 个，目标降至 ≤10 个）
- 新 skill 需在 marketplace.json 中注册
- 所有原有测试必须通过

## 影响范围

| 模块 | 影响类型 | 说明 |
|------|---------|------|
| `skills/uluo-web-standards/` | 修改 | 移除 scripts/config/和 3 个 references，更新 SKILL.md |
| `skills/uluo-web-toolchain/` | 新增 | 承载 scripts + config |
| `skills/uluo-observability/` | 新增 | 承载 observability-design.md |
| `skills/uluo-doc-standards/` | 修改 | 合并 api-design.md + git-conventions.md |
| `marketplace.json` | 修改 | 注册 uluo-web-toolchain 和 uluo-observability |
| `CLAUDE.md` | 修改 | 更新已注册 skill 表格 |

## 依赖与前置条件

- 依赖 marketplace.json 的注册机制
- 前置数据：已完成 references 交叉引用分析、scripts 依赖分析、skill 规模对比
- 前置约定：component-creator 后续将收窄为"UI 组件库创建专用"，本次不修改 component-creator，只在 uluo-web-standards 侧声明边界

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 移出 references 后破坏交叉引用 | 中 | 高 | 移出前更新所有引用该文件的 references，改为跨 skill 引用或保留摘要 |
| api-design/git-conventions 合并到 uluo-doc-standards 后职责膨胀 | 低 | 中 | uluo-doc-standards 当前 references 仅 3 个文件 296 行，合并后增至 5 个文件 796 行，仍在合理范围 |
| 工具链独立后用户不知道如何安装 | 中 | 低 | 在 uluo-web-standards 的 SKILL.md 中明确说明依赖 uluo-web-toolchain |
| component-creator 收窄计划未落地导致边界声明悬空 | 低 | 低 | 边界声明是预防性措施，即使 component-creator 未立即收窄也不影响 uluo-web-standards 的独立性 |

## 验收标准

- [ ] `uluo-web-toolchain` 可独立安装并运行 `validate-rules.js`
- [ ] `uluo-observability` skill 创建完成并注册
- [ ] `api-design.md` 和 `git-conventions.md` 合并到 `uluo-doc-standards/references/`
- [ ] `uluo-web-standards` 的 references/ 文件数从 18 降至 14
- [ ] `uluo-web-standards` 的 references/ 行数从 4956 降至 ≤4200 行（移出约 774 行）
- [ ] 所有原有测试通过（`node scripts/validate-rules.js` 在示例项目上运行无报错）
- [ ] marketplace.json 注册 uluo-web-toolchain 和 uluo-observability
- [ ] CLAUDE.md 的已注册表格更新
- [ ] SKILL.md 的场景映射表和按需加载触发表移除 api-design/observability/git-conventions 条目
- [ ] SKILL.md 显式声明与 component-creator 的边界（UI 组件库 vs 常规业务组件）

## 调研依据

### 技术可行性

| 调研项 | 结论 | 来源 | 可信度 |
|--------|------|------|--------|
| scripts/ 是否依赖 references/ | 零依赖，grep "references/" 在 scripts/ 下 0 处匹配 | 本地代码扫描 | 高 |
| 工具链是否可独立运行 | 是，scripts 仅依赖 config/ 和外部 bin（eslint/stylelint/tsc） | 本地代码扫描 | 高 |
| references 交叉引用关系 | 7 个高耦合核心（被引 ≥4），6 个独立文件（被引 0-1） | 本地代码扫描 | 高 |

### 业界方案参考

| 调研项 | 参考项目/文章 | 关键发现 |
|--------|-------------|---------|
| Skill 粒度参考 | marketplace 中 9 个 skill 的平均规模 | 平均 26.1 文件 / 4940 行，uluo-web-standards 偏大 16%/42% |
| 单一职责原则 | uluo-web-standards 自身的 architecture.md | "一个文件一个函数"——规范制定者应遵守自己的规范 |

### 性能/安全基准

| 调研项 | 业界基准 | 本项目目标 |
|--------|---------|-----------|
| references/ 行数 | 9 个 skill 平均 1453 行 | ≤4200 行（移出 774 行） |
| SKILL.md 行数 | skill-creator 建议 ≤500 行 | 保持 ≤200 行 |
| 单次加载量 | 当前平均 949-1521 行 | 不增加 |

### 已知风险/坑点

| 风险 | 来源 | 缓解措施 |
|------|------|---------|
| observability-design.md 被引 3 次，移出需更新引用方 | 交叉引用分析 | infrastructure-setup.md（引用 2 次）和 performance.md（引用 1 次）需更新引用路径 |
| api-design.md 被引 0 次，但 coding-paradigms.md 引用了它 | 交叉引用分析 | coding-paradigms.md 的引用需更新为指向 uluo-doc-standards |
| git-conventions.md 被引 0 次，移出无引用更新需求 | 交叉引用分析 | 无需更新其他文件 |
| component-creator 的 Vue/React 参考与 uluo-web-standards 重复 | 文件对比 | component-creator 收窄为 UI 组件库专用后重叠自然消失，本次不处理 |

## 参考资料

- 本地代码扫描：`/Users/huyongle/Desktop/workspace/claude-uluo/skills/uluo-web-standards/`
- 交叉引用分析：references/ 下 18 个 .md 文件的引用矩阵
- 规模对比：marketplace 中 10 个 skill 的文件数和行数统计
- 用户补充约定：component-creator 后续将收窄为"UI 组件库创建专用"
