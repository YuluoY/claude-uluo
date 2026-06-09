/**
 * 将 Promise 解包为 [error, data] 错误优先元组。
 * 灵感来自 Go 语言的多返回值错误处理模式。
 *
 * @param promise - 要解包的 Promise 实例
 * @returns [null, T] 成功时；[Error, null] 失败时
 */
export async function to<T>(promise: Promise<T>): Promise<[null, T] | [Error, null]> {
  try {
    return [null, await promise]
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return [error, null]
  }
}
