"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react"

import { importPerformanceRecordsAction } from "@/app/dashboard/performance/import/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { parsePerformanceCsv } from "@/lib/performance-import-parser"
import type { PerformanceImportContext, PerformanceImportResult } from "@/lib/performance-import-parser"

interface PerformanceImportFormProps {
  context: PerformanceImportContext
}

export function PerformanceImportForm({ context }: PerformanceImportFormProps) {
  const [raw, setRaw] = useState("")
  const [result, setResult] = useState<PerformanceImportResult | null>(null)

  function handleParse() {
    if (!raw.trim()) return
    setResult(parsePerformanceCsv(raw, context))
  }

  function handleClear() {
    setRaw("")
    setResult(null)
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Paste performance data</CardTitle>
          <CardDescription>
            Paste CSV or tab-separated rows including a header row. Click Preview to validate before importing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="importCsv">Performance data</Label>
            <Textarea
              id="importCsv"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={10}
              placeholder="product_slug,channel,clicks,conversions,revenue,date&#10;my-product,email,120,8,45.00,2026-05-01"
              className="font-mono text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleParse} disabled={!raw.trim()}>
              <Upload className="size-4" />
              Preview import
            </Button>
            {result ? (
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {result ? (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Total rows</CardDescription>
                <CardTitle className="text-2xl">{result.totalRows}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-emerald-900/80">Valid</CardDescription>
                <CardTitle className="text-2xl text-emerald-900">{result.validRows.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className={result.errors.length > 0 ? "border-destructive/30 bg-destructive/5 shadow-sm" : "border-border/70 bg-card/90 shadow-sm"}>
              <CardHeader className="pb-2">
                <CardDescription>Errors</CardDescription>
                <CardTitle className="text-2xl">{result.errors.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Errors */}
          {result.errors.length > 0 ? (
            <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4 text-destructive" />
                  Validation errors
                </CardTitle>
                <CardDescription className="text-destructive/80">
                  These rows will not be imported. Fix the data and try again.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">Row {err.rowIndex}</Badge>
                      <span className="font-medium">{err.field}:</span>
                      <span className="text-muted-foreground">{err.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Valid rows preview */}
          {result.validRows.length > 0 ? (
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Valid performance records to import ({result.validRows.length})
                </CardTitle>
                <CardDescription>
                  These records will be created in Supabase when you click Import.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                        <TableHead className="text-right">Conversions</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.validRows.map((row) => (
                        <TableRow key={row.rowIndex}>
                          <TableCell className="text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                          <TableCell className="font-medium text-sm">{row.productName}</TableCell>
                          <TableCell className="text-xs">{row.channel}</TableCell>
                          <TableCell className="text-xs">{row.campaignName ?? "-"}</TableCell>
                          <TableCell className="text-xs text-right">{row.clicks}</TableCell>
                          <TableCell className="text-xs text-right">{row.conversions ?? "-"}</TableCell>
                          <TableCell className="text-xs text-right">{row.revenue !== null ? `$${row.revenue.toFixed(2)}` : "-"}</TableCell>
                          <TableCell className="text-xs">{row.recordedAt ? new Date(row.recordedAt).toLocaleDateString() : "-"}</TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{row.notes ?? "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <form action={importPerformanceRecordsAction} className="mt-4">
                  <input type="hidden" name="rows" value={JSON.stringify(result.validRows)} />
                  <Button type="submit">
                    Import {result.validRows.length} record{result.validRows.length === 1 ? "" : "s"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
