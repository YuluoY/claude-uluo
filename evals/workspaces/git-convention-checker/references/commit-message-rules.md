# Commit Message 规范

## 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

## type 列表

| type | 说明 |
|------|------|
| feat | 新功能 |
| fix | 修复 bug |
| docs | 文档变更 |
| style | 代码格式（不影响功能） |
| refactor | 重构（既不是新功能也不是修复 bug） |
| test | 增加测试 |
| chore | 构建工具、依赖变更等 |

## scope

- 可选但推荐
- 标识影响范围（模块名、组件名等）
- 示例：`feat(auth): 添加 OAuth 登录`

## subject

- 必填
- 简明描述变更内容
- 不超过 50 字符
- 不以句号结尾
- 使用祈使句（如"添加"而非"添加了"）

## body

- 可选
- 解释"为什么"做这个变更
- 每行不超过 72 字符

## footer

- 可选
- 标注 BREAKING CHANGE 或关联 issue
- 示例：`BREAKING CHANGE: 隔离模式改为默认开启`

## 正例

```
feat(auth): 添加 OAuth 2.0 登录支持

集成 passport-oauth2，支持 Google/GitHub 登录。
移除旧的 session 登录逻辑。

Closes #123
```

## 反例

```
update login                    # 缺少 type
feat: 添加新功能。               # subject 以句号结尾
fixed bug in auth module        # 缺少 type，时态错误
feat(auth): 添加 OAuth 登录支持  # 超过 50 字符（如果实际超长）
```
