'use strict';

const { PlaceOrderUseCase } = require('./place-order-usecase');

const useCase = new PlaceOrderUseCase();

/**
 * HTTP request handler for creating an order.
 *
 * Compatible with Node.js http.createServer callback signature.
 * Expects a POST with a JSON body describing the order.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function createOrderHandler(req, res) {
  try {
    const body = await readRequestBody(req);
    const orderData = parseJsonBody(body);
    const order = useCase.execute(orderData);
    sendResponse(res, 201, serializeOrder(order));
  } catch (err) {
    handleError(res, err);
  }
}

// ---------------------------------------------------------------------------
// Extracted helpers – keep nesting <= 3
// ---------------------------------------------------------------------------

/**
 * Read the full request body as a string.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string>}
 */
function readRequestBody(req) {
  return new Promise(function promiseRead(resolve, reject) {
    const chunks = [];
    req.on('data', function addChunk(chunk) {
      chunks.push(chunk);
    });
    req.on('end', function finish() {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    req.on('error', reject);
  });
}

/**
 * Parse a JSON string. Throws with a user-friendly message on failure.
 * @param {string} body
 * @returns {Object}
 */
function parseJsonBody(body) {
  try {
    return JSON.parse(body);
  } catch (_err) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Send a JSON response with the given status code.
 * @param {import('http').ServerResponse} res
 * @param {number} statusCode
 * @param {*} data
 */
function sendResponse(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json'
  });
  res.end(payload);
}

/**
 * Serialise an Order to a plain object for JSON output.
 * @param {import('./order').Order} order
 * @returns {Object}
 */
function serializeOrder(order) {
  return {
    id: order.id,
    items: order.items.map(serializeItem),
    memberLevel: order.memberLevel,
    deliveryMethod: order.deliveryMethod,
    subtotal: order.subtotal ? order.subtotal.toJSON() : null,
    discountAmount: order.discountAmount ? order.discountAmount.toJSON() : null,
    shippingCost: order.shippingCost ? order.shippingCost.toJSON() : null,
    total: order.total ? order.total.toJSON() : null
  };
}

/**
 * Serialise a single OrderItem.
 * @param {import('./order-item').OrderItem} item
 * @returns {Object}
 */
function serializeItem(item) {
  return {
    productId: item.productId,
    name: item.name,
    price: item.price.toJSON(),
    quantity: item.quantity
  };
}

/**
 * Map known error types to HTTP status codes and send the response.
 * @param {import('http').ServerResponse} res
 * @param {Error} err
 */
function handleError(res, err) {
  const status = errorToStatus(err);
  sendResponse(res, status, { error: err.message });
}

/**
 * Determine the HTTP status code from an error message.
 * @param {Error} err
 * @returns {number}
 */
function errorToStatus(err) {
  const msg = err.message;
  if (msg.includes('required') || msg.includes('at least one item')) {
    return 400;
  }
  if (msg.includes('Currency mismatch') || msg.includes('Invalid JSON')) {
    return 400;
  }
  if (msg.includes('must be')) {
    return 400;
  }
  return 500;
}

module.exports = { createOrderHandler };
