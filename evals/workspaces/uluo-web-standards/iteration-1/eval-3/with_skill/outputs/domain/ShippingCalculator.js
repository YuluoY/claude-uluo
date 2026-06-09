import { Money } from './Money.js'
import { DELIVERY_METHODS } from './DeliveryMethod.js'

/**
 * Shipping fee rules keyed by delivery method.
 * PICKUP is free; STANDARD / EXPRESS / SAME_DAY carry fixed fees.
 * Defined at module scope per LICM.
 */
const SHIPPING_FEE_RULES = Object.freeze({
  [DELIVERY_METHODS.STANDARD]: createFeeRule({
    baseFee: 10, freeThreshold: 100, isDelivery: true 
  }),
  [DELIVERY_METHODS.EXPRESS]: createFeeRule({
    baseFee: 20, freeThreshold: 200, isDelivery: true 
  }),
  [DELIVERY_METHODS.SAME_DAY]: createFeeRule({
    baseFee: 40, freeThreshold: 400, isDelivery: true 
  }),
  [DELIVERY_METHODS.PICKUP]: createFeeRule({
    baseFee: 0, freeThreshold: 0, isDelivery: false 
  }),
})

/**
 * Creates a shipping fee rule descriptor.
 * @param {object} params
 * @param {number} params.baseFee - Base shipping fee.
 * @param {number} params.freeThreshold - Subtotal above which shipping is free.
 * @param {boolean} params.isDelivery - Whether this method involves delivery.
 * @returns {object}
 */
function createFeeRule({
  baseFee, freeThreshold, isDelivery 
})
{
  return Object.freeze({
    baseFee, freeThreshold, isDelivery
  })
}

/**
 * Calculates the shipping fee for an order.
 *
 * Free shipping is granted when the subtotal meets or exceeds the
 * method's freeThreshold. PICKUP is always free.
 *
 * @param {Money} subtotal - The order subtotal (same currency as returned fee).
 * @param {string} deliveryMethod - One of DELIVERY_METHODS values.
 * @returns {Money} Shipping fee in the same currency as subtotal.
 */
export function calculateShippingFee(subtotal, deliveryMethod)
{
  if (!subtotal)
  {
    throw new TypeError('calculateShippingFee: subtotal is required')
  }
  if (!deliveryMethod)
  {
    throw new TypeError('calculateShippingFee: deliveryMethod is required')
  }

  const rule = SHIPPING_FEE_RULES[deliveryMethod]
  if (!rule)
  {
    throw new Error(`Unknown delivery method: ${deliveryMethod}`)
  }

  return resolveShippingFee(subtotal, rule)
}

/**
 * Resolves the actual shipping fee given the subtotal and the fee rule.
 * @param {Money} subtotal
 * @param {object} rule
 * @returns {Money}
 */
function resolveShippingFee(subtotal, rule)
{
  if (meetsFreeThreshold(subtotal, rule))
  {
    return new Money(0, subtotal.getCurrency())
  }

  return new Money(rule.baseFee, subtotal.getCurrency())
}

/**
 * Checks whether the subtotal qualifies for free shipping.
 * @param {Money} subtotal
 * @param {object} rule
 * @returns {boolean}
 */
function meetsFreeThreshold(subtotal, rule)
{
  return rule.isDelivery && subtotal.getAmount() >= rule.freeThreshold
}
