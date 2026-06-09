/**
 * Order entity — the central aggregate in the ordering domain.
 *
 * Holds order items, applies discount and shipping, and tracks
 * the current order status. All mutations go through dedicated
 * methods that return nothing (Command side of CQS).
 */
export class Order
{
  #orderId

  #items

  #subtotal

  #discountedTotal

  #shippingFee

  #finalTotal

  #membershipLevel

  #deliveryMethod

  #status

  #customerId

  #createdAt

  /**
   * @param {object} params
   * @param {string} params.orderId
   * @param {string} params.customerId
   * @param {import('./OrderItem.js').OrderItem[]} params.items
   * @param {import('./Money.js').Money} params.subtotal
   * @param {import('./Money.js').Money} params.discountedTotal
   * @param {import('./Money.js').Money} params.shippingFee
   * @param {import('./Money.js').Money} params.finalTotal
   * @param {string} params.membershipLevel
   * @param {string} params.deliveryMethod
   */
  constructor({
    orderId,
    customerId,
    items,
    subtotal,
    discountedTotal,
    shippingFee,
    finalTotal,
    membershipLevel,
    deliveryMethod,
  })
  {
    if (!orderId)
    {
      throw new TypeError('Order: orderId is required')
    }
    if (!customerId)
    {
      throw new TypeError('Order: customerId is required')
    }
    if (!items || items.length === 0)
    {
      throw new TypeError('Order: at least one item is required')
    }

    this.#orderId = orderId
    this.#customerId = customerId
    this.#items = [...items]
    this.#subtotal = subtotal
    this.#discountedTotal = discountedTotal
    this.#shippingFee = shippingFee
    this.#finalTotal = finalTotal
    this.#membershipLevel = membershipLevel
    this.#deliveryMethod = deliveryMethod
    this.#status = 'PENDING'
    this.#createdAt = new Date()
  }

  // ── Queries (no side effects) ──

  getOrderId()
  {
    return this.#orderId
  }

  getCustomerId()
  {
    return this.#customerId
  }

  getItems()
  {
    return [...this.#items]
  }

  getSubtotal()
  {
    return this.#subtotal
  }

  getDiscountedTotal()
  {
    return this.#discountedTotal
  }

  getShippingFee()
  {
    return this.#shippingFee
  }

  getFinalTotal()
  {
    return this.#finalTotal
  }

  getMembershipLevel()
  {
    return this.#membershipLevel
  }

  getDeliveryMethod()
  {
    return this.#deliveryMethod
  }

  getStatus()
  {
    return this.#status
  }

  getCreatedAt()
  {
    return this.#createdAt
  }

  // ── Commands (side effects, no return value) ──

  /** Marks the order as confirmed. */
  confirm()
  {
    if (this.#status !== 'PENDING')
    {
      throw new Error(`Cannot confirm order in status: ${this.#status}`)
    }
    this.#status = 'CONFIRMED'
  }

  /** Marks the order as cancelled. */
  cancel()
  {
    if (this.#status === 'SHIPPED' || this.#status === 'DELIVERED')
    {
      throw new Error(`Cannot cancel order in status: ${this.#status}`)
    }
    this.#status = 'CANCELLED'
  }

  /**
   * Exports a plain-object snapshot for serialization / HTTP response.
   * @returns {object}
   */
  toPlainObject()
  {
    return Object.freeze({
      orderId: this.#orderId,
      customerId: this.#customerId,
      status: this.#status,
      membershipLevel: this.#membershipLevel,
      deliveryMethod: this.#deliveryMethod,
      items: this.#items.map(convertItemToPlain),
      subtotal: convertMoneyToPlain(this.#subtotal),
      discountedTotal: convertMoneyToPlain(this.#discountedTotal),
      shippingFee: convertMoneyToPlain(this.#shippingFee),
      finalTotal: convertMoneyToPlain(this.#finalTotal),
      createdAt: this.#createdAt.toISOString(),
    })
  }
}

/**
 * Converts an OrderItem to a plain object.
 * @param {import('./OrderItem.js').OrderItem} item
 * @returns {object}
 */
function convertItemToPlain(item)
{
  return {
    productId: item.getProductId(),
    productName: item.getProductName(),
    unitPrice: convertMoneyToPlain(item.getUnitPrice()),
    quantity: item.getQuantity(),
    lineTotal: convertMoneyToPlain(item.getLineTotal()),
  }
}

/**
 * Converts a Money object to a plain {amount, currency} object.
 * @param {import('./Money.js').Money} money
 * @returns {{ amount: number, currency: string }}
 */
function convertMoneyToPlain(money)
{
  return {
    amount: money.getAmount(), currency: money.getCurrency() 
  }
}
