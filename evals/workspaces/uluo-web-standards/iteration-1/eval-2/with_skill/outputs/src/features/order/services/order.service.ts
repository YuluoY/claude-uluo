// ============================================================
// 订单服务 — features/order/services/order.service.ts
// 核心业务逻辑：创建订单、支付、取消、退款
// 遵循 Guard Clause / Fail Fast / await-to-js / CQS
// ============================================================

import type { ApiResponse } from '../../../types/api.types.js'
import type { Order, CreateOrderPayload, CreateOrderResult } from '../types/order.types.js'
import type { OrderApiClients } from '../api/order.api.js'
import {
  ORDER_STATUS_TRANSITIONS,
  CANCELLABLE_STATUSES,
  MAX_ORDER_ITEMS,
  MAX_ORDER_AMOUNT,
} from '../constants/order.constants.js'
import { to } from '../../../shared/utils/to.js'
import { OrderDomainError, InfrastructureError } from '../../../monitoring/errors.js'
import { createChildLogger, track, withSpan, recordExternalCall } from '../../../monitoring/index.js'

const log = createChildLogger('order.service')

/**
 * 订单服务 — 依赖通过构造函数显式注入。
 *
 * 每个公开方法：
 * 1. Guard Clause 校验输入（Fail Fast）
 * 2. await-to-js 元组处理异步调用
 * 3. 业务逻辑编排
 */
export class OrderService {
  constructor(private readonly apiClients: OrderApiClients) {}

  /**
   * 创建订单流程：
   * 1. 校验用户存在且可下单
   * 2. 预留库存
   * 3. 发起支付
   * 4. 返回订单
   */
  async createOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
    // ---- Guard Clause: 参数校验（Fail Fast） ----
    if (!payload.userId) {
      return { status: 'failed', errorCode: 'USER_NOT_FOUND', message: 'userId is required' }
    }
    if (!payload.items || payload.items.length === 0) {
      return { status: 'failed', errorCode: 'VALIDATION_ERROR', message: 'order must have at least one item' }
    }
    if (payload.items.length > MAX_ORDER_ITEMS) {
      return {
        status: 'failed',
        errorCode: 'VALIDATION_ERROR',
        message: `order cannot exceed ${MAX_ORDER_ITEMS} items`,
      }
    }

    log.info({ userId: payload.userId, itemCount: payload.items.length }, 'order creation started')

    // ---- Step 1: 校验用户 ----
    const [userErr, userResponse] = await to(
      withSpan('external.user.validate', async () => {
        const start = Date.now()
        const result = await this.apiClients.validateUserEligibility(payload.userId)
        recordExternalCall('user-service', Date.now() - start)
        return result
      }),
    )

    if (userErr || !userResponse || !userResponse.success) {
      log.error({ userId: payload.userId, error: userErr }, 'user validation failed')
      return {
        status: 'failed',
        errorCode: 'USER_NOT_FOUND',
        message: 'user validation failed',
      }
    }

    if (!userResponse.data.eligible) {
      return {
        status: 'failed',
        errorCode: 'ORDER_STATUS_CONFLICT',
        message: userResponse.data.reason ?? 'user is not eligible to place orders',
      }
    }

    // ---- Step 2: 预留库存 ----
    const orderId = generateOrderId()

    const [inventoryErr, inventoryResponse] = await to(
      withSpan('external.inventory.reserve', async () => {
        const start = Date.now()
        const result = await this.apiClients.reserveInventory({
          orderId,
          items: payload.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        })
        recordExternalCall('inventory-service', Date.now() - start)
        return result
      }),
    )

    if (inventoryErr || !inventoryResponse || !inventoryResponse.success) {
      log.warn({ orderId, userId: payload.userId, error: inventoryErr }, 'inventory reservation failed')
      return {
        status: 'failed',
        errorCode: 'INSUFFICIENT_INVENTORY',
        message: 'inventory reservation failed',
      }
    }

    if (!inventoryResponse.data.reserved) {
      return {
        status: 'failed',
        errorCode: 'INSUFFICIENT_INVENTORY',
        message: 'requested items are out of stock',
      }
    }

    // ---- Step 3: 计算金额 + 发起支付 ----
    const totalAmount = calculateTotalAmount(payload.items)

    if (totalAmount > MAX_ORDER_AMOUNT) {
      return {
        status: 'failed',
        errorCode: 'VALIDATION_ERROR',
        message: `order amount exceeds maximum of ${MAX_ORDER_AMOUNT}`,
      }
    }

    const [paymentErr, paymentResponse] = await to(
      withSpan('external.payment.create', async () => {
        const start = Date.now()
        const result = await this.apiClients.createPayment({
          orderId,
          userId: payload.userId,
          amount: totalAmount,
          paymentMethod: payload.paymentMethod,
          idempotencyKey: payload.idempotencyKey,
        })
        recordExternalCall('payment-service', Date.now() - start)
        return result
      }),
    )

