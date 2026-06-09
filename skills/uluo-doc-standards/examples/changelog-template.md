# CHANGELOG 模板

变更日志——面向所有开发者的结构化变更记录。项目根目录全局唯一，持续追加。

---

## 模板

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [版本号] - YYYY-MM-DD

### Added
- [新增功能 1]
- [新增功能 2]

### Changed
- [变更描述 1]
- [变更描述 2]

### Deprecated
- [即将废弃的功能]

### Removed
- [已移除的功能]

### Fixed
- [修复的 Bug 1]
- [修复的 Bug 2]

### Security
- [安全相关的修复]

### Breaking Changes

<!-- 如有破坏性变更，必须说明迁移方法 -->
- **[变更描述]**: [迁移说明和示例代码]
```

---

## 填写指南

### 格式规范
- 遵循 [Keep a Changelog](https://keepachangelog.com/) 规范
- 版本号遵循语义化版本 `MAJOR.MINOR.PATCH`
- 最新版本在最上面
- 每个条目用 `-` 开头，一句话说清楚变更了什么

### 分类说明

| 分类 | 什么时候用 | 示例 |
|------|-----------|------|
| **Added** | 新增功能 | `- 新增用户导出 CSV 功能` |
| **Changed** | 现有功能的变更（非修复） | `- 将默认分页大小从 10 改为 20` |
| **Deprecated** | 即将废弃但尚未删除的功能 | `- /api/v1/users 将在 v2.0 废弃` |
| **Removed** | 已删除的功能 | `- 移除旧版认证中间件` |
| **Fixed** | Bug 修复 | `- 修复并发写入导致的数据丢失` |
| **Security** | 安全修复 | `- 修复 XSS 注入漏洞` |

### Breaking Changes
- 这是最重要的一节——升级者第一眼就要看到
- 不仅仅是说明"改了"，还要说明"怎么迁移"
- 附上迁移代码示例

### 条目编写原则
- 面向开发者写，不是面向用户。用户看 Release Notes
- 每条只说一个变更
- 引用相关的 spec/issue 编号（如 `(#123)`）
- 同一分类下按重要性排序

### 周期
- 每次合并代码时追加一条
- 不要在同一个 PR 中攒多个功能的 CHANGELOG——每个 PR 自己的变更写自己的条目

### 反模式
```markdown
# ❌ 错误
### Changed
- 改了很多东西，优化了性能，修复了一些 bug

# ✅ 正确
### Added
- 新增用户导出 CSV 功能 (#456)
### Fixed
- 修复并发写入导致的数据丢失 (#457)
### Changed
- 将默认分页大小从 10 改为 20 (#458)
```
