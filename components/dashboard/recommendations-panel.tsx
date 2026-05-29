import Link from "next/link"
import { ClipboardList } from "lucide-react"

import { createTaskFromContextAction } from "@/app/dashboard/improvements/actions"
import { EmptyStateCard } from "@/components/dashboard/empty-state-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { Recommendation } from "@/types/recommendation"

const severityVariantMap = {
  info: "outline",
  warning: "secondary",
  critical: "destructive",
} as const

const severityToneMap = {
  info: "border-border/70 bg-background/70",
  warning: "border-amber-200 bg-amber-50/80",
  critical: "border-destructive/30 bg-destructive/5",
} as const

export function RecommendationsPanel(props: {
  title: string
  description: string
  recommendations: Recommendation[]
  showQueueAction?: boolean
  returnTo?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyActions?: Array<{
    label: string
    href: string
    variant?: "default" | "outline" | "ghost"
  }>
}) {
  if (props.recommendations.length === 0) {
    return (
      <EmptyStateCard
        title={props.emptyTitle ?? props.title}
        description={props.emptyDescription ?? "No actionable recommendations right now."}
        helperText="Once products, drafts, publishing jobs, and performance records exist, advisory recommendations will appear here."
        actions={props.emptyActions}
      />
    )
  }

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.recommendations.map((recommendation, index) => (
          <div key={recommendation.id}>
            {index > 0 ? <Separator className="mb-4" /> : null}
            <div
              className={cn(
                "rounded-lg border p-4",
                severityToneMap[recommendation.severity],
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{recommendation.title}</p>
                    <Badge variant={severityVariantMap[recommendation.severity]}>
                      {recommendation.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {recommendation.description}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Link
                    href={recommendation.actionHref}
                    className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {recommendation.actionLabel}
                  </Link>
                  {props.showQueueAction ? (
                    <form action={createTaskFromContextAction}>
                      <input type="hidden" name="title" value={recommendation.title} />
                      <input type="hidden" name="description" value={recommendation.description} />
                      <input type="hidden" name="sourceType" value="recommendation" />
                      <input type="hidden" name="priority" value={recommendation.severity === "critical" ? "critical" : recommendation.severity === "warning" ? "high" : "medium"} />
                      <input type="hidden" name="suggestedAction" value={recommendation.actionLabel} />
                      <input type="hidden" name="returnTo" value={props.returnTo ?? "/dashboard"} />
                      <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <ClipboardList className="size-3" />
                        Add to queue
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
