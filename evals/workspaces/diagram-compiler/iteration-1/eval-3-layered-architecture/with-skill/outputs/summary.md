# Eval 3: AI 智能客服系统分层技术架构图

## 任务
生成「AI 智能客服系统」的分层技术架构图，展示从客户端到数据层的完整技术栈。

## 工作流
遵循 diagram-studio SKILL.md 中「分层技术架构图」的数据驱动路径：

1. **确定图表类型**: `layered-architecture` - 分层技术架构图，使用 Matplotlib/PIL 专用渲染器
2. **构建 YAML 数据**: 根据用户需求编写 4 层 YAML layout：
   - 客户端层：Web Chat、Mobile App、企业微信（device 块）
   - 接入层：API Gateway、WebSocket 长连接、统一鉴权 JWT/OAuth（module 块）
   - AI 服务层：AI 引擎集群 group（NLU 意图识别、知识检索 RAG、大模型调用、多轮对话管理）+ side-modules（链路追踪、服务发现、限流熔断）
   - 数据层：Milvus 向量数据库、MySQL 业务数据库、Redis 缓存(highlight 块) + Elasticsearch 日志检索(module 块)
3. **渲染输出**: `python scripts/_shared/layered_architecture.py --layout layout.yaml -o architecture.png`

## 输出
- **PNG**: 1580 x 716 px, 111 KB
- **主题**: default（低饱和学术风）
- **格式**: 黑色虚线分隔层级，低饱和淡彩背景，白色模块 + 黑色边框

## 文件清单
| 文件 | 路径 |
|------|------|
| YAML Layout | `outputs/layout.yaml` |
| Architecture PNG | `outputs/architecture.png` |
| Timing | `timing.json` |
