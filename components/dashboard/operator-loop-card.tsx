import Link from "next/link"
import { ArrowRight, RefreshCw } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const loopSteps = [
  {
    label: "Add product",
    description: "Create the affiliate offer and SEO inputs.",
    href: "/dashboard/products/new",
  },
  {
    label: "Generate content",
    description: "Create long-form or social drafts from the products table.",
    href: "/dashboard/products",
  },
  {
    label: "Review and approve",
    description: "Move the best drafts through manual approval.",
    href: "/dashboard/drafts",
  },
  {
    label: "Queue WordPress draft (optional)",
    description: "Optional: send approved content to WordPress draft mode when connected.",
    href: "/dashboard/publishing",
  },
  {
    label: "Record performance",
    description: "Track clicks, conversions, and revenue manually.",
    href: "/dashboard/performance",
  },
  {
    label: "Review recommendations",
    description: "Use advisory suggestions to decide the next iteration.",
    href: "/dashboard",
  },
] as const

export function OperatorLoopCard() {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Operator loop</CardTitle>
          <CardDescription>
            The normal manual workflow for the first real operating cycle.
          </CardDescription>
        </div>
        <RefreshCw className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="grid gap-3">
        {loopSteps.map((step, index) => (
          <Link
            key={step.label}
            href={step.href}
            className="rounded-lg border border-border/70 bg-background/70 p-3 transition-colors hover:bg-muted/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {index + 1}. {step.label}
                </p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              <ArrowRight className="mt-0.5 size-4 text-muted-foreground" />
            </div>
          </Link>
        ))}

        <div className="pt-2">
          <Link
            href="/dashboard/system"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Review setup blockers
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
