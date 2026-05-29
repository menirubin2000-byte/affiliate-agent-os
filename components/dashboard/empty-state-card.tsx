import Link from "next/link"
import type { ReactNode } from "react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface EmptyStateAction {
  label: string
  href: string
  variant?: "default" | "outline" | "ghost"
}

export function EmptyStateCard(props: {
  title: string
  description: string
  helperText?: string
  icon?: ReactNode
  actions?: EmptyStateAction[]
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
      <CardContent className="space-y-4">
        {props.helperText ? (
          <p className="text-sm text-muted-foreground">{props.helperText}</p>
        ) : null}

        {props.actions && props.actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {props.actions.map((action) => (
              <Link
                key={`${action.href}:${action.label}`}
                href={action.href}
                className={cn(buttonVariants({ variant: action.variant ?? "default", size: "sm" }))}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
