# Agent md 写作规范（Agent Creation Guide）

## 适用范围

本规范适用于**用户使用 uluo-skill-creator 创建的所有 skill 的 agent md 文件**。

无论 agent 是运行时能力提效型（skill 流程中的并行子任务/专业分析），还是 benchmark 测试型（引用 skill-creator 的 grader/analyzer/comparator），自建 agent 必须遵循本规范的章节结构与写作风格。

本规范基于 skill-creator 的 `grader.md`（223 行，评分型）、`analyzer.md`（274 行，多模式分析型）、`comparator.md`（202 行，盲评型）分析提炼。

---

## 必需章节

| 章节 | 必需性 | 说明 |
|------|--------|------|
| `# Title` + 副标题 | 必需 | 动词开头，一句话说明 agent 做什么（如 "对照执行 transcript 评估 expectation"） |
| `## Role` | 必需 | 2-4 段：做什么 / 怎么做 / 边界约束。定调 agent 的价值观与职责边界 |
| `## Inputs` | 必需 | 粗体字段名 + 说明列表。明确 agent 接收的参数（路径、数据、上下文） |
| `## Process` | 必需 | Step 编号 + 有序列表。可执行算法，每步有明确子动作 |
| `## Output Format` | 必需 | JSON 代码块。字段值用真实示例，是 agent 与编排器的契约 |
| `## Guidelines` | 必需 | 粗体关键词列表，5-8 条。行为护栏，首条放最高优先级约束 |
| `## Field Descriptions` | 推荐 | 输出复杂时必需。逐字段说明含义与取值 |
| `## Grading Criteria` | 可选 | 涉及判定时必需。显式列出 PASS/FAIL 条件 |

---

## 写作规范

### 指令式为主

动词开头，直接下达指令。避免 "你应该..." / "agent 可能..." 等弱化表达。

```
✅ 完整读取 transcript 文件
✅ 检查输出 A（文件或目录）
❌ 你应该读取 transcript 文件
❌ agent 可以检查输出
```

### 路径用占位符

所有路径用 `{placeholder}` 形式，不写死绝对路径。编排器在调用时替换。

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{outputs_dir}` | 输出文件目录 | `将结果保存到 {outputs_dir}/../grading.json` |
| `{output_path}` | 结果保存路径 | `将结构化分析保存到 {output_path}` |
| `{transcript_path}` | 执行 transcript 路径 | `读取位于 {transcript_path} 的 transcript` |
| `{comparison_result_path}` | 上游 agent 输出路径 | `读取位于 {comparison_result_path} 的比较结果` |

### 判定逻辑显式化

涉及判定时，用 PASS/FAIL 条件 + 优先级列表，不留给 agent 自由裁量。

```markdown
**PASS when**:
- transcript 或输出明确证明 expectation 为真
- 可引用具体证据

**FAIL when**:
- 未找到支持 expectation 的证据
- 证据与 expectation 相悖

**存疑时**：举证责任在 expectation 方，默认 FAIL。
```

多维度决策用优先级列表：

```markdown
按以下优先级顺序比较 A 和 B：
1. **主要**：rubric 总分
2. **次要**：assertion 通过率
3. **决胜**：确实相等时判 TIE
```

### 输出是 JSON 契约

`## Output Format` 必须是完整 JSON 代码块，字段值用真实示例（非 "..." 占位）。编排器依赖此结构解析。

```json
{
  "expectations": [
    {
      "text": "输出包含姓名 '张三'",
      "passed": true,
      "evidence": "在 transcript Step 3 找到：'提取的姓名：张三'"
    }
  ],
  "summary": {
    "passed": 1,
    "failed": 0,
    "total": 1,
    "pass_rate": 1.0
  }
}
```

### Guidelines 是行为护栏

5-8 条，粗体关键词开头。首条放最高优先级约束（如盲评型 agent 首条必须是 "保持盲评"）。

```markdown
- **客观评分**：基于证据下判定，不臆测
- **具体引用**：引用支持判定的原文片段
- **全面检查**：同时检查 transcript 和输出文件
- **无部分得分**：每个 expectation 非过即败
```

