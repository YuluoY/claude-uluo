# Tasks

## 阶段一：并行自动化校验（数据收集）

- [ ] Task 1: 批量运行 validate-skill.js + grade-skill.js 于全部 9 个 skill
  - [ ] SubTask 1.1: 子代理 A 审查 diagram-compiler、frontend-visual-qa、html-blueprint（运行 validate + grade + 测试）
  - [ ] SubTask 1.2: 子代理 B 审查 spirit-forge、ui-component-creator、uluo-change-flow（运行 validate + grade + 测试）
  - [ ] SubTask 1.3: 子代理 C 审查 uluo-doc-standards、uluo-skill-creator、uluo-web-standards（运行 validate + grade + 测试）
  - [ ] SubTask 1.4: 汇总 9 个 skill 的自动化校验结果到统一报告

## 阶段二：逐个 skill 人工审查 + 循环询问

- [ ] Task 2: 审查 diagram-compiler——人工审查 SKILL.md + 汇报结果 + AskUserQuestion
- [ ] Task 3: 审查 frontend-visual-qa——人工审查 SKILL.md + 汇报结果 + AskUserQuestion
- [ ] Task 4: 审查 html-blueprint——人工审查 SKILL.md + 汇报结果 + AskUserQuestion
- [ ] Task 5: 审查 spirit-forge——人工审查 SKILL.md + 汇报结果 + AskUserQuestion
- [ ] Task 6: 审查 ui-component-creator——人工审查 SKILL.md + 汇报结果 + AskUserQuestion
- [ ] Task 7: 审查 uluo-change-flow——人工审查 SKILL.md + 汇报结果 + AskUserQuestion
- [ ] Task 8: 审查 uluo-doc-standards——人工审查 SKILL.md + 汇报结果 + AskUserQuestion
- [ ] Task 9: 审查 uluo-skill-creator——人工审查 SKILL.md + 汇报结果 + AskUserQuestion
- [ ] Task 10: 审查 uluo-web-standards——人工审查 SKILL.md + 汇报结果 + AskUserQuestion

## 阶段三：循环修复（用户驱动）

- [ ] Task 11: 根据用户在 AskUserQuestion 中的选择，执行修复任务（修复哪个 skill 的哪些问题由用户决定）
  - [ ] SubTask 11.1: 执行用户指定的修复
  - [ ] SubTask 11.2: 修复后重新运行 validate-skill.js + grade-skill.js 验证
  - [ ] SubTask 11.3: 再次 AskUserQuestion 询问下一步（直到用户输出【结束】）

# Task Dependencies

- [Task 2-10] 依赖 [Task 1]（需先有自动化数据）
- [Task 2-10] 之间串行执行，每个完成后 AskUserQuestion
- [Task 11] 依赖 [Task 2-10] 中用户指定的修复目标
- 阶段二和阶段三交替进行：用户可能在阶段二某个 skill 审查后直接要求修复

# 循环终止条件

用户在 AskUserQuestion 对话框中输出【结束】关键字时，循环终止，返回最终汇总报告。
