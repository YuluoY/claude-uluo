// ============================================================
// 订单领域 API 调用层 — features/order/api/order.api.ts
// 封装对上游三个服务的 HTTP 调用，不在此层做业务逻辑
// ============================================================

import type { ApiResponse } from '../../../types/api.types.js'
import type { Order } from '../types/order.types.js'
import type { HttpClient } from '../../../shared/http/http-client.js'

/** 用户服务响应 */
export interface UserInfo {
  id: string
  name: string
  status: 'active' | 'frozen' | 'closed'
  level: string
}

/** 库存预留请求 */
export interface InventoryReserveRequest {
  orderId: string
  items: Array<{
    productId: string
    quantity: number
  }>
}

/** 库存释放请求 */
export interface InventoryReleaseRequest {
  orderId: string
  reason: string
}

/** 支付请求 */
export interface PaymentCreateRequest {
  orderId: string
  userId: string
  amount: number
  paymentMethod: string
  idempotencyKey: string
}

/** 支付响应 */
export interface PaymentCreateResponse {
  transactionId: string
  status: 'success' | 'failed' | 'pending'
  redirectUrl?: string
}

/**
 * 订单模块对外部服务的 API 调用。
 * 所有方法通过依赖注入获取 httpClient 实例。
 */
export function createOrderApiClients(httpClient: HttpClient) {
  return {
    // ---- 用户服务 ----

    /**
     * 获取用户信息 — 校验用户是否存在及状态
     */
    async getUser(userId: string): Promise<ApiResponse<UserInfo>> {
      return httpClient.get<ApiResponse<UserInfo>>(`/users/${userId}`)
    },

    /**
     * 校验用户是否可以下单
     */
    async validateUserEligibility(userId: string): Promise<ApiResponse<{ eligible: boolean; reason?: string }>> {
      return httpClient.get<ApiResponse<{ eligible: boolean; reason?: string }>>(`/users/${userId}/order-eligibility`)
    },

    // ---- 库存服务 ----

    /**
     * 预留库存 — 下单时调用
     */
    async reserveInventory(payload: InventoryReserveRequest): Promise<ApiResponse<{ reserved: boolean }>> {
      return httpClient.post<ApiResponse<{ reserved: boolean }>>('/inventory/reserve', payload)
    },

    /**
     * 释放库存 — 取消订单/支付超时时调用
     */
    async releaseInventory(payload: InventoryReleaseRequest): Promise<ApiResponse<{ released: boolean }>> {
      return httpClient.post<ApiResponse<{ released: boolean }>>('/inventory/release', payload)
    },

    // ---- 支付服务 ----

    /**
     * 发起支付
     */
    async createPayment(payload: PaymentCreateRequest): Promise<ApiResponse<PaymentCreateResponse>> {
      return httpClient.post<ApiResponse<PaymentCreateResponse>>('/payments', payload, {
        headers: { 'Idempotency-Key': payload.idempotencyKey },
      })
    },

    /**
     * 查询支付状态
     */
    async queryPaymentStatus(transactionId: string): Promise<ApiResponse<{ status: string }>> {
      return httpClient.get<ApiResponse<{ status: string }>>(`/payments/${transactionId}`)
    },
  }
}

export type OrderApiClients = ReturnType<typeof createOrderApiClients>
