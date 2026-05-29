"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react"

import { importProductsAction } from "@/app/dashboard/products/import/actions"
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
import { parseProductCsv } from "@/lib/product-import-parser"
import type { ProductImportResult } from "@/lib/product-import-parser"

export function ProductImportForm() {
  const [raw, setRaw] = useState("")
  const [result, setResult] = useState<ProductImportResult | null>(null)

  function handleParse() {
    if (!raw.trim()) return
    setResult(parseProductCsv(raw))
  }

  function handleClear() {
    setRaw("")
    setResult(null)
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Paste product data</CardTitle>
          <CardDescription>
            Paste CSV or tab-separated rows including a header row. Click Preview to validate before importing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="importCsv">Product data</Label>
            <Textarea
              id="importCsv"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={10}
              placeholder="name,slug,affiliate_url,brand,category,price&#10;Product A,product-a,https://example.com/a,BrandX,Electronics,29.99"
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
          <div className="grid gap-4 md:grid-cols-4">
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
            <Card className={result.duplicateSlugs.length > 0 ? "border-amber-200 bg-amber-50 shadow-sm" : "border-border/70 bg-card/90 shadow-sm"}>
              <CardHeader className="pb-2">
                <CardDescription>Duplicate slugs</CardDescription>
                <CardTitle className="text-2xl">{result.duplicateSlugs.length}</CardTitle>
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
                  Valid products to import ({result.validRows.length})
                </CardTitle>
                <CardDescription>
                  These products will be created. Existing products with the same slug will be skipped during import.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Keyword</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.validRows.map((row) => (
                        <TableRow key={row.rowIndex}>
                          <TableCell className="text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                          <TableCell className="font-medium text-sm">{row.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.slug}</TableCell>
                          <TableCell className="text-xs">{row.brand ?? "-"}</TableCell>
                          <TableCell className="text-xs">{row.category ?? "-"}</TableCell>
                          <TableCell className="text-xs max-w-[160px] truncate">{row.affiliateUrl}</TableCell>
                          <TableCell className="text-xs">{row.price !== null ? `$${row.price}` : "-"}</TableCell>
                          <TableCell className="text-xs">{row.commissionRate !== null ? `${(row.commissionRate * 100).toFixed(0)}%` : "-"}</TableCell>
                          <TableCell className="text-xs">{row.targetKeyword ?? "-"}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === "active" ? "default" : "secondary"} className="text-xs">
                              {row.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <form action={importProductsAction} className="mt-4">
                  <input type="hidden" name="rows" value={JSON.stringify(result.validRows)} />
                  <Button type="submit">
                    Import {result.validRows.length} product{result.validRows.length === 1 ? "" : "s"}
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
