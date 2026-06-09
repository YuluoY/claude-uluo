## 场景说明

### 为什么这是"小模块"而非"完整模块"

根据 uluo-web-standards SKILL.md 的场景映射表，模块分类的核心判断标准是 **文件数量 + 目录结构深度 + 涉及的规则范围**：

| 维度 | 小模块（本次任务） | 完整模块 |
|------|-------------------|----------|
| **文件数** | 1 个文件 | 多个文件，多类身份 |
| **目录结构** | 放入现有 `utils/`，无新增目录 | 自建 `features/<domain>/` 目录树，含 `components/`、`hooks/`、`stores/`、`types/`、`constants/`、`api/`、`__tests__/` 等子目录 |
| **架构规则** | **不加载** §架构规则、不涉及 DDD 分层 | **必须加载** §架构规则（A1-A7）+ references/architecture.md |
| **规则范围** | 仅 §通用规则 | §通用规则 + §架构规则 |
| **深度参考** | naming.md + coding-paradigms.md + git-conventions.md | + architecture.md + ui-states.md |
| **基础设施** | 不要求 stylelint/eslint/tsc 全量验证 | 要求 eslint + stylelint + tsc + 自定义 DDD 层边界检查全通 |
| **身份** | 纯函数工具，单一身份 | 业务模块，多身份协作 |

本任务的条件完全符合"新增小模块"定义：
1. **单文件**：仅一个 `utils/formatPrice.ts`
2. **单函数**：一个文件只导出一个函数 `formatPrice`
3. **纯函数**：无副作用，无外部依赖，不参与 DDD 分层
4. **无新目录**：直接放入已有的 `utils/` 目录，无需创建 `features/price-formatting/` 等 DDD 领域目录
5. **无需架构规则**：不需要 A1-A7 分层检查、不需要组件四态、不需要基础设施清单

若这是"完整模块"，则需要：自建 DDD 目录树、配置 API 层、定义领域类型文件、编写测试、组装依赖注入——本次任务明确要求"不引入 DDD 目录结构"，因此上述全部豁免。

---

### 加载的规则文件清单

按 SKILL.md Phase 2 的场景映射表（新增小模块 + TypeScript），显式加载了以下 5 个文件：

| # | 文件 | 路径 | 加载原因 |
|---|------|------|----------|
| 1 | **软规则自检清单** | `rules/soft-rules.md` (§通用规则) | 场景=新增小模块 → 加载 §通用规则区块。涵盖 G1-G8（函数设计、错误处理、依赖管理、值归属、命名、文件纯度、设计质量、代码注释）|
| 2 | **TypeScript 编码规范** | `languages/typescript.md` | 语言=TypeScript → 加载 TS 独有规则：禁令清单（any/enum/包装类型）、null vs undefined、类型注解要求、interface vs type、Discriminated Union、Exhaustiveness Check、类型工具速查表 |
| 3 | **命名规范** | `references/naming.md` | 所有场景加载。S-I-D 原则、A/HC/LC 函数命名模式、动作动词表、布尔值前缀、单复数外显、文件命名（组件 PascalCase / 工具 camelCase / 文件夹 kebab-case）|
| 4 | **编码范式集** | `references/coding-paradigms.md` | 写函数体时应用：Guard Clause（守卫非法值）、CQS（命令查询分离——本函数是纯查询）、Avoid Flag Arguments（用 options 对象替代布尔参数）、Single Level of Abstraction（单一抽象层级）、Immutable Update（不可变返回）|
| 5 | **Git 提交规范** | `references/git-conventions.md` | 所有场景加载。Conventional Commits 格式、分支命名、PR/Commit 粒度要求 |

**未加载**的文件（因场景不匹配）：
- `references/architecture.md` — 仅完整模块/项目启动场景加载
- `references/ui-states.md` — 仅 Vue/React 组件或完整模块场景加载
- `references/accessibility.md` — 仅 HTML/CSS 或组件场景加载
- `references/infrastructure-setup.md` — 仅项目启动场景加载
- `references/api-design.md` — 仅项目启动/API 设计场景加载
- `references/observability-design.md` — 仅项目启动场景加载
- `references/performance.md` — 仅项目启动场景加载
- `references/security.md` — 仅项目启动场景加载
- `languages/vue.md` / `languages/react.md` — 非组件场景
- `languages/html.md` / `languages/css.md` — 非模板/样式场景
- `rules/soft-rules.md` 的 §组件规则、§架构规则、§Review 规则区块 — 场景不匹配
