/**
 * Order item value object — product reference within an order.
 */
export class OrderItem
{
  #productId

  #productName

  #unitPrice

  #quantity

  /**
   * @param {object} params
   * @param {string} params.productId
   * @param {string} params.productName
   * @param {import('./Money.js').Money} params.unitPrice
   * @param {number} params.quantity
   */
  constructor({
    productId, productName, unitPrice, quantity 
  })
  {
    if (!productId)
    {
      throw new TypeError('OrderItem: productId is required')
    }
    if (!productName)
    {
      throw new TypeError('OrderItem: productName is required')
    }
    if (!unitPrice)
    {
      throw new TypeError('OrderItem: unitPrice is required')
    }
    if (quantity == null || quantity < 1)
    {
      throw new TypeError('OrderItem: quantity must be >= 1')
    }
    this.#productId = productId
    this.#productName = productName
    this.#unitPrice = unitPrice
    this.#quantity = quantity
  }

  getProductId()
  {
    return this.#productId
  }

  getProductName()
  {
    return this.#productName
  }

  getUnitPrice()
  {
    return this.#unitPrice
  }

  getQuantity()
  {
    return this.#quantity
  }

  /**
   * Computes line total = unitPrice * quantity.
   * @returns {import('./Money.js').Money}
   */
  getLineTotal()
  {
    return this.#unitPrice.multiply(this.#quantity)
  }
}
