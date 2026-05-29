import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function StatCard(props: {
  label: string
  value: string
  detail: string
  icon?: ReactNode
}) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {props.label}
        </CardTitle>
        {props.icon ? <div className="text-muted-foreground">{props.icon}</div> : null}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{props.value}</div>
        <p className="mt-2 text-sm text-muted-foreground">{props.detail}</p>
      </CardContent>
    </Card>
  )
}
