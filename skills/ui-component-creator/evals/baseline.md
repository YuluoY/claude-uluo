# ui-component-creator skill 基线 Benchmark 数据

> 记录日期：2026-06-25
> 此文件记录 skill 的 eval 基线数据，作为后续优化的对比基准。

---

## 一、evals 用例概览

| 指标 | 值 |
|------|-----|
| evals 总数 | 6 |
| expectations 总数 | 43 |
| 确定性 expectations（可脚本验证） | 28 |
| 主观 expectations（需 LLM grader） | 15 |

### 用例分布

| ID | 场景 | expectations 数 |
|----|------|----------------|
| 1 | Vue 3 Pagination 组件创建 | 9 |
| 2 | React DatePicker 组件创建 | 8 |
| 3 | Web Component Modal 创建 | 7 |
| 4 | 迭代更新（新增 prop + 废弃旧 prop） | 6 |
| 5 | 四态完整性反例检查 | 5 |
| 6 | 触发词识别（「封装一个组件」） | 4 |

---

## 二、确定性脚本检查项

`scripts/validate_output.py` 共 16 项检查，覆盖 5 大类：

| 类别 | 检查项数 | 检查内容 |
|------|---------|---------|
| 目录结构 | 4 | README.md、docs/、入口文件、types.ts |
| README 结构 | 7 | 9 个 H2 节、元信息 6 字段、4 张 API 表格、变更记录格式 |
| 四态说明 | 1 | Loading/Error/Empty/Success 齐全 |
| 版本号格式 | 1 | SemVer `vX.Y.Z` |
| 禁令红线 | 3 | 禁令 7(outline:none)、禁令 9(index key)、禁令 13(deprecated 标记) |

### 脚本验证结果

- **合法组件**：16/16 通过，退出码 0 ✅
- **违规组件**：4/16 通过，正确检出 12 项违规，退出码 1 ✅
- **无 README.md**：15/16 通过（仅 README 存在性失败），退出码 1 ✅
- **目录不存在**：输出错误信息，退出码 1 ✅

---

## 三、已知限制

1. **LLM 评判部分未自动化**：evals.json 中有 15 条主观 expectations（如「API 设计质量」「四态合理性」）需要 skill-creator 的 grader agent 或人工评判，本基线未跑完。
2. **触发率测试未跑**：用例 6（触发词识别）需要 skill-creator 的 `run_eval.py` 跑触发率测试，依赖 `claude -p` 命令，本基线未执行。
3. **完整 benchmark 未跑**：skill-creator 的 `aggregate_benchmark.py` 需要多轮运行取均值±标准差，本基线仅记录了确定性脚本的单次验证结果。
4. **脚本仅检查 README**：当前 `validate_output.py` 只检查 README.md 和目录结构，不检查源码内容（如 types.ts 的类型完整性、index.vue 的实现质量）。

---

## 四、后续优化建议

1. **跑完整 benchmark**：用 skill-creator 的 `run_eval.py` + `aggregate_benchmark.py` 跑 6 个用例的多轮 benchmark，记录通过率均值±标准差。
2. **扩展确定性脚本**：增加源码检查项（如 types.ts 是否有 `export`、index.vue 是否有 `defineProps`）。
3. **优化 skill 后对比**：每次修改 SKILL.md 或 references 后，重跑 evals 对比通过率变化。
4. **补充触发率测试**：用 `run_eval.py` 测试不同触发词的触发率，优化 description 字段。
