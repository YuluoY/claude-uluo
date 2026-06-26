# 贡献指南

claude-uluo 是 Claude Code 的 Skills + Plugins 集合，欢迎贡献新的 skill 或改进已有的。

## 快速开始

```bash
git clone <repo-url> && cd claude-uluo
```

## 目录约定

```
skills/<name>/        ← Skill（同时也是最小 plugin）
  ├── .claude-plugin/plugin.json
  ├── SKILL.md
  ├── references/
  ├── examples/
  ├── agents/
  ├── scripts/
  │   ├── _shared/       ← 辅助模块（工具函数、引擎等），统一目录名
  │   ├── checks/        ← 校验子模块（按检查项拆分）
  │   ├── validate.js    ← 校验入口
  │   ├── query.js       ← 查询入口（可选）
  │   ├── flow.js        ← 流程入口（可选）
  │   └── __tests__/
  └── evals/evals.json

plugins/<name>/       ← 完整 Plugin（含 hooks、agents 等）
  ├── .claude-plugin/plugin.json
  ├── skills/
  ├── hooks/
  └── ...
```

### scripts/ 目录规范

- 辅助模块目录统一命名为 `_shared/`（不再使用 `lib/`）
- 校验子模块放在 `checks/` 目录下，文件名用单词命名（不加 `check-`/`lint-` 前缀）
- 入口脚本用单词命名（`validate.js`、`query.js`、`flow.js`），不用短横线连接多词

## 贡献流程

### 新增 Skill

1. 在 `skills/` 下建目录，参考[Skill 设计模式](CLAUDE.md#skill-设计模式)
2. 写 `SKILL.md`（含 frontmatter: name, description, user-invocable）
3. 添加 `.claude-plugin/plugin.json`，设置 `"skills": "./"`
4. 在 `marketplace.json` 中新增条目
5. 提交 PR

### 新增 Plugin

1. 在 `plugins/` 下建目录，参考[Plugin 设计模式](CLAUDE.md#plugin-设计模式)
2. 确保 `hooks/hooks.json` 使用 `${CLAUDE_PLUGIN_ROOT}` 引用路径
3. 在 `marketplace.json` 中新增条目
4. 提交 PR

### 提交规范

- PR 标题用中文描述变更内容
- 涉及 skill 的变更，在 PR 中说明使用场景和触发条件
- 新增的 skill/plugin 需在本地验证过 `claude plugin install` 可用

## 验证

```bash
# 在 evals/workspaces/ 下创建测试项目
mkdir -p evals/workspaces/test-project/.claude

# 注册 marketplace 并安装
claude plugin install <name>@claude-uluo --scope project

# 确认 slash command 可用
claude plugin list
```
