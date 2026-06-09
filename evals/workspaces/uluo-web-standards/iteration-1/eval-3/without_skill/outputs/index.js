'use strict';

const { Money, zero } = require('./money');
const { OrderItem } = require('./order-item');
const { Order } = require('./order');
const { calculateDiscount, DISCOUNT_RATES } = require('./discount-calculator');
const { calculateShipping, SHIPPING_FEES } = require('./shipping-calculator');
const { PlaceOrderUseCase } = require('./place-order-usecase');
const { createOrderHandler } = require('./handler');

// ---------------------------------------------------------------------------
// Quick smoke-test / demo
// ---------------------------------------------------------------------------
function demo() {
  const useCase = new PlaceOrderUseCase();

  const input = {
    id: 'ORD-2026-001',
    items: [
      { productId: 'P100', name: 'Wireless Mouse', price: 29.99, currency: 'USD', quantity: 2 },
      { productId: 'P200', name: 'Mechanical Keyboard', price: 89.99, currency: 'USD', quantity: 1 }
    ],
    memberLevel: 'GOLD',
    deliveryMethod: 'EXPRESS'
  };

  const order = useCase.execute(input);

  console.log('=== Order Placed ===');
  console.log('ID:', order.id);
  console.log('Subtotal:', order.subtotal.toString());
  console.log('Discount  :', order.discountAmount.toString(), '(GOLD 10%)');
  console.log('Shipping  :', order.shippingCost.toString(), '(EXPRESS)');
  console.log('Total     :', order.total.toString());
}

if (require.main === module) {
  demo();
}

module.exports = {
  Money,
  zero,
  OrderItem,
  Order,
  calculateDiscount,
  DISCOUNT_RATES,
  calculateShipping,
  SHIPPING_FEES,
  PlaceOrderUseCase,
  createOrderHandler
};
