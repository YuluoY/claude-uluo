# Git 提交规范

**加载条件：** 所有场景加载。

---

## Conventional Commits

```
<type>: <subject>

feat: 新功能
fix: 修 bug
chore: 杂务（依赖更新、配置调整）
docs: 文档
refactor: 重构（不改变行为）
test: 测试
style: 格式（不影响逻辑）
perf: 性能优化
```

示例：`feat: add order cancel API`、`fix: prevent double submit on checkout`

---

## 分支命名

```
feature/<desc>   — 新功能（feature/order-cancel）
fix/<desc>       — 修 bug（fix/checkout-double-submit）
hotfix/<desc>    — 紧急修生产（hotfix/payment-crash）
chore/<desc>     — 杂务（chore/update-deps）
```

---

## PR 粒度

- 单一目的：一个 PR 只做一件事
- ≤400 行变更：超过则考虑拆分
- PR 标题遵循 Conventional Commits 格式
- 描述写清楚：做了什么、为什么、怎么测

---

## Commit 粒度

- 一个 commit 做一件事
- 不把"修 bug + 重构 + 格式化"混在一个 commit
- WIP commit 在合入前 squash

---

## CHANGELOG

基于 Conventional Commits 自动生成（`standard-version` 或 `changesets`）：

```markdown
## v1.2.0
### Features
- add order cancel API
### Fixes
- prevent double submit on checkout
```

---

## README 最小结构

```markdown
# 项目名

## 安装
pnpm install

## 开发
pnpm dev

## 构建
pnpm build

## API 文档
见 docs/api.md

## 贡献
见 CONTRIBUTING.md
```

---

## 自检

- [ ] Commit 信息用 Conventional Commits 格式？
- [ ] 分支命名符合规范？
- [ ] PR 粒度 ≤400 行、单一目的？
- [ ] README 有安装/开发/构建说明？
