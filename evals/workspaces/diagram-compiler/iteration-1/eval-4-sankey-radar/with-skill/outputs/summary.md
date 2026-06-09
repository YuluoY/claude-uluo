# Eval 4: Sankey + Radar Diagram Generation

## Workflow

Both `sankey` and `radar` are **Path B (data-driven)** types. Per SKILL.md:
- Sankey with Chinese labels: use `sankey.render()` directly (Mermaid CLI sankey-beta rejects Chinese)
- Radar: use `radar.render()` directly (Mermaid CLI doesn't support radar type)

## Sankey: SaaS User Conversion Funnel

- **Backend**: Matplotlib `matplotlib.sankey.Sankey`
- **Data**: 网站访问(10000) -> 注册账号(2500) -> 激活试用(1200) -> 首次付费(400) -> 续费(200)
- **Output**: `sankey.png` (1860x584, 75KB)

## Radar: Tech Solution Comparison

- **Backend**: Matplotlib polar plot
- **Dimensions**: 性能, 可维护性, 开发效率, 社区生态, 学习成本, 扩展性
- **Solutions**:
  - 方案A(微服务): [8,7,5,9,4,9]
  - 方案B(模块化单体): [6,8,9,7,8,6]
  - 方案C(Serverless): [9,6,8,5,7,8]
- **Output**: `radar.png` (1159x926, 188KB)
