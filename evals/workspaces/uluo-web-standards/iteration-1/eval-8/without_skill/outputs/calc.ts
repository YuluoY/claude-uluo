/** 订单中单个商品条目 */
type OrderItem = {
  price: number;
  quantity: number;
  disabled?: boolean;
};

/** VIP 折扣比例：打九折 */
const VIP_DISCOUNT_RATE = 0.9;

/** 计算单个商品的小计金额 */
function getItemSubtotal(item: OrderItem): number {
  return item.price * item.quantity;
}

/** 计算订单总金额（VIP 享有折扣） */
export function calculateTotal(items: OrderItem[], isVip: boolean): number {
  const enabledItems = items.filter((item) => !item.disabled);
  const subtotal = enabledItems.reduce(
    (sum, item) => sum + getItemSubtotal(item),
    0,
  );

  if (isVip) {
    return subtotal * VIP_DISCOUNT_RATE;
  }
  return subtotal;
}
