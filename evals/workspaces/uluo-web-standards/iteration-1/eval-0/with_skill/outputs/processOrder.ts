/**
 * Order Processing — 订单处理模块。
 *
 * 职责：校验订单输入、计算含折扣总额、持久化结果并通知客户。
 * 重构要点：
 *   - Guard Clause 消除深层嵌套
 *   - 纯计算逻辑与副作用分离
 *   - 完整 TypeScript 类型标注
 *   - 魔法数字提取为具名常量
 */

// ── 领域类型 ──

/** 订单明细项 */
interface OrderItem
{
  price: number
  quantity: number
}

/** 客户信息 */
interface Customer
{
  vip: boolean
  email: string
}

/** 订单实体 */
interface Order
{
  id: string
  items: OrderItem[]
  customer: Customer
}

/** 订单处理结果 */
interface ProcessingResult
{
  total: number
  status: 'processed' | 'no-items' | 'no-valid-items' | 'invalid'
}

// ── 业务常量 ──

const VIP_DISCOUNT_RATE = 0.9
const LARGE_ORDER_THRESHOLD = 1000
const LARGE_ORDER_DEDUCTION = 50

// ── 外部依赖声明（生产环境通过 DI 注入）──

declare function saveToDatabase(order: Order, result: ProcessingResult): void
declare function sendEmail(email: string, message: string): void

// ── 纯计算函数 ──

/**
 * 计算订单明细的原始小计（价格 x 数量之和）。
 * 纯函数，无副作用 — 可脱离项目独立测试。
 *
 * @param items — 订单明细列表（只读）
 * @returns 有效明细的总金额，无有效明细时返回 0
 */
export function calculateSubtotal(items: readonly OrderItem[]): number
{
  return items
    .filter(item => item.price > 0 && item.quantity > 0)
    .reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/**
 * 对原始小计应用业务折扣规则。
 * 纯函数，无副作用。
 *
 * 规则：
 *   1. VIP 客户享 9 折
 *   2. 订单金额超过 1000 减 50
 *
 * @param subtotal — 原始小计
 * @param isVip — 是否为 VIP 客户
 * @returns 折扣后金额
 */
export function applyDiscounts(subtotal: number, isVip: boolean): number
{
  const afterVipDiscount = isVip
    ? subtotal * VIP_DISCOUNT_RATE
    : subtotal

  return afterVipDiscount > LARGE_ORDER_THRESHOLD
    ? afterVipDiscount - LARGE_ORDER_DEDUCTION
    : afterVipDiscount
}

// ── 编排函数 ──

/**
 * 处理订单：校验 → 计算 → 持久化 → 通知。
 *
 * 该函数编排纯计算与副作用，是订单处理流程的唯一入口。
 *
 * @param order — 待处理的订单
 * @returns 处理结果（含最终金额与状态）
 */
export function processOrder(order: Order): ProcessingResult
{
  // Guard 1: 订单为空
  if (!order)
  {
    return {
      total: 0,
      status: 'invalid',
    }
  }

  // Guard 2: 无订单明细
  if (!order.items || order.items.length === 0)
  {
    return {
      total: 0,
      status: 'no-items',
    }
  }

  // 计算原始小计
  const subtotal = calculateSubtotal(order.items)

  // Guard 3: 所有明细无效（价格为 0 或数量为 0）
  if (subtotal <= 0)
  {
    return {
      total: 0,
      status: 'no-valid-items',
    }
  }

  // 应用折扣
  const isVip = order.customer?.vip ?? false
  const total = applyDiscounts(subtotal, isVip)

  // 构建结果
  const result: ProcessingResult = {
    total,
    status: 'processed',
  }

  // 副作用：持久化 + 客户通知
  saveToDatabase(order, result)
  sendEmail(order.customer.email, 'Your order has been processed')

  return result
}
