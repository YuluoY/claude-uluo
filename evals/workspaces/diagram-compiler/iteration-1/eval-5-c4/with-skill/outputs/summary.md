# C4 系统上下文图 - 在线教育平台

## 图表信息
- **图表类型**: C4 Model - System Context Diagram
- **C4 级别**: Context (上下文)
- **生成路径**: 路径B (数据驱动)

## 实体清单
| 实体ID | 类型 | 名称 | 描述 |
|--------|------|------|------|
| student | Person | 学生 | 通过浏览器和移动端使用平台 |
| teacher | Person | 老师 | 通过管理后台管理课程和批改作业 |
| eduPlatform | System | EduPlatform | 课程管理、直播授课、作业批改、学习分析 |
| wechatPay | System_Ext | 微信支付 | 处理课程付费 |
| aliyunOss | System_Ext | 阿里云 OSS | 存储课件视频 |
| wecom | System_Ext | 企业微信 | 发送通知消息 |

## 关系
- 学生 → EduPlatform: 浏览课程、观看直播、提交作业
- 老师 → EduPlatform: 管理课程、直播授课、批改作业
- EduPlatform → 微信支付: 发起支付请求
- EduPlatform → 阿里云 OSS: 上传/下载课件视频
- EduPlatform → 企业微信: 发送通知消息

## 校验
- enforce: 通过
- PNG导出: 成功
