import { ApprovalCategoryPage } from "../approval-category-page"

export default async function HebrewProductsApprovePage(props: {
  searchParams: Promise<{
    approved?: string
    error?: string
    created?: string
    skipped?: string
    approvedCount?: string
    updatedCount?: string
  }>
}) {
  return <ApprovalCategoryPage kind="product" searchParams={(await props.searchParams) ?? {}} />
}
