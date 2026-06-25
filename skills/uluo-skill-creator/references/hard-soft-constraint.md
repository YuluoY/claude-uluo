# 软硬约束设计原则（Hard & Soft Constraint）

## 目的

**分工规范**：定义软约束（md）与硬约束（scripts/）的分工原则、分类规则、生态库推荐、脚本执行要求。Phase 2 软硬约束设计时按本规范执行。

**适用范围**：本规范适用于用户使用 uluo-skill-creator 创建的所有 skill。

---

## 软约束 vs 硬约束

**分工对比**：软约束指导 AI 行为，硬约束执行结构校验。

| 维度 | 软约束（md） | 硬约束（scripts/） |
|------|-------------|-------------------|
| **载体** | `.md` 文件 | `.js` / `.py` 脚本 |
| **作用** | 指导 AI 行为、决策逻辑、流程编排 | 结构校验、格式校验、固定流程自动化 |
| **执行者** | AI（阅读后判断） | 脚本（确定性执行） |
| **可靠性** | 软约束（AI 可能遗漏或误判） | 硬约束（脚本必执行，pass/fail 明确） |
| **token 消耗** | 占用上下文 token | 不占用上下文（独立执行） |
| **适用场景** | 需要 AI 判断的部分 | 能确定性执行的部分 |

---

## 分类规则

### 硬约束（scripts/）适用场景

**必须用脚本实现**：以下校验禁止用 md 写。

| 校验类型 | 示例 | 推荐实现 |
|---------|------|---------|
| 目录结构校验 | 必需文件存在、目录命名规范 | `glob` 匹配 + 路径检查 |
| frontmatter 字段校验 | name 非空、description 含"Use when"、name 与目录名一致 | `gray-matter` 解析 + 字段断言 |
| 脚本可执行性校验 | `.js` 文件 `node --check` 通过、`.py` 文件 `py_compile` 通过 | `subprocess` 调用编译器 |
| JSON Schema 校验 | evals.json 符合 schema | `ajv`（node）/ `jsonschema`（python） |
| 行数约束 | SKILL.md body < 500 行警告、≥ 800 行 fail | 文件行数统计 |
| 固定流程自动化 | 打包、聚合 benchmark、生成报告 | 脚本编排 |

### 软约束（md）适用场景

**必须用 md 实现**：以下指导禁止用脚本替代。

| 指导类型 | 示例 | 载体 |
|---------|------|------|
| AI 行为指导 | 何时调研、如何选型、何时迭代 | SKILL.md body / references/*.md |
| 决策逻辑 | skill 复杂度判断、场景跳过规则 | SKILL.md body |
| 流程编排 | 十阶段创建流程、Phase 间回退规则 | SKILL.md body |
| 子代理调度 | 何时派生 grader/analyzer/comparator | agents/*.md |
| 写作风格指南 | description 写法、pushy 程度 | references/*.md |

---

## 设计原则

### 原则 1：能用脚本确定的就不写 md

- ✅ 正确：目录结构校验用 `glob` 脚本，不写"请检查目录结构是否包含..."
- ❌ 错误：在 md 中写"请确保 SKILL.md 的 name 字段与目录名一致"——这是确定性校验，应用脚本

### 原则 2：md 只写需要 AI 判断的部分

- ✅ 正确：在 md 中写"Phase 2 根据需求列出约束分工表，分类到硬约束/软约束"——这需要 AI 判断
- ❌ 错误：用脚本尝试判断"这个需求是否需要调研"——这是 AI 的决策逻辑

### 原则 3：硬约束稳住下限，软约束提升上限

- 硬约束保证 skill 结构合规（目录、frontmatter、脚本可执行性）
- 软约束提升 skill 质量（流程编排、决策逻辑、写作风格）

---

## 生态库推荐

### 零依赖方案（首选，本 skill 采用）

**优先使用 Node.js / Python 内置模块**：避免引入外部依赖。

| 需求 | 内置实现 | 说明 |
|------|---------|------|
| 文件匹配 | `fs.readdirSync` + `path.join` | 递归遍历目录，替代 `glob` |
| frontmatter 解析 | 正则匹配 `---` 之间的内容 | 简单 YAML 子集，替代 `gray-matter` |
| 行数统计 | `content.split('\n').length` | 替代 `markdown-it` |
| JSON 校验 | `JSON.parse` + 字段断言 | 替代 `ajv` |
| 路径操作 | `path` 模块 | 内置 |
| 外部命令调用 | `child_process.execSync` | 内置 |

**适用场景**：校验逻辑简单、无需完整 YAML/Markdown 解析、追求零安装部署。

### 外部库方案（备选，复杂场景）

**复杂场景引入外部库**（如完整 JSON Schema 校验、复杂 Markdown 解析）：

#### Node 生态

| 库 | 用途 | 安装 | 适用场景 |
|----|------|------|---------|
| `glob` | 文件模式匹配 | `npm i glob` | 复杂 glob 模式匹配（如 `**/*.md` 但排除 `node_modules`） |
| `ajv` | JSON Schema 校验 | `npm i ajv` | 完整 JSON Schema Draft 7 校验 |
| `markdown-it` | Markdown 解析 | `npm i markdown-it` | 提取标题层级、解析代码块 |
| `gray-matter` | YAML frontmatter 解析 | `npm i gray-matter` | 复杂 frontmatter（多行、嵌套、类型转换） |

#### Python 生态（与 anthropics skill-creator 对齐）

| 库 | 用途 | 安装 |
|----|------|------|
| `jsonschema` | JSON Schema 校验 | `pip install jsonschema` |
| `pathlib` | 路径操作（标准库） | 内置 |
| `subprocess` | 调用外部命令 | 内置 |
| `pyyaml` | YAML frontmatter 解析 | `pip install pyyaml` |

**选择建议**：
- 需要与 anthropics skill-creator 脚本互操作 → Python
- 纯前端工作区、需要快速执行 → Node
- 同一 skill 内脚本语言保持一致，避免混用
- 校验逻辑简单 → 零依赖方案（首选）

---

## 脚本独立执行要求

### 1. 可独立运行

**独立运行**：脚本接受路径参数，独立运行，禁止依赖 AI 上下文传递参数。

```bash
# 正确：脚本接受路径参数，独立运行
node scripts/validate.js <skill-path>
python scripts/validate_skill.py <skill-path>

