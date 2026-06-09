/** VIP 折扣率 */
const VIP_DISCOUNT_RATE = 0.9;

interface OrderItem {
  price: number;
  quantity: number;
  disabled?: boolean;
}

/**
 * 计算订单小计，跳过已禁用的条目。
 * @param items - 订单条目列表
 * @returns 不含折扣的小计金额
 */
export function calculateSubtotal(items: readonly OrderItem[]): number {
  return items.reduce((subtotal, item) => {
    if (item.disabled) {
      return subtotal;
    }
    return subtotal + item.price * item.quantity;
  }, 0);
}

/**
 * 计算 VIP 订单小计，在基础小计上应用 VIP 折扣。
 * @param items - 订单条目列表
 * @returns 含 VIP 折扣的小计金额
 */
export function calculateVipSubtotal(items: readonly OrderItem[]): number {
  return calculateSubtotal(items) * VIP_DISCOUNT_RATE;
}
