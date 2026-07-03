import { ProductDetailPage } from "../../product-detail-page"

export const dynamic = "force-dynamic"

export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  return <ProductDetailPage productId={productId} backHref="/dashboard/he/approve/products" />
}
