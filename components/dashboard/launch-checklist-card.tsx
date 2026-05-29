import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  PlayCircle,
  ShieldCheck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type {
  LaunchChecklist,
  LaunchChecklistStatus,
  TrialProgress,
} from "@/types/system"

const statusVariantMap = {
  not_started: "outline",
  ready: "secondary",
  blocked: "destructive",
  complete: "default",
} as const

const statusLabelMap: Record<LaunchChecklistStatus, string> = {
  not_started: "Not started",
  ready: "Ready",
  blocked: "Blocked",
  complete: "Complete",
}

const statusIconMap = {
  not_started: CircleDashed,
  ready: PlayCircle,
  blocked: CircleAlert,
  complete: CheckCircle2,
} as const

export function LaunchChecklistCard(props: {
  checklist: LaunchChecklist
  progress: TrialProgress
}) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Stage 14 launch checklist</CardTitle>
          <CardDescription>
            Run the first staging trial in order, with every operational action still controlled by the operator.
          </CardDescription>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">
            {props.checklist.completedCount}/{props.checklist.totalCount}
          </div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Items complete
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-lg border border-border/70 bg-background/70 p-4 md:grid-cols-[minmax(0,1fr)_180px]">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <p className="font-medium">Trial progress</p>
              <Badge variant={props.checklist.blockingCount > 0 ? "destructive" : "default"}>
                {props.progress.percentComplete}%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{props.progress.summary}</p>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${props.progress.percentComplete}%` }}
              />
            </div>
          </div>
          <div className="flex items-start md:justify-end">
            <Link
              href={props.progress.nextActionHref}
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              {props.progress.nextActionLabel}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            WordPress is optional and not required for the core workflow.
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            Core flow: Product → Draft → Approval → Performance → Recommendations.
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            Approval remains human-only. No production publish path exists.
          </div>
        </div>

        <div className="space-y-4">
          {props.checklist.steps.map((step, index) => {
            const Icon = statusIconMap[step.status]

            return (
              <div key={step.id}>
                {index > 0 ? <Separator className="mb-4" /> : null}
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <p className="font-medium">{step.title}</p>
                      <Badge variant={statusVariantMap[step.status]}>
                        {statusLabelMap[step.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    <p className="text-sm text-muted-foreground">{step.detail}</p>
                  </div>
                  <div className="flex items-start lg:justify-end">
                    <Link
                      href={step.actionHref}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      {step.actionLabel}
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
