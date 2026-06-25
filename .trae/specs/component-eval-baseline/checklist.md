# Checklist

## evals.json 测试用例

- [x] 文件已创建于 `skills/component-creator/evals/evals.json`
- [x] 包含 6 个测试用例（Vue/React/WC 创建 + 迭代更新 + 四态反例 + 触发词）
- [x] 每个用例有 id、prompt、expected_output、expectations
- [x] expectations 覆盖确定性项（目录结构、README 结构、API 表格）
- [x] expectations 覆盖主观项（API 设计质量、四态合理性）
- [x] skill_name 字段为 "component-creator"

## validate_output.py 确定性检查脚本

- [x] 文件已创建于 `skills/component-creator/scripts/validate_output.py`
- [x] CLI 入口：`python -m scripts.validate_output <path>`
- [x] 输出 JSON 格式：`{"passed": bool, "checks": [...], "summary": str}`
- [x] 目录结构检查（README.md/docs/index/types.ts）
- [x] README 9 个 H2 节检查
- [x] README 元信息表 6 字段检查
- [x] README API 表格表头检查（Props/Emits/Slots/Methods）
- [x] README 变更记录格式检查（`### vX.Y.Z (YYYY-MM-DD)`）
- [x] 四态说明检查（Loading/Error/Empty/Success）
- [x] 禁令红线检查（outline:none / key=index / deprecated 标记）
- [x] 版本号 SemVer 格式检查
- [x] 纯 Python 标准库实现（无外部依赖）
- [x] scripts/__init__.py 已创建

## 脚本可用性验证

- [x] 用最小示例组件目录运行脚本，输出正确（16/16 通过）
- [x] 故意制造违规（如缺 README），脚本能检测出并报告（12 项失败正确检出）

## baseline.md 基线数据

- [x] 文件已创建于 `skills/component-creator/evals/baseline.md`
- [x] 记录运行日期、evals 总数、expectations 总数
- [x] 记录确定性脚本检查项数
- [x] 标注已知限制（LLM 评判部分需人工或 grader 完成）

## 引用完整性

- [x] 脚本路径引用正确
- [x] 未破坏现有文件结构
