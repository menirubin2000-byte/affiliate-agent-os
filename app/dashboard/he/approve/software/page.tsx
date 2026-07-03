import { ApprovalCategoryPage } from "../approval-category-page"

export default async function HebrewSoftwareApprovePage(props: {
  searchParams: Promise<{
    approved?: string
    error?: string
    created?: string
    skipped?: string
    approvedCount?: string
    updatedCount?: string
  }>
}) {
  return <ApprovalCategoryPage kind="software" searchParams={(await props.searchParams) ?? {}} />
}
