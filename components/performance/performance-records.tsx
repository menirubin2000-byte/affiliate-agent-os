import { EmptyStateCard } from "@/components/dashboard/empty-state-card"
import { NextActionLink } from "@/components/dashboard/next-action-link"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/utils"
import type { PerformanceWorkflowRecord } from "@/types/workflow"

function formatMoney(value: number | null) {
  if (value === null) {
    return "Not set"
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

export function PerformanceRecordsTable(props: {
  records: PerformanceWorkflowRecord[]
  emptyTitle?: string
  emptyDescription?: string
  emptyActions?: Array<{
    label: string
    href: string
    variant?: "default" | "outline" | "ghost"
  }>
}) {
  if (props.records.length === 0) {
    return (
      <EmptyStateCard
        title={props.emptyTitle ?? "No performance records yet"}
        description={
          props.emptyDescription ??
          "Add a manual record to start tracking clicks, conversions, and revenue by product or channel."
        }
        helperText="Performance records make the dashboard summaries and recommendations more useful."
        actions={
          props.emptyActions ?? [
            { label: "Record performance", href: "/dashboard/performance#record-performance", variant: "default" },
            { label: "Review products", href: "/dashboard/products", variant: "outline" },
          ]
        }
      />
    )
  }

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Performance records</CardTitle>
        <CardDescription>
          Persisted manual performance inputs linked to products and optional drafts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Draft</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Conversions</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Recorded</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="align-top">
                  <div className="space-y-1">
                    <div className="font-medium">{record.productName}</div>
                    <div className="text-sm text-muted-foreground">{record.productSlug}</div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant="outline">{record.channel}</Badge>
                </TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  {record.campaignName ?? "Not set"}
                </TableCell>
                <TableCell className="align-top">
                  <div className="space-y-1 text-sm">
                    <div>{record.draftTitle ?? "No draft linked"}</div>
                    {record.draftTemplateType ? (
                      <div className="text-muted-foreground">
                        {record.draftTemplateType.replace("_", " ")}
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="align-top">{record.clicks}</TableCell>
                <TableCell className="align-top">{record.conversions ?? "Not set"}</TableCell>
                <TableCell className="align-top">{formatMoney(record.revenue)}</TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <div>{formatDateTime(record.recordedAt)}</div>
                    <div className="flex flex-wrap gap-1">
                      {record.signals.map((signal) => (
                        <Badge key={signal} variant="outline">
                          {signal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <NextActionLink action={record.nextAction} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
