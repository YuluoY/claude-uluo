# 支持 Excel 导出 变更 Tasks

> 日期: 2026-06-25 | 作者: huyongle | 关联变更 plan: ./plan.md

## 执行任务清单

### T1: 修改 spec.md 文档
- **目标文件**: `specs/user-csv-export/spec.md`
- **任务类型**: 文档
- **任务描述**: 修改 spec.md，删除"不支持 Excel 导出"非目标项，新增 FR-3 Excel 导出功能需求，新增 US-3 用户故事，新增 FR-3 验收标准
- **需调研**: 否
- **依赖**: 无

### T2: 新增 Excel 导出路由和转换函数
- **目标文件**: `src/routes/export.js`
- **任务类型**: 代码
- **任务描述**: 新增 /export/excel 路由接口和 convertToExcel 转换函数，复用现有 User.findAll 查询逻辑，设置 xlsx 响应头，引入 exceljs 依赖
- **需调研**: 是 — 建议调研方式: MCP Context7 查询 exceljs 流式写入和样式 API 用法
- **依赖**: T1

## 任务依赖图

T1 → T2
