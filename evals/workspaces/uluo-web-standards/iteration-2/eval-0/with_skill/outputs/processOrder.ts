interface OrderItem
{
  price: number
  quantity: number
}

interface Customer
{
  email: string
  vip?: boolean
}

interface Order
{
  id: string
  items?: OrderItem[]
  customer?: Customer
}

interface ProcessedOrderResult
{
  total?: number
  status?: string
}

const VIP_DISCOUNT_RATE = 0.9
const BULK_DISCOUNT_THRESHOLD = 1000
const BULK_DISCOUNT_AMOUNT = 50

declare function saveToDatabase(order: Order, result: ProcessedOrderResult): void
declare function sendEmail(email: string, message: string): void

/**
 * 计算订单小计（仅商品价格 × 数量，不含折扣）。
 */
function calculateSubtotal(items: readonly OrderItem[]): number
{
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/**
 * 按规则依次应用折扣：VIP 九折 → 满额立减。
 * 纯函数，无副作用。
 */
function applyDiscounts(total: number, isVip: boolean): number
{
  let discounted = total

  if (isVip)
  {
    discounted *= VIP_DISCOUNT_RATE
  }

  if (discounted > BULK_DISCOUNT_THRESHOLD)
  {
    discounted -= BULK_DISCOUNT_AMOUNT
  }

  return discounted
}

/**
 * 处理订单：计算总额、应用折扣、持久化并通知客户。
 *
 * Guard Clause 模式：前置条件逐条检查，不满足立即返回空结果，
 * 主逻辑保持在最外层缩进，无深层嵌套。
 */
export function processOrder(order: Order): ProcessedOrderResult
{
  const result: ProcessedOrderResult = {}

  if (!order)
  {
    return result
  }

  if (!order.items || order.items.length === 0)
  {
    return result
  }

  let total = calculateSubtotal(order.items)

  if (total <= 0)
  {
    return result
  }

  total = applyDiscounts(total, order.customer?.vip ?? false)

  result.total = total
  result.status = 'processed'

  // eslint-disable-next-line no-console
  console.log(`Order processed: ${order.id}, total: ${total}`)
  saveToDatabase(order, result)

  if (order.customer?.email)
  {
    sendEmail(order.customer.email, 'Your order has been processed')
  }

  return result
}
