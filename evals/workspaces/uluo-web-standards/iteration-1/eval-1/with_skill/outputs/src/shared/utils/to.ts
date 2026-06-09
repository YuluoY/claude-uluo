/**
 * await-to-js 工具：将 Promise 解包为 [error, data] 错误优先元组。
 * 灵感来自 Go 的多返回值错误处理，让错误变成取值流程中不可跳过的一步。
 *
 * 调用方必须显式检查 error 才能安全使用 data，消除 try-catch 嵌套。
 */
export async function to<T>(promise: Promise<T>): Promise<[unknown, null] | [null, T]>
{
  try
  {
    const data = await promise

    return [null, data]
  }
  catch (error: unknown)
  {
    return [error, null]
  }
}
