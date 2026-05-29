import type { ReactNode } from "react"

export function PageHeader(props: {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        {props.eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {props.eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{props.title}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{props.description}</p>
        </div>
      </div>

      {props.actions ? <div className="shrink-0">{props.actions}</div> : null}
    </div>
  )
}
