import Link from "next/link"
import { CircleAlert, ShieldCheck, Wrench } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { OperatorModeSummary } from "@/types/system"

const modeIconMap = {
  setup: Wrench,
  limited: CircleAlert,
  ready: ShieldCheck,
} as const

const modeVariantMap = {
  setup: "secondary",
  limited: "secondary",
  ready: "default",
} as const

export function ModeBanner({ mode }: { mode: OperatorModeSummary }) {
  const Icon = modeIconMap[mode.mode]

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{mode.title}</CardTitle>
            <Badge variant={modeVariantMap[mode.mode]}>{mode.mode}</Badge>
          </div>
          <CardDescription>{mode.description}</CardDescription>
        </div>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <Link
          href={mode.actionHref}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          {mode.actionLabel}
        </Link>
      </CardContent>
    </Card>
  )
}
