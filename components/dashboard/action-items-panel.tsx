import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { EmptyStateCard } from "@/components/dashboard/empty-state-card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn, formatDateTime } from "@/lib/utils"
import type { ActionItem, ActionItemPriority, ActionItemSource } from "@/types/action-item"

const priorityVariantMap: Record<ActionItemPriority, "default" | "secondary" | "destructive" | "outline"> = {
  critical: "destructive",
  high: "secondary",
  medium: "outline",
  low: "outline",
  info: "outline",
}

const sourceLabels: Record<ActionItemSource, string> = {
  data_quality: "Data quality",
  improvement_task: "Improvement task",
  recommendation: "Recommendation",
  performance_insight: "Performance insight",
  draft: "Draft",
  product: "Product",
  campaign_link: "Campaign link",
}

export function ActionItemsPanel(props: {
  title: string
  description: string
  items: ActionItem[]
  compact?: boolean
  actionHref?: string
  actionLabel?: string
}) {
  if (props.items.length === 0) {
    return (
      <EmptyStateCard
        title={props.title}
        description="No manual actions are currently surfaced by the command center."
        helperText="As products, drafts, campaign links, performance records, recommendations, and quality issues change, action items will appear here."
        actions={props.actionHref ? [{ label: props.actionLabel ?? "Open command center", href: props.actionHref, variant: "outline" }] : undefined}
      />
    )
  }

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{props.title}</CardTitle>
          <CardDescription>{props.description}</CardDescription>
        </div>
        {props.actionHref ? (
          <Link
            href={props.actionHref}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            {props.actionLabel ?? "Open"}
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {props.items.map((item, index) => (
          <div key={item.id}>
            {index > 0 ? <Separator className="mb-4" /> : null}
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={priorityVariantMap[item.priority]}>
                    {item.priority}
                  </Badge>
                  <Badge variant="outline">{sourceLabels[item.source]}</Badge>
                  {item.detectedAt ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.detectedAt)}
                    </span>
                  ) : null}
                </div>
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className={cn("mt-1 text-sm text-muted-foreground", props.compact ? "line-clamp-2" : "")}>
                    {item.description}
                  </p>
                </div>
              </div>
              <Link
                href={item.actionHref}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
              >
                {item.actionLabel}
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
