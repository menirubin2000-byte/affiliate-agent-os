"use client"

import { useState } from "react"
import { Building2 } from "lucide-react"

import { createAffiliateProgramAction } from "@/app/dashboard/affiliate-programs/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  APPROVAL_TYPE_LABELS,
  PROGRAM_STATUS_LABELS,
  VALID_APPROVAL_TYPES,
  VALID_PROGRAM_STATUSES,
} from "@/types/affiliate-program"
import type { Product } from "@/types/product"

export function AffiliateProgramForm(props: { products: Product[] }) {
  const [programName, setProgramName] = useState("")

  return (
    <Card id="create-affiliate-program" className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Add affiliate program</CardTitle>
        <CardDescription>
          Track an affiliate program for a product. Fill in what you know now —
          update status and details as the application progresses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createAffiliateProgramAction} className="grid gap-6">
          {/* Row 1: Program name + Product */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ap_program_name">Program name *</Label>
              <Input
                id="ap_program_name"
                name="program_name"
                placeholder="e.g. Jasper AI Affiliate Program"
                required
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ap_product_id">Product</Label>
              <select
                id="ap_product_id"
                name="product_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No product linked</option>
                {props.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Network + Commission + Cookie */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="ap_network">Network</Label>
              <Input
                id="ap_network"
                name="network"
                placeholder="e.g. Impact, ShareASale, Direct"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ap_commission_summary">Commission</Label>
              <Input
                id="ap_commission_summary"
                name="commission_summary"
                placeholder="e.g. 30% recurring, $50 per sale"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ap_cookie_duration">Cookie duration</Label>
              <Input
                id="ap_cookie_duration"
                name="cookie_duration"
                placeholder="e.g. 30 days, 90 days"
              />
            </div>
          </div>

          {/* Row 3: URLs */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="ap_program_url">Program info URL</Label>
              <Input
                id="ap_program_url"
                name="program_url"
                type="url"
                placeholder="https://example.com/affiliates"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ap_signup_url">Signup URL</Label>
              <Input
                id="ap_signup_url"
                name="signup_url"
                type="url"
                placeholder="https://example.com/affiliate-signup"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ap_dashboard_url">Dashboard URL</Label>
              <Input
                id="ap_dashboard_url"
                name="dashboard_url"
                type="url"
                placeholder="https://app.partner.com/dashboard"
              />
            </div>
          </div>

          {/* Row 4: Approval type + Status */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ap_approval_type">Approval type</Label>
              <select
                id="ap_approval_type"
                name="approval_type"
                defaultValue="unknown"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {VALID_APPROVAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {APPROVAL_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ap_status">Status</Label>
              <select
                id="ap_status"
                name="status"
                defaultValue="research_needed"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {VALID_PROGRAM_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PROGRAM_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Notes */}
          <div className="grid gap-2">
            <Label htmlFor="ap_notes">Notes</Label>
            <Textarea
              id="ap_notes"
              name="notes"
              rows={3}
              placeholder="Application status, special terms, contact info, etc."
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!programName.trim()}>
              <Building2 className="size-4" />
              Add program
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
