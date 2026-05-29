import Link from "next/link"
import { ArrowRight, Building2, CheckCircle2, Clock, Link2, Search } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { AffiliateProgramForm } from "@/components/affiliate-programs/affiliate-program-form"
import { AffiliateProgramList } from "@/components/affiliate-programs/affiliate-program-list"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getAffiliateProgramSummary,
  listAffiliatePrograms,
  listProducts,
} from "@/lib/db"
import { getSupabaseReadiness } from "@/lib/env"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { AffiliateProgram, AffiliateProgramSummary } from "@/types/affiliate-program"
import { PROGRAM_STATUS_LABELS, VALID_PROGRAM_STATUSES } from "@/types/affiliate-program"
import { APPROVAL_TYPE_LABELS, VALID_APPROVAL_TYPES } from "@/types/affiliate-program"
import type { Product } from "@/types/product"

export const dynamic = "force-dynamic"

export default async function AffiliateProgramsPage(props: {
  searchParams: Promise<{
    created?: string
    error?: string
    status?: string
    approval_type?: string
    network?: string
  }>
}) {
  const searchParams = await props.searchParams
  const statusFilter = VALID_PROGRAM_STATUSES.includes(searchParams.status as never)
    ? (searchParams.status as AffiliateProgram["status"])
    : undefined
  const approvalFilter = VALID_APPROVAL_TYPES.includes(searchParams.approval_type as never)
    ? (searchParams.approval_type as AffiliateProgram["approvalType"])
    : undefined
  const networkFilter = searchParams.network?.trim() || undefined

  let programs: AffiliateProgram[] = []
  let products: Product[] = []
  let summary: AffiliateProgramSummary = {
    total: 0,
    researchNeeded: 0,
    signupNeeded: 0,
    awaitingHumanApproval: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    closed: 0,
    linkReady: 0,
  }
  let pageError: string | null = null

  if (!isSupabaseConfigured()) {
    const readiness = getSupabaseReadiness()
    pageError = `${readiness.summary} ${readiness.guidance}`
  } else {
    try {
      ;[programs, products, summary] = await Promise.all([
        listAffiliatePrograms({
          status: statusFilter,
          approvalType: approvalFilter,
          network: networkFilter,
        }),
        listProducts(),
        getAffiliateProgramSummary(),
      ])
    } catch (error) {
      pageError =
        error instanceof Error
          ? error.message
          : "Unable to load affiliate programs from Supabase."
    }
  }

  const networks = Array.from(
    new Set(programs.map((p) => p.network).filter(Boolean) as string[]),
  )

  const actionNeeded = summary.researchNeeded + summary.signupNeeded + summary.awaitingHumanApproval
  const inProgress = summary.submitted
  const completed = summary.approved + summary.linkReady

  return (
    <>
      <PageHeader
        eyebrow="Affiliate Ops"
        title="Affiliate Programs"
        description="Track affiliate program research, signups, approvals, and active links. Move each program through the pipeline until the link is ready for campaigns."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/affiliate-programs#create-affiliate-program"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <Building2 className="size-4" />
              Add program
            </Link>
            <Link
              href="/dashboard/campaign-links"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Link2 className="size-4" />
              Campaign links
            </Link>
            <Link
              href="/dashboard/products"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Back to products
              <ArrowRight className="size-4" />
            </Link>
          </div>
        }
      />

      {/* Flash messages */}
      {searchParams.error ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Affiliate program error</CardTitle>
            <CardDescription className="text-destructive/80">
              {searchParams.error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {searchParams.created === "1" ? (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardHeader>
            <CardTitle>Program added</CardTitle>
            <CardDescription className="text-emerald-900/80">
              The affiliate program was saved. Update its status as you progress
              through the application pipeline.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {pageError ? (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle>Unable to load affiliate programs</CardTitle>
            <CardDescription className="text-destructive/80">
              {pageError}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total programs"
          value={String(summary.total)}
          detail="All affiliate programs tracked across products."
          icon={<Building2 className="size-4" />}
        />
        <StatCard
          label="Action needed"
          value={String(actionNeeded)}
          detail="Programs requiring research, signup, or human approval."
          icon={<Search className="size-4" />}
        />
        <StatCard
          label="In progress"
          value={String(inProgress)}
          detail="Applications submitted and awaiting response."
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Links ready"
          value={String(completed)}
          detail="Approved programs with active affiliate links."
          icon={<CheckCircle2 className="size-4" />}
        />
      </section>

      {/* Filters */}
      {(programs.length > 0 || statusFilter || approvalFilter || networkFilter) ? (
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Filter programs by status, approval type, or network.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <form
              action="/dashboard/affiliate-programs"
              className="grid gap-3 md:grid-cols-4"
            >
              <select
                name="status"
                defaultValue={statusFilter ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All statuses</option>
                {VALID_PROGRAM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROGRAM_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>

              <select
                name="approval_type"
                defaultValue={approvalFilter ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All approval types</option>
                {VALID_APPROVAL_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {APPROVAL_TYPE_LABELS[a]}
                  </option>
                ))}
              </select>

              <select
                name="network"
                defaultValue={networkFilter ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All networks</option>
                {networks.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  className={cn(buttonVariants({ variant: "default" }))}
                  type="submit"
                >
                  Apply
                </button>
                {statusFilter || approvalFilter || networkFilter ? (
                  <Link
                    href="/dashboard/affiliate-programs"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>
          </div>
        </Card>
      ) : null}

      {/* Form + List */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AffiliateProgramForm products={products} />
        <AffiliateProgramList programs={programs} />
      </section>
    </>
  )
}