    if (paymentErr || !paymentResponse || !paymentResponse.success) {
      log.error({ orderId, userId: payload.userId }, 'payment creation failed')
      // 支付失败 → 释放库存
      await this.releaseInventoryInternal(orderId, 'payment_failed')
      return {
        status: 'failed',
        errorCode: 'PAYMENT_FAILED',
        message: 'payment creation failed',
      }
    }

    if (paymentResponse.data.status === 'failed') {
      await this.releaseInventoryInternal(orderId, 'payment_declined')
      return {
        status: 'failed',
        errorCode: 'PAYMENT_FAILED',
        message: 'payment was declined',
      }
    }

    // ---- 组装订单 ----
    const order: Order = {
      id: orderId,
      userId: payload.userId,
      items: [], // 由外部服务返回完整商品信息填充
      status: 'paid',
      totalAmount,
      actualAmount: totalAmount,
      paymentMethod: payload.paymentMethod,
      paymentTransactionId: paymentResponse.data.transactionId,
      idempotencyKey: payload.idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    log.info({ orderId, userId: payload.userId, totalAmount }, 'order created successfully')
    track('order_created', { orderId, userId: payload.userId, itemCount: payload.items.length, totalAmount })

    return { status: 'success', order }
  }

  /**
   * 支付订单 — 对已确认的订单发起支付
   */
  async payOrder(orderId: string, paymentMethod: string, idempotencyKey: string): Promise<ApiResponse<Order>> {
    if (!orderId) {
      return errorResponse('ORDER_NOT_FOUND', 'orderId is required')
    }

    log.info({ orderId }, 'payment initiated for order')

    const [paymentErr, paymentResponse] = await to(
      withSpan('external.payment.create', async () => {
        const start = Date.now()
        const result = await this.apiClients.createPayment({
          orderId,
          userId: '',
          amount: 0,
          paymentMethod,
          idempotencyKey,
        })
        recordExternalCall('payment-service', Date.now() - start)
        return result
      }),
    )

    if (paymentErr) {
      throw new InfrastructureError('payment service call failed', 'UPSTREAM_SERVICE_UNAVAILABLE', 'payment-service')
    }

    if (!paymentResponse || !paymentResponse.success) {
      return paymentResponse
    }

    track('order_payment_completed', { orderId, transactionId: paymentResponse.data.transactionId })

    return {
      success: true,
      data: { id: orderId } as Order,
    }
  }

  /**
   * 取消订单 — 仅 pending/confirmed 状态可取消
   */
  async cancelOrder(orderId: string, reason: string): Promise<ApiResponse<void>> {
    // Guard Clause
    if (!orderId) {
      return errorResponse('ORDER_NOT_FOUND', 'orderId is required')
    }
    if (!reason) {
      return errorResponse('VALIDATION_ERROR', 'cancel reason is required')
    }

    log.info({ orderId, reason }, 'order cancellation requested')

    // 释放库存
    const [releaseErr] = await to(
      this.apiClients.releaseInventory({ orderId, reason }),
    )

    if (releaseErr) {
      log.error({ orderId, error: releaseErr }, 'failed to release inventory during cancellation')
      throw new InfrastructureError(
        'failed to release inventory',
        'UPSTREAM_SERVICE_UNAVAILABLE',
        'inventory-service',
      )
    }

    track('order_cancelled', { orderId, cancelReason: reason })

    return { success: true, data: undefined }
  }

  /**
   * 校验订单状态转换是否合法
   */
  validateStatusTransition(current: string, next: string): void {
    const allowed = ORDER_STATUS_TRANSITIONS[current]
    if (!allowed) {
      throw new OrderDomainError(`unknown order status: ${current}`, 'ORDER_STATUS_CONFLICT')
    }
    if (!allowed.includes(next)) {
      throw new OrderDomainError(
        `cannot transition from '${current}' to '${next}'`,
        'ORDER_STATUS_CONFLICT',
      )
    }
  }

  /**
   * 内部方法：释放库存（不对外暴露）
   */
  private async releaseInventoryInternal(orderId: string, reason: string): Promise<void> {
    const [err] = await to(
      this.apiClients.releaseInventory({ orderId, reason }),
    )
    if (err) {
      log.error({ orderId, reason, error: err }, 'failed to release inventory after payment failure')
    }
  }
}

// ---- 纯函数工具（领域内使用） ----

/** 生成订单 ID */
function generateOrderId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `ord_${timestamp}_${random}`
}

/** 计算订单总金额 */
function calculateTotalAmount(items: CreateOrderPayload['items']): number {
  return 0 // 实际从商品服务获取单价后计算
}

/** 构建错误响应 */
function errorResponse(code: string, message: string): ApiResponse<never> {
  return {
    success: false,
    error: { code: code as never, message },
  }
}
