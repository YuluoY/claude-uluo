/**
 * 跨领域共享的通用类型定义。
 */

/** 表示异步操作的四种状态 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

/** 表示数据驱动组件的四种展示状态 */
export type ViewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string }
