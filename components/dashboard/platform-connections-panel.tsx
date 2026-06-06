import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PlatformConnection, PlatformConnectionProvider } from "@/types/platform-connection"

const PROVIDER_LABELS: Record<PlatformConnectionProvider, string> = {
  linkedin: "LinkedIn",
  medium: "Medium",
  substack: "Substack",
  facebook_page: "Facebook Page",
  instagram_professional: "Instagram Business",
  pinterest: "Pinterest",
  x: "X / Twitter",
  youtube: "YouTube",
  quora: "Quora",
  reddit: "Reddit",
  tiktok: "TikTok",
}

const ALL_PROVIDERS: PlatformConnectionProvider[] = [
  "linkedin",
  "medium",
  "substack",
  "facebook_page",
  "instagram_professional",
  "pinterest",
  "x",
  "youtube",
  "quora",
  "reddit",
  "tiktok",
]

function statusBadge(status: string | "missing") {
  if (status === "connected") return <Badge variant="default">מחובר</Badge>
  if (status === "api_access_not_ready") return <Badge variant="outline">חיכה לאישור API</Badge>
  if (status === "requires_reconnect") return <Badge variant="destructive">דרוש חיבור מחדש</Badge>
  if (status === "not_connected") return <Badge variant="outline">לא מחובר</Badge>
  return <Badge variant="outline">לא נרשם</Badge>
}

export function PlatformConnectionsPanel({
  connections,
}: {
  connections: PlatformConnection[]
}) {
  const byProvider = new Map<string, PlatformConnection>()
  for (const con of connections) byProvider.set(con.provider, con)

  const connectedCount = connections.filter((c) => c.status === "connected").length

  return (
    <Card>
      <CardHeader>
        <CardTitle>חיבורי פלטפורמות</CardTitle>
        <CardDescription>
          מה מחובר בפועל לפי <code>platform_connections</code>. {connectedCount}/{ALL_PROVIDERS.length} פלטפורמות מחוברות.
          רשומות אלה מתעדכנות אוטומטית על ידי <code>node scripts/backfill-fb-ig-published.js</code>
          {" "}או על ידי תהליכי OAuth ייעודיים.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {ALL_PROVIDERS.map((provider) => {
            const con = byProvider.get(provider)
            const status = con?.status ?? "missing"
            const accountLabel = (con?.metadata?.account_label as string | undefined) ?? null
            const updated = con?.updatedAt ? new Date(con.updatedAt).toLocaleDateString("he-IL") : null
            return (
              <div
                key={provider}
                className="flex items-start justify-between gap-2 rounded border p-2 text-sm"
              >
                <div className="flex-1">
                  <div className="font-medium">{PROVIDER_LABELS[provider]}</div>
                  {accountLabel ? (
                    <div className="text-xs text-muted-foreground">@{accountLabel}</div>
                  ) : null}
                  {con?.scopes?.length ? (
                    <div className="text-xs text-muted-foreground">
                      scopes: {con.scopes.slice(0, 3).join(", ")}
                      {con.scopes.length > 3 ? ` +${con.scopes.length - 3}` : ""}
                    </div>
                  ) : null}
                  {updated ? (
                    <div className="text-xs text-muted-foreground">עודכן: {updated}</div>
                  ) : null}
                </div>
                <div>{statusBadge(status)}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
