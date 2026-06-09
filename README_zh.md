# 🛠️ claude-uluo

<p align="center">
  <a href="./README.md">English</a>
  &nbsp;·&nbsp;
  <a href="#-快速开始">快速开始</a>
  &nbsp;·&nbsp;
  <a href="#-扩展列表">扩展列表</a>
  &nbsp;·&nbsp;
  <a href="#-贡献">贡献</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://docs.anthropic.com/en/docs/claude-code"><img src="https://img.shields.io/badge/Claude%20Code-≥2.1.0-orange?logo=claude&logoColor=white" alt="Claude Code ≥2.1.0"></a>
</p>

Claude Code 前端研发扩展集——覆盖 UI 审查、组件蓝图、可视化 QA、图表编译、文档规范等环节，通过 marketplace 分发，一条命令安装。

## 🚀 快速开始

```bash
# 1. 注册 marketplace（每台机器只需一次）
claude plugin marketplace add YuluoY/claude-uluo

# 2. 一键安装全部扩展
claude plugin install claude-uluo-all@claude-uluo --scope project

# 或者只装某一个
claude plugin install diagram-compiler@claude-uluo --scope project
```

> 前提：已安装 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI ≥ 2.1.0

## 📦 安装

### ⚡ 全部安装（推荐）

```bash
# 注册 marketplace
claude plugin marketplace add YuluoY/claude-uluo

# 一键安装全部
claude plugin install claude-uluo-all@claude-uluo --scope project
```

亦可一键脚本：

```bash
curl -fsSL https://raw.githubusercontent.com/YuluoY/claude-uluo/main/scripts/install.sh | bash -s -- all
```

### 🎯 按需安装

```bash
claude plugin install <扩展名>@claude-uluo --scope project
```

### 🔄 更新

```bash
claude plugin update <扩展名>
```

## 📖 使用

```bash
# 安装
claude plugin install diagram-compiler@claude-uluo --scope project

# 查看已安装
claude plugin list

# 卸载
claude plugin uninstall diagram-compiler@claude-uluo
```

在 Claude Code 对话中直接调用：`/diagram-compiler`

## 📋 扩展列表

### 🔌 Plugin

| 名称 | 说明 |
|------|------|
| claude-uluo-all | 元插件——安装此插件自动拉取全部扩展 |
| [memex](plugins/memex/) | 长期经验记忆——自动学习、四层知识提取、混合向量检索 |

### 🎨 Skill

**自研**

| 名称 | 说明 |
|------|------|
| diagram-compiler | 技术图表编译——Mermaid/Matplotlib/Canvas，支持流程图、架构图、论文插图 |
| frontend-visual-qa | 前端视觉 QA——设计 Token、组件库、响应式、无障碍、i18n 质检 |
| html-blueprint | HTML-first 组件设计协议——data-* 标注的可渲染设计稿 |
| uluo-doc-standards | 文档规范——spec/plan/tasks/changelog/验收报告模板 |
| uluo-web-standards | Web 工程规范——eslint/stylelint/tsc + DDD 架构 + 软规则 |

**收录**

| 名称 | 说明 | 来源 |
|------|------|------|
| impeccable | 前端 UI 设计与审查——UX 评审、视觉层级、无障碍、主题、排版、动效 | 第三方 |
| skill-creator | Skill 创建与评测——含 evals 基准测试和方差分析 | Claude Code 官方 |

## 🤝 贡献

详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📄 License

[MIT](LICENSE)
