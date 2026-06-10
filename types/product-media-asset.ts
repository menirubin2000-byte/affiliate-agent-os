export type ProductMediaAssetSource = "manufacturer" | "paapi" | "uploaded" | "generated"
export type ProductMediaAssetType = "image"

export interface ProductMediaAsset {
  id: string
  productId: string
  source: ProductMediaAssetSource
  url: string
  altText: string | null
  mediaType: ProductMediaAssetType
  isPrimary: boolean
  sortOrder: number
  sourceUrl: string | null
  createdAt: string
  updatedAt: string
}
