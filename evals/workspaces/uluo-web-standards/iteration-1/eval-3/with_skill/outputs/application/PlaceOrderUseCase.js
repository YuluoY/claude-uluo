import { Money } from '../domain/Money.js'
import { Order } from '../domain/Order.js'
import { OrderItem } from '../domain/OrderItem.js'
import { calculateDiscount } from '../domain/DiscountCalculator.js'
import { calculateShippingFee } from '../domain/ShippingCalculator.js'
import { to } from '../shared/utils/to.js'

/**
 * Generates a unique order ID.
 * Pure utility — extracted to keep the use case at a single abstraction level.
 * @returns {string}
 */
function generateOrderId()
{
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `ORD-${timestamp}-${random}`
}

/**
 * Builds an array of OrderItem domain objects from raw item DTOs.
 * Extracted to keep PlaceOrderUseCase#execute at a single abstraction level.
 *
 * @param {object[]} itemDtos - Raw item data with productId, productName, unitPrice, quantity.
 * @param {string} currency - ISO 4217 currency code for all items.
 * @returns {OrderItem[]}
 */
function buildOrderItems(itemDtos, currency)
{
  return itemDtos.map(dto =>
  {
    const unitPrice = new Money(dto.unitPrice, currency)
    return new OrderItem({
      productId: dto.productId,
      productName: dto.productName,
      unitPrice,
      quantity: dto.quantity,
    })
  })
}

/**
 * Computes the subtotal by summing all line totals.
 * @param {OrderItem[]} items
 * @returns {Money}
 */
function computeSubtotal(items)
{
  return items.reduce(
    (sum, item) => sum.add(item.getLineTotal()),
    new Money(0, items[0].getUnitPrice().getCurrency()),
  )
}

/**
 * PlaceOrder use case — orchestrates domain objects to create an order.
 *
 * Dependencies are injected via constructor (G3.1). The class follows
 * CQS: execute() is a Query (returns data), no hidden side effects
 * beyond the conceptual "order placed" event (here represented by returning
 * a confirmed Order).
 */
export class PlaceOrderUseCase
{
  #discountCalculator

  #shippingCalculator

  #idGenerator

  /**
   * @param {object} deps
   * @param {Function} [deps.discountCalculator] — default: domain calculateDiscount.
   * @param {Function} [deps.shippingCalculator] — default: domain calculateShippingFee.
   * @param {Function} [deps.idGenerator] — default: generateOrderId.
   */
  constructor({
    discountCalculator = calculateDiscount,
    shippingCalculator = calculateShippingFee,
    idGenerator = generateOrderId,
  } = {})
  {
    this.#discountCalculator = discountCalculator
    this.#shippingCalculator = shippingCalculator
    this.#idGenerator = idGenerator
  }

  /**
   * Executes the place-order workflow.
   *
   * @param {object} request
   * @param {string} request.customerId
   * @param {object[]} request.items
   * @param {string} request.membershipLevel
   * @param {string} request.deliveryMethod
   * @param {string} [request.currency] — default "CNY".
   * @returns {Promise<[Error|null, object|null]>} Tuple of [error, orderSnapshot].
   */
  async execute({
    customerId, items, membershipLevel, deliveryMethod, currency = 'CNY' 
  })
  {
    const [validationError] = await to(validateRequest({
      customerId, items, membershipLevel, deliveryMethod 
    }))
    if (validationError)
    {
      return [validationError, null]
    }

    const orderItems = buildOrderItems(items, currency)
    const subtotal = computeSubtotal(orderItems)
    const discountedTotal = this.#discountCalculator(subtotal, membershipLevel)
    const shippingFee = this.#shippingCalculator(subtotal, deliveryMethod)
    const finalTotal = discountedTotal.add(shippingFee)

    const orderId = this.#idGenerator()
    const order = new Order({
      orderId,
      customerId,
      items: orderItems,
      subtotal,
      discountedTotal,
      shippingFee,
      finalTotal,
      membershipLevel,
      deliveryMethod,
    })

    order.confirm()

    return [null, order.toPlainObject()]
  }
}

/**
 * Validates the place-order request synchronously.
 * Returns a rejected promise on failure so callers can use to() consistently.
 *
 * @param {object} params
 * @param {string} params.customerId
 * @param {object[]} params.items
 * @param {string} params.membershipLevel
 * @param {string} params.deliveryMethod
 * @returns {Promise<void>}
 */
function validateRequest({
  customerId, items, membershipLevel, deliveryMethod 
})
{
  if (!customerId)
  {
    return Promise.reject(new Error('customerId is required'))
  }
  if (!items || items.length === 0)
  {
    return Promise.reject(new Error('items must be a non-empty array'))
  }
  if (!membershipLevel)
  {
    return Promise.reject(new Error('membershipLevel is required'))
  }
  if (!deliveryMethod)
  {
    return Promise.reject(new Error('deliveryMethod is required'))
  }

  return Promise.resolve()
}