# 错误：依赖 AI 上下文传递参数
# 脚本不能假设 AI 会"理解"它的输入
```

### 2. 输出结构化结果

**脚本必须输出结构化结果**：便于 AI 解析。

```json
{
  "status": "fail",
  "errors": [
    {
      "file": "SKILL.md",
      "rule": "name-required",
      "message": "frontmatter name 字段为空"
    }
  ],
  "warnings": [
    {
      "file": "SKILL.md",
      "rule": "line-count-warning",
      "message": "body 612 行，超过 500 行警告阈值，建议拆分到 references/"
    }
  ]
}
```

或简化为 pass/fail + 错误清单：

```json
{
  "status": "pass",
  "errors": [],
  "warnings": []
}
```

### 3. 不依赖 AI 上下文

**禁止依赖 AI 上下文**：

- 脚本不能读取 AI 的对话历史
- 脚本不能假设 AI 会"补全"缺失的参数
- 脚本的退出码：0 = pass，1 = fail（有 error），2 = 校验异常

---

## 软硬约束分工正反示例

### 示例 1：目录结构校验

**❌ 错误（软约束写硬约束）**：
```markdown
## 目录结构校验
请检查 skill 目录是否包含以下必需文件：
- SKILL.md
如果缺失，请提示用户创建。
```

**✅ 正确（硬约束脚本）**：
```javascript
// scripts/validate.js
const glob = require('glob');
const required = ['SKILL.md'];
const missing = required.filter(f => !fs.existsSync(path.join(skillPath, f)));
if (missing.length) {
  console.log(JSON.stringify({ status: 'fail', errors: missing.map(f => ({
    file: f, rule: 'required-file', message: `缺失必需文件: ${f}`
  })) }));
  process.exit(1);
}
```

### 示例 2：description 写法指导

**❌ 错误（硬约束写软约束）**：
```javascript
// 尝试用脚本判断 description 是否"足够 pushy"
if (!description.includes('pushy') || description.length < 50) {
  errors.push({ rule: 'not-pushy', message: 'description 不够 pushy' });
}
```

**✅ 正确（软约束 md）**：
```markdown
## description 写法指南
description 应适当"pushy"——鼓励触发，对抗 Claude 的 undertrigger 倾向。
好示例：... 坏示例：...
```

### 示例 3：frontmatter 字段校验

**✅ 正确分工**：
- 硬约束脚本：校验 name 非空、与目录名一致、description 含"Use when"
- 软约束 md：指导 description 如何写得"pushy"、如何列触发关键词

---

## 约束分工表产出格式（Phase 2 产出）

```markdown
## 软硬约束分工表

| 需求 | 约束类型 | 载体 | 实现方式 |
|------|---------|------|---------|
| 目录结构合规 | 硬约束 | scripts/validate.js | glob 匹配必需文件 |
| frontmatter 字段合规 | 硬约束 | scripts/validate.js | gray-matter 解析 + 断言 |
| description 写法 | 软约束 | references/skillmd-spec.md | 好坏示例 + 检查清单 |
| 十阶段流程编排 | 软约束 | SKILL.md body | Phase 流程图 + 回退规则 |
```
