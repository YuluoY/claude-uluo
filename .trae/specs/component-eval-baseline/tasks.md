# Tasks

- [x] Task 1: 创建 evals/evals.json——测试用例基线
  - [x] SubTask 1.1: 编写 6 个测试用例（Vue 创建/React 创建/WC 创建/迭代更新/四态反例/触发词识别）
  - [x] SubTask 1.2: 每个用例附 3-5 条可验证的 expectations
  - [x] SubTask 1.3: 确保 expectations 覆盖确定性项（目录结构、README 结构、API 表格）和主观项（API 设计质量、四态合理性）

- [x] Task 2: 创建 scripts/validate_output.py——确定性检查脚本
  - [x] SubTask 2.1: 实现 CLI 入口（`python -m scripts.validate_output <path>`），输出 JSON 结果
  - [x] SubTask 2.2: 实现目录结构检查（README.md/docs/index/types.ts 存在性）
  - [x] SubTask 2.3: 实现 README 结构检查（9 个 H2 节、元信息表 6 字段、API 表格表头、变更记录格式）
  - [x] SubTask 2.4: 实现四态说明检查（Loading/Error/Empty/Success 四行）
  - [x] SubTask 2.5: 实现禁令红线检查（outline:none / key=index / deprecated 标记）
  - [x] SubTask 2.6: 实现版本号 SemVer 格式检查
  - [x] SubTask 2.7: 创建 scripts/__init__.py

- [x] Task 3: 用脚本验证一个示例组件产出，确认脚本可用
  - [x] SubTask 3.1: 手动创建一个最小示例组件目录（含 README.md）
  - [x] SubTask 3.2: 运行 validate_output.py 验证脚本输出正确

- [x] Task 4: 记录基线 benchmark 数据到 evals/baseline.md
  - [x] SubTask 4.1: 记录 evals 用例数和 expectations 总数
  - [x] SubTask 4.2: 记录确定性脚本的检查项数
  - [x] SubTask 4.3: 标注已知限制（如 LLM 评判部分需人工或 skill-creator grader 完成）

# Task Dependencies

- Task 2 可与 Task 1 并行
- Task 3 依赖 Task 2
- Task 4 依赖 Task 1 和 Task 2
