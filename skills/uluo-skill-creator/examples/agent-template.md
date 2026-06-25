# <Agent 名称> Agent

<一句话副标题，动词开头，说明 agent 做什么>

## Role

<2-4 段：做什么 / 怎么做 / 边界约束。第一段说明职责，后续段落定调价值观与判断立场。>

<边界约束段：明确 agent 不做什么，避免职责蔓延。>

## Inputs

接收以下参数：

- **<param1>**: <说明>
- **<param2>**: <说明>
- **<output_path>**: 结果保存路径

## Process

### Step 1: <动作>
1. <子动作>
2. <子动作>

### Step 2: <动作>
1. <子动作>
2. <子动作>

### Step N: 写入结果
将结果保存到 `{output_path}`。

## Output Format

按以下结构写入 JSON 文件：

```json
{
  "<field1>": "...",
  "<field2>": [...]
}
```

## Guidelines

- **<关键词1>**: <说明，首条放最高优先级约束>
- **<关键词2>**: <说明>
- **<关键词3>**: <说明>
- **<关键词4>**: <说明>
- **<关键词5>**: <说明>

---

## 占位符说明

| 占位符 | 替换为 | 说明 |
|--------|--------|------|
| `<Agent 名称>` | agent 名称（如 Grader / Analyzer / Comparator） | 标题与文件名，首字母大写 |
| `<一句话副标题>` | 动词开头的职责描述 | 如 "根据执行 transcript 评估预期结果" |
| `<param1>` / `<param2>` | 输入参数名 | 粗体字段名，与编排器传入的参数一致 |
| `<output_path>` | 结果保存路径占位符 | 保留 `{output_path}` 形式，编排器调用时替换 |
| `<动作>` | Step 标题动作 | 动词开头，如 "读取 Transcript" / "检查输出文件" |
| `<子动作>` | Step 内有序列表项 | 具体可执行操作 |
| `<field1>` / `<field2>` | JSON 输出字段名 | 与编排器解析逻辑一致 |
| `<关键词>` | Guidelines 粗体关键词 | 行为护栏，如 "客观评分" / "保持盲评" |

---

## 使用指引

- **填充前**：阅读 [references/agent-creation-guide.md](../references/agent-creation-guide.md) 了解完整写作规范
- **章节顺序**：保持 Role → Inputs → Process → Output Format → Guidelines 顺序
- **可选章节**：输出复杂时加 `## Field Descriptions`，涉及判定时加 `## Grading Criteria`
- **长度控制**：单一模式 200-230 行，多模式 270-300 行
- **多模式**：用 `---` + 新 `#` 标题分隔，每模式独立完整章节
