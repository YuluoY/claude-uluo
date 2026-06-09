// src/types/customer.ts

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  status: CustomerStatus
  createdAt: string
  updatedAt: string
}

export type CustomerStatus = 'active' | 'inactive' | 'lead' | 'blocked'

export interface CustomerFilters {
  keyword: string
  status: CustomerStatus | ''
  dateRange: [string, string] | null
}

export interface PaginationState {
  currentPage: number
  pageSize: number
  total: number
}

export interface CustomerListState {
  data: Customer[]
  loading: boolean
  filters: CustomerFilters
  selectedRows: Customer[]
  pagination: PaginationState
}
