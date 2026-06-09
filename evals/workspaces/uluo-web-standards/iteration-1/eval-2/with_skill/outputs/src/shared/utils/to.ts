// ============================================================
// await-to-js — 错误优先元组工具
// 将 Promise 解包为 [error, data]，错误和成功在同一缩进层级处理
// ============================================================

/**
 * 将 Promise 解包为 [error, data] 元组。
 * 不抛出异常 — 错误成为 return value，调用方在缩进顶层处理。
 *
 * @example
 * const [err, user] = await to(fetchUser(id))
 * if (err) return handleError(err)
 * // user 可用
 */
export async function to<T>(promise: Promise<T>): Promise<[unknown, null] | [null, T]> {
  try {
    const data = await promise
    return [null, data]
  } catch (error: unknown) {
    return [error, null]
  }
}

/**
 * 同步版本 — 将可能抛错的函数调用解包为 [error, result] 元组
 */
export function toSync<T>(fn: () => T): [unknown, null] | [null, T] {
  try {
    const result = fn()
    return [null, result]
  } catch (error: unknown) {
    return [error, null]
  }
}
