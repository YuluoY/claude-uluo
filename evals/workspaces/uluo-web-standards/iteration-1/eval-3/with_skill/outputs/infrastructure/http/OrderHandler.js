import { PlaceOrderUseCase } from '../../application/PlaceOrderUseCase.js'
import { AppError } from '../../shared/errors/AppError.js'
import { to } from '../../shared/utils/to.js'

/**
 * Pre-built use case instance — assembled at module load time (G3.3).
 * In a real app this would be assembled in a composition root / DI container.
 */
const placeOrderUseCase = new PlaceOrderUseCase()

/**
 * HTTP handler for POST /orders.
 *
 * Parses the request body, delegates to PlaceOrderUseCase, and returns
 * a structured HTTP response. This function never throws — all errors
 * are caught and converted to error responses.
 *
 * @param {object} request - Simulated HTTP request.
 * @param {object} [request.body] - Parsed JSON body.
 * @returns {Promise<object>} HTTP response { statusCode, headers, body }.
 */
export async function handleCreateOrder(request)
{
  if (!request)
  {
    return createResponse(400, {
      error: 'Bad Request', message: 'Request is required' 
    })
  }

  const body = request.body
  if (!body)
  {
    return createResponse(400, {
      error: 'Bad Request', message: 'Request body is required' 
    })
  }

  const [parseError, parsedBody] = parseRequestBody(body)
  if (parseError)
  {
    return createResponse(400, {
      error: 'Bad Request', message: parseError.message 
    })
  }

  const [useCaseError, orderResult] = await to(
    placeOrderUseCase.execute({
      customerId: parsedBody.customerId,
      items: parsedBody.items,
      membershipLevel: parsedBody.membershipLevel,
      deliveryMethod: parsedBody.deliveryMethod,
      currency: parsedBody.currency,
    }),
  )

  if (useCaseError)
  {
    return createErrorResponse(useCaseError)
  }

  return createResponse(201, {
    data: orderResult 
  })
}

/**
 * Parses and validates the raw request body.
 * @param {*} rawBody
 * @returns {[Error|null, object|null]}
 */
function parseRequestBody(rawBody)
{
  if (typeof rawBody !== 'object' || rawBody === null)
  {
    return [new Error('Request body must be a JSON object'), null]
  }

  const {
    customerId, items, membershipLevel, deliveryMethod, currency 
  } = rawBody

  if (!customerId || typeof customerId !== 'string')
  {
    return [new Error('customerId must be a non-empty string'), null]
  }
  if (!Array.isArray(items) || items.length === 0)
  {
    return [new Error('items must be a non-empty array'), null]
  }
  if (!membershipLevel || typeof membershipLevel !== 'string')
  {
    return [new Error('membershipLevel must be a non-empty string'), null]
  }
  if (!deliveryMethod || typeof deliveryMethod !== 'string')
  {
    return [new Error('deliveryMethod must be a non-empty string'), null]
  }

  const validCurrency = typeof currency === 'string' && currency.length > 0 ? currency : 'CNY'

  return [null, {
    customerId, items, membershipLevel, deliveryMethod, currency: validCurrency 
  }]
}

/**
 * Converts an application error to an HTTP error response.
 * Domain errors (TypeError, plain Error) map to 422; AppErrors carry
 * their own statusCode.
 *
 * @param {Error} error
 * @returns {object} HTTP response.
 */
function createErrorResponse(error)
{
  if (error instanceof AppError)
  {
    return createResponse(error.statusCode, {
      error: error.name, message: error.message 
    })
  }

  return createResponse(422, {
    error: 'Unprocessable Entity', message: error.message 
  })
}

/**
 * Builds a standard HTTP response object.
 * @param {number} statusCode
 * @param {object} body
 * @returns {object}
 */
function createResponse(statusCode, body)
{
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json' 
    },
    body,
  }
}
