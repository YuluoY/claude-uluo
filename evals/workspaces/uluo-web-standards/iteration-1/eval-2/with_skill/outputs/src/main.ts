// ============================================================
// 应用入口 — main.ts
// 依赖图组装点：所有依赖在此初始化并注入
// ============================================================

import { createHttpClient } from './shared/http/index.js'
import { createOrderApiClients, OrderService } from './features/order/index.js'
import { logger, startMetricsReporter } from './monitoring/index.js'
import { DEFAULT_TIMEOUT, APP_NAME, APP_VERSION } from './constants/index.js'

// ---- 依赖图组装 ----

/** 用户服务 HTTP Client */
const userServiceClient = createHttpClient({
  baseURL: process.env.USER_SERVICE_URL ?? 'http://localhost:3001/api/v1',
  timeout: DEFAULT_TIMEOUT,
})

/** 支付服务 HTTP Client */
const paymentServiceClient = createHttpClient({
  baseURL: process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3002/api/v1',
  timeout: DEFAULT_TIMEOUT,
})

/** 库存服务 HTTP Client */
const inventoryServiceClient = createHttpClient({
  baseURL: process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3003/api/v1',
  timeout: DEFAULT_TIMEOUT,
})

/** 订单 API Clients — 聚合三个上游服务 */
const orderApiClients = createOrderApiClients({
  get: async (path, options) => {
    // 根据 path 前缀路由到对应服务
    if (path.startsWith('/users')) {
      return userServiceClient.get(path, options)
    }
    if (path.startsWith('/inventory')) {
      return inventoryServiceClient.get(path, options)
    }
    return paymentServiceClient.get(path, options)
  },
  post: async (path, body, options) => {
    if (path.startsWith('/inventory')) {
      return inventoryServiceClient.post(path, body, options)
    }
    return paymentServiceClient.post(path, body, options)
  },
  put: paymentServiceClient.put,
  patch: paymentServiceClient.patch,
  delete: paymentServiceClient.delete,
  abortAll: () => {
    userServiceClient.abortAll()
    paymentServiceClient.abortAll()
    inventoryServiceClient.abortAll()
  },
})

/** 订单服务实例 — 依赖通过构造函数注入 */
const orderService = new OrderService(orderApiClients)

// ---- 应用启动 ----

logger.info(
  { app: APP_NAME, version: APP_VERSION, env: process.env.NODE_ENV ?? 'development' },
  `${APP_NAME} starting`,
)

// 启动指标定时上报
startMetricsReporter()

export { orderService, logger }
