# claude-uluo

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Claude Code 前端研发扩展集——覆盖 UI 审查、组件蓝图、可视化 QA、图表编译、文档规范等环节，通过 marketplace 分发，一条命令安装。

## 快速开始

```bash
# 在项目根目录执行（会自动 clone、注册 marketplace、安装扩展）
curl -fsSL https://raw.githubusercontent.com/YuluoY/claude-uluo/main/scripts/install.sh | bash -s -- diagram-compiler
```

之后在 Claude Code 中直接 `/<扩展名>` 即可使用。

> 前提：已安装 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI。

## 安装

### 一行命令（推荐）

```bash
# 仅注册 marketplace（不安装具体扩展）
curl -fsSL https://raw.githubusercontent.com/YuluoY/claude-uluo/main/scripts/install.sh | bash

# 注册并安装指定扩展
curl -fsSL https://raw.githubusercontent.com/YuluoY/claude-uluo/main/scripts/install.sh | bash -s -- <扩展名>
```

脚本会自动完成：
1. clone / 更新仓库到 `~/claude-uluo`
2. 在项目 `.claude/settings.json` 中注册 marketplace
3. （可选）安装指定扩展

### 手动安装

```bash
git clone https://github.com/YuluoY/claude-uluo.git ~/claude-uluo

# 在项目 .claude/settings.json 中注册：
#   "extraKnownMarketplaces": {
#     "claude-uluo": {
#       "source": { "source": "directory", "path": "~/claude-uluo" }
#     }
#   }

# 安装扩展
claude plugin install <扩展名>@claude-uluo --scope project
```

### 更新

```bash
cd ~/claude-uluo && git pull
```

## 使用

注册 marketplace 后，在任意项目中：

```bash
# 安装
claude plugin install diagram-compiler@claude-uluo --scope project

# 查看已安装
claude plugin list

# 卸载
claude plugin uninstall diagram-compiler@claude-uluo
```

在 Claude Code 对话中直接调用：`/diagram-compiler`

## 扩展列表

| 名称 | 说明 |
|------|------|
| [memex](plugins/memex/) | 长期经验记忆——自动学习、四层知识提取、混合向量检索 |
| diagram-compiler | 技术图表编译——Mermaid/Matplotlib/Canvas，支持流程图、架构图、论文插图 |
| frontend-visual-qa | 前端视觉 QA——设计 Token、组件库、响应式、无障碍、i18n 质检 |
| html-blueprint | HTML-first 组件设计协议——data-* 标注的可渲染设计稿 |
| impeccable | 前端 UI 设计与审查——UX 评审、视觉层级、无障碍、主题、排版、动效 |
| skill-creator | Skill 创建与评测——含 evals 基准测试和方差分析 |
| uluo-doc-standards | 文档规范——spec/plan/tasks/changelog/验收报告模板 |
| uluo-web-standards | Web 工程规范——eslint/stylelint/tsc + DDD 架构 + 软规则 |

## 贡献

欢迎贡献新的 skill 或 plugin，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

[MIT](LICENSE)
