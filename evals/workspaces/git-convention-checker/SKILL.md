---
name: git-convention-checker
version: 0.1.0
description: >-
  Git 提交规范检查——校验 commit message 格式、分支命名、PR 标题是否符合 Conventional Commits 规范。
  Use this skill when user asks to check git conventions, validate commit messages,
  review branch naming, or mentions: commit 规范, 分支命名, PR 标题, conventional commits,
  git 规范, commit message 格式, code review 规范.
---

# git-convention-checker

**检查 Git 提交规范**：commit message、分支命名、PR 标题。

---

## 怎么做

**检查 commit message**：

1. 读取最近 N 条 commit（默认 10，用户可指定）
2. 按 Conventional Commits 规范校验每条 commit message
3. 报告不符合规范的 commit，给出修复建议

```bash
git log --pretty=format:"%h %s" -n 10
```

**检查分支命名**：

1. 列出本地/远程分支
2. 按分支命名规范校验
3. 报告不符合规范的分支

```bash
git branch -a --format="%(refname:short)"
```

**检查 PR 标题**：

1. 读取指定 PR 的标题（通过 `gh pr view` 或用户提供）
2. 按 commit message 相同规范校验
3. 报告不符合规范的 PR 标题

```bash
gh pr list --state all --limit 10 --json number,title
```

---

## 怎么做得更好

**规则可配置**：不同团队规范不同，读取项目根目录的 `.gitconventionrc`（json 格式）覆盖默认规则。

```json
{
  "commit_types": ["feat", "fix", "docs", "style", "refactor", "test", "chore"],
  "branch_prefixes": ["feature", "fix", "hotfix", "release", "chore"],
  "require_issue_number": true
}
```

**批量修复建议**：对历史 commit 批量生成修复建议，输出 markdown 报告。

**CI 集成**：在 CI 中调用本 skill 检查最近一条 commit，不符合规范则失败。

---

## 禁止做什么

- **禁止自动修改 commit message**——git rebase -i 有风险，只给建议不执行
  - 约束条件：历史 commit 已推送的不可修改，避免强制推送
- **禁止硬编码规则**——规则必须可配置，默认值在 references 中说明
  - 约束条件：不同团队规范不同，硬编码导致无法复用
- **禁止跳过 commit type 校验**——type 是 Conventional Commits 的核心
  - 约束条件：无 type 的 commit message 无法自动生成 CHANGELOG
- **禁止忽略 scope**——scope 标识影响范围，缺失会导致变更追踪困难
  - 约束条件：scope 可选但推荐，大型项目必须

---

## 规则详情

**commit message 规范**：详见 [references/commit-message-rules.md](references/commit-message-rules.md)

**分支命名规范**：详见 [references/branch-naming-rules.md](references/branch-naming-rules.md)
