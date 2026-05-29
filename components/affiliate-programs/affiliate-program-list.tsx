import Link from "next/link"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  Link2,
  XCircle,
} from "lucide-react"

import {
  updateAffiliateProgramLinkAction,
  updateAffiliateProgramStatusAction,
} from "@/app/dashboard/affiliate-programs/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { AffiliateProgram, AffiliateProgramStatus } from "@/types/affiliate-program"
import { APPROVAL_TYPE_LABELS, PROGRAM_STATUS_LABELS } from "@/types/affiliate-program"

/* ------------------------------------------------------------------ */
/*  Status badge colour mapping                                       */
/* ------------------------------------------------------------------ */

function statusVariant(
  status: AffiliateProgramStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "link_ready":
    case "approved":
      return "default"
    case "rejected":
    case "closed":
      return "destructive"
    case "awaiting_human_approval":
    case "submitted":
      return "outline"
    default:
      return "secondary"
  }
}

/* ------------------------------------------------------------------ */
/*  Next-status helper — determines which transition buttons to show  */
/* ------------------------------------------------------------------ */

interface StatusTransition {
  label: string
  status: AffiliateProgramStatus
  icon: typeof ArrowRight
}

function getTransitions(current: AffiliateProgramStatus): StatusTransition[] {
  switch (current) {
    case "research_needed":
      return [{ label: "Mark signup needed", status: "signup_needed", icon: ArrowRight }]
    case "signup_needed":
      return [{ label: "Awaiting approval", status: "awaiting_human_approval", icon: ArrowRight }]
    case "awaiting_human_approval":
      return [
        { label: "Submitted", status: "submitted", icon: ArrowRight },
      ]
    case "submitted":
      return [
        { label: "Approved", status: "approved", icon: CheckCircle2 },
        { label: "Rejected", status: "rejected", icon: XCircle },
      ]
    case "approved":
      return [{ label: "Link ready", status: "link_ready", icon: Link2 }]
    case "rejected":
      return [{ label: "Re-submit", status: "submitted", icon: ArrowRight }]
    case "closed":
      return [{ label: "Re-open", status: "research_needed", icon: ArrowRight }]
    case "link_ready":
      return []
    default:
      return []
  }
}

/* ------------------------------------------------------------------ */
/*  Compact list (for product workspace embed)                         */
/* ------------------------------------------------------------------ */

function CompactList({ programs }: { programs: AffiliateProgram[] }) {
  return (
    <div className="space-y-3">
      {programs.map((program, index) => (
        <div key={program.id}>
          {index > 0 ? <Separator className="mb-3" /> : null}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{program.programName}</span>
                <Badge variant={statusVariant(program.status)} className="text-xs">
                  {PROGRAM_STATUS_LABELS[program.status]}
                </Badge>
                {program.network ? (
                  <Badge variant="outline" className="text-xs">{program.network}</Badge>
                ) : null}
              </div>
              {program.commissionSummary ? (
                <p className="text-xs text-muted-foreground">{program.commissionSummary}</p>
              ) : null}
              {program.affiliateLink ? (
                <p className="text-xs font-mono text-muted-foreground max-w-[260px] truncate">
                  {program.affiliateLink}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1">
              {getTransitions(program.status).map((t) => (
                <form key={t.status} action={updateAffiliateProgramStatusAction}>
                  <input type="hidden" name="programId" value={program.id} />
                  <input type="hidden" name="status" value={t.status} />
                  <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
                    <t.icon className="size-3" />
                    {t.label}
                  </Button>
                </form>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Full list component                                                */
/* ------------------------------------------------------------------ */

export function AffiliateProgramList(props: {
  programs: AffiliateProgram[]
  compact?: boolean
}) {
  const { programs, compact } = props

  if (programs.length === 0) {
    return (
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Affiliate programs</CardTitle>
          <CardDescription>
            No programs tracked yet. Use the form to add one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dashboard/affiliate-programs#create-affiliate-program"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Building2 className="size-4" />
            Add first program
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return <CompactList programs={programs} />
  }

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Affiliate programs ({programs.length})</CardTitle>
        <CardDescription>
          Track affiliate program applications, approvals, and links. Update status as you progress through each program.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((program) => (
                <TableRow key={program.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium">{program.programName}</span>
                      {program.programUrl ? (
                        <a
                          href={program.programUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3" />
                          Info page
                        </a>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {program.productId ? (
                      <Link
                        href={`/dashboard/products/${program.productId}`}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <FolderOpen className="size-3" />
                        {program.productName ?? "View product"}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {program.network ? (
                      <Badge variant="outline" className="text-xs">{program.network}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                    {program.commissionSummary ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {APPROVAL_TYPE_LABELS[program.approvalType]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant(program.status)}
                      className="text-xs"
                    >
                      {PROGRAM_STATUS_LABELS[program.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {program.affiliateLink ? (
                      <span className="max-w-[160px] truncate text-xs font-mono text-muted-foreground block">
                        {program.affiliateLink}
                      </span>
                    ) : program.status === "approved" || program.status === "link_ready" ? (
                      <form action={updateAffiliateProgramLinkAction} className="flex gap-1">
                        <input type="hidden" name="programId" value={program.id} />
                        <Input
                          name="affiliate_link"
                          placeholder="Paste link"
                          className="h-7 text-xs w-[120px]"
                          required
                        />
                        <Button type="submit" variant="outline" size="sm" className="h-7 text-xs">
                          Save
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {getTransitions(program.status).map((t) => (
                        <form key={t.status} action={updateAffiliateProgramStatusAction} className="inline-flex">
                          <input type="hidden" name="programId" value={program.id} />
                          <input type="hidden" name="status" value={t.status} />
                          <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
                            <t.icon className="size-3" />
                            {t.label}
                          </Button>
                        </form>
                      ))}
                      {program.signupUrl ? (
                        <a
                          href={program.signupUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}
                        >
                          <ExternalLink className="size-3" />
                          Signup
                        </a>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
