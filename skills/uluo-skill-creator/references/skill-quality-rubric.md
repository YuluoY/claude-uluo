# Skill 质量评分卡（Skill Quality Rubric）

## 目的

**质量评估**：作为 benchmark 的扩展维度，评估 skill 本身的规范质量，与 skill-creator 的 assertions（pass_rate/time/tokens）互补。

---

## 复杂度分级

**自动检测**：基于 `scripts/` 目录是否存在区分两种评分标准。

| 复杂度 | 检测条件 | 适用场景 | 评分标准 |
|--------|---------|---------|---------|
| full | 有 `scripts/` 目录 | 完整流程 skill（如 uluo-skill-creator） | 严格标准 |
| simple | 无 `scripts/` 目录 | 简单/中等 skill（如 git-convention-checker） | 宽松标准 |

**设计依据**：uluo-skill-creator 的场景跳过规则允许简单/中等 skill 跳过 Phase 5（scripts/agents 编写），评分标准应与之对齐。

---

## 5 维度评分卡

**每维度 0-20 分，总分 100 分**。

### 维度 1：结构合规（20 分）

**不分复杂度**——所有 skill 都应有规范的目录结构。

| 子项 | 分值 | 评分标准 |
|------|------|---------|
| SKILL.md 存在 | 8 | 文件存在且非空（fail 级：缺失 → 整维度 0 分） |
| 目录命名规范 | 6 | references/scripts/agents/evals/examples/assets 命名小写+连字符 |
| 无非规范目录 | 6 | 不存在大写目录、临时目录、与规范冲突的目录 |

### 维度 2：流程编排（20 分）

**分级评分**——full 严格，simple 宽松。

#### full（完整流程 skill）

| 子项 | 分值 | 评分标准 |
|------|------|---------|
| Phase 模型 | 5 | SKILL.md 含分阶段流程（Phase 0-N 或等价编排） |
| mermaid flowchart | 5 | 使用 mermaid flowchart 或等价可视化表达流程 |
| 内部 loop 机制 | 5 | 校验不通过 → 回退到具体 Phase 的闭环 |
| 质量闸门 | 5 | 明确的校验点（本地硬约束 + 远程审计） |

#### simple（简单/中等 skill）

| 子项 | 分值 | 评分标准 |
|------|------|---------|
| 流程描述 | 10 | SKILL.md 含"怎么做"/"使用"/"流程"/"步骤"等使用说明 |
| mermaid flowchart | 5 | 可选加分项——有则加分，无不扣分 |
| 内部 loop 机制 | 5 | 可选加分项——有则加分，无不扣分 |
| 质量闸门 | 5 | 可选加分项——有则加分，无不扣分 |

### 维度 3：约束分工（20 分）

**分级评分**——full 严格，simple 宽松。

#### full（完整流程 skill）

