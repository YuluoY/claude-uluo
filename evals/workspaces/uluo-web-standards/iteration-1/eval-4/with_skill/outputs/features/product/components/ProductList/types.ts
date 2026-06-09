/** 商品实体 */
export interface Product {
  /** 商品唯一标识 */
  id: string
  /** 商品名称 */
  name: string
  /** 商品分类 */
  category: string
  /** 商品价格 */
  price: number
  /** 商品描述 */
  description?: string
  /** 商品图片地址 */
  imageUrl?: string
}

/** ProductList 组件 Props */
export interface ProductListProps {
  /** 商品列表数据 */
  products: Product[]
  /** 当前筛选分类（空字符串表示不过滤） */
  category: string
  /** 是否加载中 */
  loading?: boolean
  /** 错误信息（非空时展示错误态） */
  error?: string | null
  /** 每页条数 */
  pageSize?: number
}

/** ProductList 组件 Emits 签名 */
export interface ProductListEmits {
  /** 选中商品 */
  select: [productId: string]
  /** 页码变更 */
  'page-change': [page: number]
  /** 重试加载 */
  retry: []
}
