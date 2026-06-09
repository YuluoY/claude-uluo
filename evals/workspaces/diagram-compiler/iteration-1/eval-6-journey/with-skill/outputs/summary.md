# Eval 6: 电商购物车用户旅程图

## 图表信息

- **类型**: journey (用户旅程图)
- **路径**: 路径B (数据驱动)
- **主题**: default

## 内容概要

三阶段旅程图，共 11 个任务节点：

1. **浏览商品** (4 任务): 搜索商品(4), 筛选结果(3), 查看详情(5), 加入购物车(4)
2. **结算支付** (4 任务): 确认订单(3), 选择地址(2), 选择支付方式(3), 完成支付(5)
3. **售后** (3 任务): 查看物流(4), 确认收货(5), 申请售后(2)

所有任务参与者均为「用户」，结算支付阶段的 4 个任务还包含「系统」配合。

## 生成流程

1. `python3 scripts/_shared/mermaid.py schema --type journey`
2. 构建 YAML 数据
3. `python3 scripts/_shared/mermaid.py generate --type journey --data /tmp/diagram-data.yaml`
4. `python3 scripts/_shared/mermaid.py enforce /tmp/diagram.mmd --type journey`
5. `python3 scripts/_shared/mermaid.py export /tmp/diagram.mmd -o outputs/diagram.png`

## 满意度分布

- 最高分 (5): 查看详情, 完成支付, 确认收货
- 最低分 (2): 选择地址, 申请售后
- 平均分: 约 3.64
