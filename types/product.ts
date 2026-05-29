export type ProductStatus = "active" | "inactive"

export interface Product {
  id: string
  name: string
  slug: string
  brand: string | null
  category: string | null
  affiliateUrl: string
  price: number | null
  commissionRate: number | null
  notes: string | null
  targetKeyword: string | null
  secondaryKeywords: string[]
  searchIntent: string | null
  contentAngle: string | null
  status: ProductStatus
  createdAt: string
  updatedAt: string
}

export interface CreateProductInput {
  name: string
  slug: string
  brand?: string | null
  category?: string | null
  affiliateUrl: string
  price?: number | null
  commissionRate?: number | null
  notes?: string | null
  targetKeyword?: string | null
  secondaryKeywords?: string[]
  searchIntent?: string | null
  contentAngle?: string | null
  status?: ProductStatus
}
