import Link from "next/link"
import { ClipboardCheck, CircleAlert } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { TrialHandoff } from "@/types/system"

export function TrialReadinessCard({ handoff }: { handoff: TrialHandoff }) {
  const Icon = handoff.ready ? ClipboardCheck : CircleAlert

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{handoff.title}</CardTitle>
          <CardDescription>{handoff.description}</CardDescription>
        </div>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Test order</div>
            <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
              {handoff.testOrder.map((step) => (
                <div
                  key={step}
                  className="rounded-lg border border-border/70 bg-background/70 p-3"
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Staging notes</div>
            <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
              {handoff.stagingNotes.map((note) => (
                <div
                  key={note}
                  className="rounded-lg border border-border/70 bg-background/70 p-3"
                >
                  {note}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Link
          href={handoff.actionHref}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          {handoff.actionLabel}
        </Link>
      </CardContent>
    </Card>
  )
}
