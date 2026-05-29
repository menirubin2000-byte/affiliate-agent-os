"use client"

import { useState } from "react"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react"

import { updateApprovalItemStatusAction } from "@/app/dashboard/approvals/actions"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  APPROVAL_ITEM_TYPE_LABELS,
  APPROVAL_ITEM_STATUS_LABELS,
} from "@/types/approval-item"
import type { ApprovalItem, ApprovalItemStatus } from "@/types/approval-item"
import { cn } from "@/lib/utils"

function statusVariant(status: ApprovalItem["status"]) {
  switch (status) {
    case "waiting_approval":
      return "secondary" as const
    case "approved":
      return "default" as const
    case "rejected":
      return "destructive" as const
    case "published":
      return "default" as const
    case "needs_changes":
      return "outline" as const
    default:
      return "secondary" as const
  }
}

function StatusButton({
  itemId,
  status,
  label,
  icon,
  variant,
  notes,
}: {
  itemId: string
  status: ApprovalItemStatus
  label: string
  icon: React.ReactNode
  variant: "default" | "destructive" | "outline"
  notes: string
}) {
  return (
    <form action={updateApprovalItemStatusAction}>
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="operator_notes" value={notes} />
      <button
        type="submit"
        className={cn(buttonVariants({ variant, size: "sm" }), "gap-1.5")}
      >
        {icon}
        {label}
      </button>
    </form>
  )
}

export function ApprovalCard({ item }: { item: ApprovalItem }) {
  const [notes, setNotes] = useState("")
  const canAct = item.status === "waiting_approval" || item.status === "needs_changes"

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{item.title}</CardTitle>
            {item.productName ? (
              <CardDescription>Product: {item.productName}</CardDescription>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(item.status)}>
              {APPROVAL_ITEM_STATUS_LABELS[item.status]}
            </Badge>
            <Badge variant="outline">
              {APPROVAL_ITEM_TYPE_LABELS[item.approvalType]}
            </Badge>
            {item.platform ? (
              <Badge variant="outline">{item.platform}</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.description ? (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Action description</p>
            <p className="mt-1 text-sm">{item.description}</p>
          </div>
        ) : null}

        {item.contentPreview ? (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Content preview</p>
            <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border/70 bg-muted/30 p-3 text-sm whitespace-pre-wrap">
              {item.contentPreview}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-4 text-sm">
          {item.campaignLinkUrl ? (
            <div className="flex items-center gap-1.5">
              <ExternalLink className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Campaign link:</span>
              <a
                href={item.campaignLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {item.campaignLinkUrl.length > 60
                  ? `${item.campaignLinkUrl.slice(0, 60)}...`
                  : item.campaignLinkUrl}
              </a>
            </div>
          ) : null}

          <div className="flex items-center gap-1.5">
            {item.disclosurePresent ? (
              <>
                <ShieldCheck className="size-3.5 text-green-600" />
                <span className="text-green-700">Disclosure present</span>
              </>
            ) : (
              <>
                <ShieldAlert className="size-3.5 text-amber-600" />
                <span className="text-amber-700">No disclosure</span>
              </>
            )}
          </div>
        </div>

        {item.operatorNotes ? (
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Operator notes</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.operatorNotes}</p>
          </div>
        ) : null}

        {canAct ? (
          <div className="space-y-3 border-t border-border/70 pt-4">
            <div className="space-y-2">
              <Label htmlFor={`notes-${item.id}`}>Notes (optional)</Label>
              <Textarea
                id={`notes-${item.id}`}
                placeholder="Add notes before approving or rejecting..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusButton
                itemId={item.id}
                status="approved"
                label="Approve"
                icon={<CheckCircle2 className="size-4" />}
                variant="default"
                notes={notes}
              />
              <StatusButton
                itemId={item.id}
                status="rejected"
                label="Reject"
                icon={<XCircle className="size-4" />}
                variant="destructive"
                notes={notes}
              />
              <StatusButton
                itemId={item.id}
                status="needs_changes"
                label="Needs changes"
                icon={<AlertTriangle className="size-4" />}
                variant="outline"
                notes={notes}
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
