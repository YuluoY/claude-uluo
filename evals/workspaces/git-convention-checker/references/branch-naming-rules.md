# 分支命名规范

## 格式

```
<prefix>/<issue-number>-<short-description>
```

## prefix 列表

| prefix | 说明 | 示例 |
|--------|------|------|
| feature | 新功能开发 | feature/123-oauth-login |
| fix | bug 修复 | fix/456-login-crash |
| hotfix | 紧急修复 | hotfix/789-security-patch |
| release | 发布分支 | release/v1.2.0 |
| chore | 杂项（构建、依赖等） | chore/upgrade-deps |

## issue-number

- 推荐包含（可通过配置强制要求）
- 关联 issue 便于追踪
- 示例：`feature/123-oauth-login`

## short-description

- 必填
- 使用 kebab-case（短横线分隔）
- 不超过 30 字符
- 简明描述分支目的

## 正例

```
feature/123-oauth-login
fix/456-login-crash
hotfix/789-security-patch
release/v1.2.0
chore/upgrade-deps
```

## 反例

```
feature/oauth_login              # 使用下划线而非短横线
fix-login-crash                  # 缺少 prefix
feature/123                       # 缺少描述
feature/123-OAuth-Login           # 使用大写
hotfix/security_patch             # 使用下划线
```

## PR 标题规范

PR 标题采用与 commit message 相同的格式：

```
<type>(<scope>): <subject>
```

示例：`feat(auth): 添加 OAuth 2.0 登录支持`
