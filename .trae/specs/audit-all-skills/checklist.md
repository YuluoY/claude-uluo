# 审查验收清单

## 阶段一：自动化校验

- [ ] 9 个 skill 全部运行 validate-skill.js，记录 pass/fail 状态
- [ ] 9 个 skill 全部运行 grade-skill.js，记录评分和等级
- [ ] 有 __tests__/ 的 skill 运行测试套件，记录通过/失败数
- [ ] 汇总报告包含每个 skill 的：校验状态、评分、扣分项、测试结果

## 阶段二：人工审查（每个 skill）

### diagram-compiler
- [ ] SKILL.md frontmatter 规范（name + version + description 含 Use when）
- [ ] SKILL.md 行数 < 500
- [ ] references/ 引用明确（无孤儿文件）
- [ ] scripts/ 脚本可执行（Python py_compile）
- [ ] evals.json 存在且合法

### frontend-visual-qa
- [ ] SKILL.md frontmatter 规范
- [ ] SKILL.md 行数 < 500
- [ ] references/ 引用明确
- [ ] scripts/ 脚本可执行（node --check）
- [ ] __tests__/ 测试通过
- [ ] evals.json 存在且合法

### html-blueprint
- [ ] SKILL.md frontmatter 规范
- [ ] SKILL.md 行数 < 500
- [ ] references/ 引用明确
- [ ] scripts/ 脚本可执行
- [ ] __tests__/ 测试通过
- [ ] evals.json 存在且合法

### spirit-forge
- [ ] SKILL.md frontmatter 规范
- [ ] SKILL.md 行数 < 500
- [ ] references/ 引用明确
- [ ] scripts/ 脚本可执行（Python py_compile）
- [ ] __tests__/ 测试通过
- [ ] evals.json 存在且合法

### ui-component-creator
- [ ] SKILL.md frontmatter 规范
- [ ] SKILL.md 行数 < 500
- [ ] references/ 引用明确
- [ ] scripts/ 脚本可执行
- [ ] evals.json 存在且合法

### uluo-change-flow
- [ ] SKILL.md frontmatter 规范
- [ ] SKILL.md 行数 < 500
- [ ] references/ 引用明确
- [ ] scripts/ 脚本可执行
- [ ] __tests__/ 测试通过
- [ ] evals.json 存在且合法

### uluo-doc-standards
- [ ] SKILL.md frontmatter 规范
- [ ] SKILL.md 行数 < 500
- [ ] references/ 引用明确
- [ ] scripts/ 脚本可执行
- [ ] __tests__/ 测试通过
- [ ] evals.json 存在且合法

### uluo-skill-creator
- [ ] SKILL.md frontmatter 规范
- [ ] SKILL.md 行数 < 500
- [ ] references/ 引用明确
- [ ] scripts/ 脚本可执行
- [ ] __tests__/ 测试通过
- [ ] evals.json 存在且合法

### uluo-web-standards
- [ ] SKILL.md frontmatter 规范
- [ ] SKILL.md 行数 < 500
- [ ] references/ 引用明确
- [ ] scripts/ 脚本可执行
- [ ] evals.json 存在且合法

## 阶段三：循环模式

- [ ] 每个 skill 审查完成后调用 AskUserQuestion 询问下一步
- [ ] 用户输出【结束】时终止循环
- [ ] 循环终止后返回最终汇总报告（9 个 skill 的审查结论 + 修复记录）

## 通用质量检查（每个 skill）

- [ ] SKILL.md 使用指令式语气（非解释性）
- [ ] SKILL.md 边界约束保留（条件依据可保留，纯设计理由删除）
- [ ] SKILL.md 加粗规则（关键约束加粗）
- [ ] frontmatter description 含 "Use when" 或 "Use this skill" 触发条件
- [ ] frontmatter version 符合 semver 格式
- [ ] 无 plain text art（流程图用 mermaid）
- [ ] 软硬约束分工明确（md 写 AI 判断，scripts 写确定性校验）
