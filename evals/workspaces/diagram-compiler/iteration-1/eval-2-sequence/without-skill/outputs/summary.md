# OAuth2.0 授权码流程时序图

## 任务描述
根据 OAuth2.0 授权码流程绘制时序图，描述用户、客户端、授权服务器、资源服务器四方的交互过程。

## 流程图说明
共 4 个 participant，英文 ID 配合中文 alias：

| ID | 中文别名 | 角色 |
|----|---------|------|
| U | User（用户） | 资源拥有者 |
| C | Client（客户端） | 第三方应用 |
| AS | AuthServer（授权服务器） | 颁发授权码和 token |
| RS | ResourceServer（资源服务器） | 持有受保护资源 |

## 流程步骤
1. 用户访问客户端
2. 客户端返回 302 重定向到授权服务器
3. 用户向授权服务器发起授权请求
4. 授权服务器显示授权页面
5. 用户确认授权
6. 授权服务器返回授权码（authorization_code）
7. 客户端凭据 + 授权码向授权服务器换取 token
8. 授权服务器返回 access_token（+ refresh_token）
9. 客户端携带 access_token 访问资源服务器
10. 资源服务器返回受保护资源

## 输出文件
- `diagram.mmd` — Mermaid 源码
- `diagram.png` — 导出的 PNG 图片（1200x800, 白色背景）
