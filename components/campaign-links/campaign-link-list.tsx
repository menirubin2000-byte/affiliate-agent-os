import Link from "next/link"
import { Archive, Copy, ExternalLink, FolderOpen, RotateCcw } from "lucide-react"

import { archiveCampaignLinkAction } from "@/app/dashboard/campaign-links/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { CampaignLink } from "@/types/campaign-link"

function CopyUrlButton({ url }: { url: string }) {
  return (
    <span
      className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      title="Copy final URL"
    >
      <Copy className="size-3" />
      <span className="max-w-[200px] truncate font-mono">{url}</span>
    </span>
  )
}

export function CampaignLinkList(props: {
  links: CampaignLink[]
  compact?: boolean
}) {
  const { links, compact } = props

  if (links.length === 0) {
    return (
      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Campaign links</CardTitle>
          <CardDescription>
            No campaign links yet. Create one using the form above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dashboard/campaign-links#create-campaign-link"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ExternalLink className="size-4" />
            Create first campaign link
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {links.map((link, index) => (
          <div key={link.id}>
            {index > 0 ? <Separator className="mb-3" /> : null}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{link.name}</span>
                  <Badge variant={link.status === "active" ? "default" : "secondary"} className="text-xs">{link.status}</Badge>
                  <Badge variant="outline" className="text-xs">{link.channel}</Badge>
                  {link.campaignName ? (
                    <Badge variant="outline" className="text-xs">{link.campaignName}</Badge>
                  ) : null}
                </div>
                <CopyUrlButton url={link.finalUrl} />
              </div>
              <div className="flex gap-1">
                {link.status === "active" ? (
                  <form action={archiveCampaignLinkAction}>
                    <input type="hidden" name="linkId" value={link.id} />
                    <input type="hidden" name="status" value="archived" />
                    <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
                      <Archive className="size-3" />
                    </Button>
                  </form>
                ) : (
                  <form action={archiveCampaignLinkAction}>
                    <input type="hidden" name="linkId" value={link.id} />
                    <input type="hidden" name="status" value="active" />
                    <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
                      <RotateCcw className="size-3" />
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Campaign links ({links.length})</CardTitle>
        <CardDescription>
          Trackable affiliate URLs with UTM parameters. Copy the final URL for use in campaigns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Final URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium text-sm">{link.name}</TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/products/${link.productId}`}
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <FolderOpen className="size-3" />
                      {link.productName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{link.channel}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {link.campaignName ?? "-"}
                  </TableCell>
                  <TableCell>
                    <CopyUrlButton url={link.finalUrl} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={link.status === "active" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {link.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {link.status === "active" ? (
                      <form action={archiveCampaignLinkAction} className="inline-flex">
                        <input type="hidden" name="linkId" value={link.id} />
                        <input type="hidden" name="status" value="archived" />
                        <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
                          <Archive className="size-3" />
                          Archive
                        </Button>
                      </form>
                    ) : (
                      <form action={archiveCampaignLinkAction} className="inline-flex">
                        <input type="hidden" name="linkId" value={link.id} />
                        <input type="hidden" name="status" value="active" />
                        <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
                          <RotateCcw className="size-3" />
                          Reactivate
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
