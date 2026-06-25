# Skill 目录结构规范（Skill Anatomy）

## 目的

**目录规范**：定义 skill 的标准目录结构、必需文件、可选目录命名规范。Phase 3 产出目录结构时按本规范执行。

---

## 标准目录结构

**目录布局**：skill 标准目录结构如下，必需文件为 SKILL.md，其余按需创建。

```
<skill-name>/
├── SKILL.md                      ← 必需：skill 主指令文件
├── references/                   ← 可选：文档参考（按需加载）
│   └── *.md
├── scripts/                      ← 可选：可执行脚本（硬约束校验、自动化流程）
│   ├── *.js / *.py
│   └── __tests__/                ← 可选：脚本测试
├── agents/                       ← 可选：子代理指令
│   └── *.md
├── evals/                        ← 可选：测试用例
│   ├── evals.json
│   └── files/                    ← 可选：测试输入文件
├── examples/                     ← 可选：模板和示例
│   └── *.md / *.json
├── assets/                       ← 可选：静态资源（模板、图标、字体）
│   └── *
└── README.md                     ← 可选：人类阅读的说明文档
```

---

## 必需文件清单

**必需文件**：仅 SKILL.md，其余目录按 skill 复杂度按需创建。

| 文件 | 必需性 | 作用 |
|------|--------|------|
| `SKILL.md` | 必需 | skill 主指令，含 YAML frontmatter + Markdown body |

其余目录（references/scripts/agents/evals/examples/assets）均为可选，按 skill 复杂度按需创建。

---

## 可选目录命名规范

**可选目录**：references/scripts/agents/evals/examples/assets，按 skill 复杂度按需创建。

| 目录 | 用途 | 内容类型 | 加载时机 |
|------|------|---------|---------|
| `references/` | 文档参考 | `.md` 文件 | SKILL.md 明确标注时按需读取 |
| `scripts/` | 可执行脚本 | `.js` / `.py` 文件 | 硬约束校验、流程查询（query.js）、流程状态控制（flow.js）或自动化流程触发时执行 |
| `agents/` | 子代理指令 | `.md` 文件 | 需要派生子代理时读取 |
| `evals/` | 测试用例 | `evals.json` + 输入文件 | Phase 6 编写 evals / Phase 8 远程审计时 |
| `examples/` | 模板和示例 | `.md` / `.json` 模板 | 需要参考模板时读取 |
| `assets/` | 静态资源 | 模板、图标、字体等 | 输出需要嵌入资源时读取 |

**命名约束**：
- 目录名一律小写，连字符分隔（如 `references/`、`__tests__/`）
- 文件名一律小写，连字符分隔（如 `validate.js`、`impact-analysis-protocol.md`）
- 禁止使用大写字母、下划线（`__tests__/` 除外，遵循 jest 约定）

---

## 现有 skill 目录结构示例

**复杂度分级**：按 skill 复杂度分为简单/中等/复杂三级，目录结构逐级扩展。

### 简单 skill（uluo-skill-creator）

```
uluo-skill-creator/
├── SKILL.md
└── references/              ← 规范文档
    ├── skill-anatomy.md
    ├── skillmd-spec.md
    ├── hard-soft-constraint.md
    └── remote-skill-creator.md
```

### 中等 skill（uluo-change-flow）

```
uluo-change-flow/
├── SKILL.md
├── references/              ← 协议文档
│   ├── impact-analysis-protocol.md
│   └── sync-protocol.md
├── scripts/                 ← 硬约束校验 + 流程查询/控制脚本
│   ├── checks/
│   ├── _shared/             ← 共享 engine（query-engine/flow-engine）
│   ├── __tests__/
│   ├── validate.js          ← 硬约束校验
│   ├── query.js             ← 无状态流程查询（精简入口）
│   └── flow.js              ← 有状态流程控制（精简入口）
├── agents/
│   └── impact-analyzer.md
├── evals/
│   └── evals.json
└── examples/                ← 模板
    ├── spec-template.md
    ├── plan-template.md
    └── ...
```

### 复杂 skill（anthropics skill-creator）

```
skill-creator/
├── SKILL.md
├── references/schemas.md
├── scripts/                 ← 完整测试/benchmark 管线
│   ├── aggregate_benchmark.py
│   ├── run_eval.py
│   ├── run_loop.py
│   └── ...
├── agents/                  ← 子代理指令
│   ├── grader.md
│   ├── analyzer.md
│   └── comparator.md
├── eval-viewer/
│   └── generate_review.py
└── LICENSE.txt
```

---

## 目录创建顺序（Phase 3）

**创建顺序**：按以下顺序创建目录和文件，确保必需文件优先。

1. 创建 skill 根目录（命名遵循小写+连字符）
2. 创建 `SKILL.md`（必需，Phase 4 编写内容）
3. 按 Phase 2 约束分工表创建可选目录：
   - 有软约束文档 → `references/`
   - 有硬约束脚本或流程查询需求 → `scripts/`
   - 有子代理 → `agents/`
   - 有测试用例 → `evals/`（Phase 6）
   - 有模板 → `examples/`
4. 若创建了 `scripts/` 目录：
   - **必须**从 `examples/skill-template/scripts/` 复制 `query.js` 模板，填充本 skill 的流程数据（Phase、场景、子代理等），使 AI/agent 可通过命令行查询结构化流程编排（无状态一次性查询）。
   - **推荐**从 `examples/skill-template/scripts/` 复制 `flow.js` 模板，填充本 skill 的工作流阶段和门控配置，使 AI/agent 可通过状态机逐步控制流程执行（有状态渐进式控制，支持 init/next/complete/rollback/gates/skip 命令）。
   - 若使用了 `flow.js`，注意 `.skill-state.json` 是运行时状态文件，应加入 `.gitignore`。
5. 运行 `node scripts/validate.js <skill-path>` 校验目录结构（Phase 7）
