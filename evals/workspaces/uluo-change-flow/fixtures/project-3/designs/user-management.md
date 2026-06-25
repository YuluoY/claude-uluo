# 用户管理模块设计稿

## 页面结构

### 用户列表页
- 表格展示：ID、用户名、邮箱、创建时间、操作
- 操作列：编辑、删除按钮

### 用户编辑弹窗
- 表单字段：用户名（只读）、邮箱、密码（可选）

## 组件树

```
UserManagement/
├── UserList/
│   ├── UserTable/
│   └── UserActions/
└── UserEditDialog/
```
