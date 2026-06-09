/** API 配置常量——跨领域共享，修改半径=1 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const API_TIMEOUT = 15000

export const API_RETRY_COUNT = 2

export const API_RETRY_DELAY_MS = 1000
