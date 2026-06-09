# 在线教育平台 — C4 System Context Diagram

## 概述

使用 C4 模型上下文级别（Context Level）绘制在线教育平台的系统上下文图，展示系统与用户、外部系统之间的交互关系。

## 实体清单

| 类型 | 别名 | 名称 | 说明 |
|------|------|------|------|
| Person | student | 学生 | 通过浏览器和移动端使用平台进行课程学习、提交作业、观看直播 |
| Person | teacher | 老师 | 通过管理后台管理课程内容、批改作业、查看学习分析报告 |
| System | edu | EduPlatform | 核心教育平台：课程管理、直播授课、作业批改、学习分析 |
| System_Ext | wechatpay | 微信支付 | 第三方支付系统，处理课程购买与付费订单 |
| System_Ext | oss | 阿里云 OSS | 云对象存储服务，存储课件视频、文档等教学资源 |
| System_Ext | wecom | 企业微信 | 企业通讯平台，发送上课提醒、作业通知等消息 |

## 关系清单

| 源 | 目标 | 关系 | 协议 |
|----|------|------|------|
| 学生 (Person) | EduPlatform (System) | 使用平台学习 (浏览器/移动端) | HTTPS |
| 老师 (Person) | EduPlatform (System) | 管理课程与批改作业 (管理后台) | HTTPS |
| EduPlatform (System) | 微信支付 (System_Ext) | 发起/查询支付 | API |
| EduPlatform (System) | 阿里云 OSS (System_Ext) | 读写课件与视频资源 | SDK |
| EduPlatform (System) | 企业微信 (System_Ext) | 发送通知消息 | API |

## 设计说明

- **实体类型**严格遵循 C4 模型规范：Person（蓝色）表示用户角色，System（深灰色）表示核心系统，System_Ext（浅灰色）表示外部系统。
- **关系方向**：从 Person 指向 System 表示用户使用系统；从 System 指向 System_Ext 表示核心系统依赖外部服务。
- 所有 5 条关系均已绘制，覆盖了用户交互和外部系统集成两个维度。

## 输出文件

- `diagram.mmd` — Mermaid C4 源码
- `diagram.png` — 使用 mermaid-cli 生成的 PNG 图片 (1920x1080)