### 长度控制

| 模式 | 行数范围 | 示例 |
|------|---------|------|
| 单一模式 | 200-230 行 | grader.md（223）、comparator.md（202） |
| 多模式 | 270-300 行 | analyzer.md（274，含 post-hoc + benchmark 两模式） |

超长时拆分：细节放 `## Field Descriptions`，不放 `## Process`。

---

## 通用 vs 特定场景元素

| 场景类型 | 必需章节 | 特定元素 |
|---------|---------|---------|
| **评分型 agent** | 基础六章节 + `## Grading Criteria` | PASS/FAIL 条件、证据引用规范 |
| **分析型 agent** | 基础六章节 + `## Categories` + `## Priority Levels` | 分类表格、优先级列表 |
| **多模式 agent** | 每模式独立完整章节 | `---` 分隔 + 新 `#` 标题（如 analyzer.md） |
| **盲评型 agent** | 基础六章节 | Role 中强调偏见防护，Guidelines 首条 "保持盲评" |

### 多模式分隔规范

一个 agent md 文件包含多个模式时，用 `---` + 新 `#` 一级标题分隔，每个模式拥有独立的 Role/Inputs/Process/Output/Guidelines：

```markdown
---

# 分析 Benchmark 结果

## Role
...
```

### DO/DO NOT 对照

约束边界用 DO/DO NOT 对照列表，比正面陈述更清晰：

```markdown
**DO:**
- 报告数据中观察到的现象
- 明确指出是哪些 evals

**DO NOT:**
- 建议改进 skill
- 无证据臆测原因
```

---

## 关键经验

1. **副标题是电梯演讲**——动词开头一句话，让编排器一眼明白 agent 做什么
2. **Role 定调价值观**——不只写职责，还要写 agent 的判断立场（如 "对薄弱 assertion 给出通过判定比无用更糟"）
3. **Process 是可执行算法**——每步有明确子动作，编排器可按步跟踪进度
4. **Output Format 是契约**——字段值用真实示例，编排器依赖此结构解析，不可用 "..." 占位
5. **路径用占位符**——`{outputs_dir}`、`{output_path}`，编排器调用时替换
6. **判定逻辑显式化**——PASS/FAIL 条件、优先级列表，不留自由裁量空间
7. **Guidelines 是行为护栏**——5-8 条，首条放最高优先级约束（盲评型首条 "保持盲评"）
8. **分类用表格，决策用优先级列表**——Categories 用表格，winner 判定用优先级列表
9. **多模式可共存**——`---` + 新 `#` 标题分隔，每模式独立完整章节
10. **约束边界用 DO/DO NOT 对照**——比正面陈述更清晰，避免歧义

---

## 多 agent 协作

**分工原则**：一个 skill 可有多个运行时 agent，每个 agent 单一职责，在不同 Phase 运行。

| agent | 运行时机 | 职责 | 输入 | 输出 |
|-------|---------|------|------|------|
| researcher | Phase 1 调研 | 综合调研现有 skill、技术方案、最佳实践 | skill 需求描述 | 调研报告 JSON |
| grader | Phase 8 评分 | skill 规范质量评分 | skill 路径、评分标准 | 评分报告 JSON |

**协作规范**：
- agent 之间不直接调用，由主流程编排器调度
- 每个 agent 的输出是独立 JSON，不依赖其他 agent 的输出
- agent 之间通过文件系统传递数据（如 researcher 输出调研报告，grader 读取 skill 文件评分）

**何时拆分多 agent**：
- 调研与评分职责差异大，单 agent 难以兼顾两种 Role 价值观
- 各 agent 运行时机不同（不同 Phase），输入输出契约独立
- 单 agent md 超出长度上限（多模式 270-300 行）且模式间无共享 Process

---

## references 引用时机

| 触发条件 | 何时读取本文件 |
|---------|--------------|
| Phase 5 决定创建 agents/ 时 | 查阅必需章节与写作规范 |
| 自建 agent md 文件时 | 按模板骨架填充，遵循指令式风格 |
| 多模式 agent 设计时 | 查阅多模式分隔规范 |
