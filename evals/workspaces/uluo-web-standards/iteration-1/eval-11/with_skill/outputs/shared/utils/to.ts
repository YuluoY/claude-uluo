/**
 * await-to-js 错误优先元组工具
 *
 * 将 Promise 解包为 [error, data] 元组，错误优先，先检查 error 再往下。
 * 灵感来自 Go 语言多返回值错误处理：value, err := fn()
 *
 * 类型窄化：
 *   const [err, data] = await to(fetchSomething())
 *   if (err) { ... }  // err 为 Error, data 为 null
 *   // else 分支：err 为 null, data 为 T
 *
 * 此文件属于 shared/ 基础设施——项目启动时就位。
 */
export async function to<T>(
  promise: Promise<T>,
): Promise<[null, T] | [Error, null]> {
  try {
    return [null, await promise];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}
