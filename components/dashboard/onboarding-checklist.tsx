import Link from "next/link"
import { ArrowRight, CheckCircle2, CircleAlert, CircleDashed, Clock3 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { OnboardingChecklist, OnboardingStepStatus } from "@/types/system"

const statusVariantMap = {
  not_started: "outline",
  in_progress: "secondary",
  complete: "default",
  blocked: "destructive",
} as const

const statusLabelMap: Record<OnboardingStepStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
  blocked: "Blocked",
}

const statusIconMap = {
  not_started: CircleDashed,
  in_progress: Clock3,
  complete: CheckCircle2,
  blocked: CircleAlert,
} as const

export function OnboardingChecklistCard(props: {
  checklist: OnboardingChecklist
  title?: string
  description?: string
}) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{props.title ?? "First-run checklist"}</CardTitle>
          <CardDescription>
            {props.description ??
              "Use this checklist to complete the first real operator cycle from setup through performance tracking."}
          </CardDescription>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">
            {props.checklist.completedCount}/{props.checklist.totalCount}
          </div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Steps complete
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  )
}
