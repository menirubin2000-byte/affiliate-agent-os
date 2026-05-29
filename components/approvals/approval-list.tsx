import { Inbox } from "lucide-react"

import { ApprovalCard } from "@/components/approvals/approval-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ApprovalItem } from "@/types/approval-item"

export function ApprovalList({ items }: { items: ApprovalItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="size-4" />
            No approval items
          </CardTitle>
          <CardDescription>
            When Claude proposes an action that needs operator approval, it will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Approval items include: publishing to platforms, activating products, creating campaign links, and other sensitive actions.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Sort: waiting_approval and needs_changes first, then rest
  const sorted = [...items].sort((a, b) => {
    const actionable = (s: string) =>
      s === "waiting_approval" ? 0 : s === "needs_changes" ? 1 : 2
    const diff = actionable(a.status) - actionable(b.status)
    if (diff !== 0) return diff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="space-y-4">
      {sorted.map((item) => (
        <ApprovalCard key={item.id} item={item} />
      ))}
    </div>
  )
}
