import Link from "next/link"
import { Database, FlaskConical } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DemoDataStatus } from "@/types/system"

export function DemoDataCard({ demoData }: { demoData: DemoDataStatus }) {
  const Icon = demoData.isLoaded ? FlaskConical : Database

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{demoData.title}</CardTitle>
            <Badge variant={demoData.isLoaded ? "secondary" : "outline"}>
              {demoData.isLoaded ? "Demo mode" : "Live dataset"}
            </Badge>
          </div>
          <CardDescription>{demoData.description}</CardDescription>
        </div>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Products</div>
            <div className="mt-1 text-2xl font-semibold">{demoData.productCount}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Drafts</div>
            <div className="mt-1 text-2xl font-semibold">{demoData.draftCount}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Queue jobs</div>
            <div className="mt-1 text-2xl font-semibold">{demoData.publishingJobCount}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Performance</div>
            <div className="mt-1 text-2xl font-semibold">{demoData.performanceRecordCount}</div>
          </div>
        </div>

        <Link
          href={demoData.actionHref}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          {demoData.actionLabel}
        </Link>
      </CardContent>
    </Card>
  )
}
