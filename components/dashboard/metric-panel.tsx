import Link from "next/link"
import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"

interface MetricRow {
  label: string
  value: number
  href?: string
  variant?: BadgeVariant
}

export function MetricPanel(props: {
  title: string
  description: string
  icon?: ReactNode
  actionHref?: string
  actionLabel?: string
  rows: MetricRow[]
}) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{props.title}</CardTitle>
          <CardDescription>{props.description}</CardDescription>
        </div>
        {props.icon ? <div className="text-muted-foreground">{props.icon}</div> : null}
      </CardHeader>
      <CardContent className="grid gap-2">
        {props.rows.map((row) => {
          const content = (
            <div
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm",
                row.href ? "transition-colors hover:bg-muted/60" : "",
              )}
            >
              <span className="text-muted-foreground">{row.label}</span>
              <Badge variant={row.variant ?? "secondary"}>{row.value}</Badge>
            </div>
          )

          return row.href ? (
            <Link key={row.label} href={row.href}>
              {content}
            </Link>
          ) : (
            <div key={row.label}>{content}</div>
          )
        })}

        {props.actionHref && props.actionLabel ? (
          <div className="pt-2 text-sm">
            <Link href={props.actionHref} className="text-muted-foreground hover:text-foreground">
              {props.actionLabel}
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