| 子项 | 分值 | 评分标准 |
|------|------|---------|
| 软硬约束分类 | 5 | SKILL.md 明确区分软约束（md）与硬约束（scripts） |
| 脚本承载硬约束 | 5 | 能用脚本确定性的校验全部落在 scripts/ |
| md 只写 AI 判断部分 | 5 | references/*.md 不重复脚本可校验的内容 |
| 脚本可独立执行 | 5 | `node --check` / `py_compile` 通过，无运行时依赖缺失 |

#### simple（简单/中等 skill）

| 子项 | 分值 | 评分标准 |
|------|------|---------|
| 禁止事项 | 10 | SKILL.md 含"禁止"/"不要"/"不应"/"不能"等约束条件 |
| md 精简 | 10 | SKILL.md 行数 < 500（10 分）；500-799（5 分）；≥ 800（0 分） |
| 软硬约束分类 | 5 | 可选加分项——有则加分，无不扣分 |

### 维度 4：文档质量（20 分）

**不分复杂度**——所有 skill 都应有规范的文档。

| 子项 | 分值 | 评分标准 |
|------|------|---------|
| frontmatter 规范 | 5 | name 与目录名一致；description 含"Use when"触发条件；version 符合 semver 格式 |
| SKILL.md 行数 | 5 | < 300 行（5 分）；300-500 行（4 分）；500-799 行（2 分）；≥ 800 行（0 分，fail） |
| references 引用明确 | 5 | 每个 references 文件在 SKILL.md 标注"何时读取"，无孤儿文件 |
| 内容结构化 | 5 | 使用表格 + 列表 + mermaid 中至少 2 种（5 分）；使用其中 1 种（3 分）；纯文本段落为主（0 分） |

### 维度 5：测试覆盖（20 分）

**分级评分**——full 严格，simple 宽松。

#### full（完整流程 skill）

| 子项 | 分值 | 评分标准 |
|------|------|---------|
| evals.json 存在 | 5 | `evals/evals.json` 文件存在且为合法 JSON |
| 测试用例数量 | 5 | ≥ 2 个用例满分；1 个扣 3 分；0 个 0 分 |
| assertions 完整 | 5 | 每个用例含可验证的 assertions 字段 |
| 测试通过 | 5 | `__tests__/` 目录存在且有测试文件 |

#### simple（简单/中等 skill）

| 子项 | 分值 | 评分标准 |
|------|------|---------|
| evals.json 存在 | 5 | `evals/evals.json` 文件存在且为合法 JSON |
| 测试用例数量 | 5 | ≥ 2 个用例满分；1 个扣 3 分；0 个 0 分 |
| assertions 完整 | 5 | 每个用例含可验证的 assertions 字段 |
| 测试通过 | 5 | 可选加分项——`__tests__/` 有则加分，无不扣分 |

---

## 评分等级

| 等级 | 分数 | 含义 | 退出码 |
|------|------|------|--------|
| A | 90-100 | 优秀 | 0 |
| B | 70-89 | 合格 | 0 |
| C | 50-69 | 需改进 | 1 |
| D | < 50 | 不合格 | 1 |

---

## 扣分规则

**扣分原则**：按子项分值扣分，fail 级归零，warning 级部分扣分。

- **子项不满足** → 扣对应分数（按子项分值）
- **fail 级问题**（如缺 SKILL.md、SKILL.md ≥ 800 行、缺 evals.json）→ 该维度直接 0 分
- **warning 级问题**（如行数 500-799、references 未标注引用时机）→ 扣部分分数，不归零
- **可选加分项**（simple 模式下的 mermaid/loop/闸门/scripts/__tests__）→ 不满足不扣分
- 同一问题在多个维度重复出现时，分别在各维度扣分（不合并）

---

## 评分报告格式

**报告结构**：JSON 格式，含复杂度标识、总分、等级、5 维度明细、扣分项、改进建议。

```json
{
  "skill_name": "example-skill",
  "complexity": "full",
  "total_score": 85,
  "grade": "B",
  "dimensions": {
    "structure": {
      "score": 18,
      "max": 20,
      "deductions": [
        { "item": "无非规范目录", "reason": "存在 tmp/ 目录", "deduction": -2 }
      ]
    },
    "workflow": {
      "score": 15,
      "max": 20,
      "deductions": [
        { "item": "mermaid flowchart", "reason": "未使用 mermaid 表达流程", "deduction": -5 }
      ]
    },
    "constraint": { "score": 20, "max": 20, "deductions": [] },
    "documentation": {
      "score": 17,
      "max": 20,
      "deductions": [
        { "item": "SKILL.md 行数", "reason": "523 行，超出 500 行建议", "deduction": -3 }
      ]
    },
    "testing": {
      "score": 15,
      "max": 20,
      "deductions": [
        { "item": "测试通过", "reason": "__tests__/ 目录不存在", "deduction": -5 }
      ]
    }
  },
  "suggestions": [
    "拆分 SKILL.md 超长章节到 references/",
    "补充 mermaid flowchart 可视化流程",
    "在 __tests__/ 下补充测试文件"
  ]
}
```

**complexity 字段**：
- `full`：完整流程 skill（有 scripts/），适用严格标准
- `simple`：简单/中等 skill（无 scripts/），适用宽松标准

---

## 与 benchmark 的融合

**扩展字段**：rubric 评分写入 benchmark.json 的 `rubric_score` 字段，与 skill-creator 的 assertions 并列展示。

- rubric 评分是 Step 3（Grade + aggregate）的扩展，不是独立流程步骤
- viewer 忽略未知字段，rubric_score 仅在 uluo-skill-creator 上下文中解读
- 退出码：A/B → 0（继续打包）；C/D → 1（回退到 Phase 4-6 改进）

---

## 引用时机

| 触发场景 | 读取本文件 |
|---------|-----------|
| Phase 8 测试/benchmark 后补充质量评估 | ✅ |
| Phase 8 完成前最终质量复核 | ✅ |
| benchmark viewer 渲染质量维度 | ✅ |
| 日常 skill 维护巡检 | ✅ |
