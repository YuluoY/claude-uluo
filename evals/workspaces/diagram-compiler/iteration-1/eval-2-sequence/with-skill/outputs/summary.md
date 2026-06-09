# OAuth 2.0 授权码流程时序图 - 生成总结

## 图表类型
时序图 (sequence diagram)

## 工作流路径
Path A: 模板路径

## 执行步骤
1. 识别图表类型: `sequence`
2. 获取 Mermaid 模板: `python3 scripts/_shared/mermaid.py template --type sequence`
3. 填充 OAuth 2.0 授权码流程内容
4. 强制执行规范: `python3 scripts/_shared/mermaid.py enforce /tmp/diagram-oauth.mmd --type sequence`
5. 导出 PNG: `python3 scripts/_shared/mermaid.py export diagram.mmd -o diagram.png`

## 参与方 (Participants)
| 英文 ID | 中文别名 | 角色 |
|---------|---------|------|
| U | 用户 | 资源所有者 |
| C | 客户端 | 第三方应用 |
| A | 授权服务器 | OAuth 授权服务器 |
| R | 资源服务器 | 受保护资源服务器 |

## 消息流
1. 用户(U) -> 客户端(C): 访问客户端
2. 客户端(C) -> 用户(U): 重定向到授权服务器
3. 用户(U) -> 授权服务器(A): 用户登录并授权
4. 授权服务器(A) -> 客户端(C): 返回授权码 (authorization_code)
5. 客户端(C) -> 授权服务器(A): 用授权码换取 access_token
6. 授权服务器(A) -> 客户端(C): 返回 access_token (可选 refresh_token)
7. 客户端(C) -> 资源服务器(R): 携带 access_token 请求资源
8. 资源服务器(R) -> 客户端(C): 返回受保护资源

## 规范校验
严格遵循 diagram-studio 的序列图规范:
- participant ID 使用英文标识符，中文通过 `as` 别名表示
- 所有消息使用中文描述
- 主题变量通过 enforce 自动注入
- 语法校验通过

## 输出文件
- Mermaid 代码: `outputs/diagram.mmd`
- PNG 图片: `outputs/diagram.png`
