import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PlatformRoutingDefinition } from "@/lib/platform-routing"

function mediaBadge(level: "supported" | "required" | "unsupported" | undefined) {
  if (level === "required") return <Badge variant="default">חובה</Badge>
  if (level === "supported") return <Badge variant="secondary">תומך</Badge>
  if (level === "unsupported") return <Badge variant="outline">לא נתמך</Badge>
  return <Badge variant="outline">—</Badge>
}

function textBadge(textOnly: boolean | undefined) {
  if (textOnly === undefined) return <Badge variant="outline">—</Badge>
  return textOnly ? (
    <Badge variant="secondary">מותר טקסט</Badge>
  ) : (
    <Badge variant="destructive">אסור טקסט בלבד</Badge>
  )
}

/**
 * Read-only matrix of which platforms accept text / image / video.
 * Data is the static media field on PlatformRoutingDefinition — no DB call.
 */
export function PlatformCapabilitiesPanel({ platforms }: { platforms: PlatformRoutingDefinition[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>יכולות פרסום פר פלטפורמה</CardTitle>
        <CardDescription>
          איפה אפשר לשלוח טקסט בלבד, איפה תמונה מומלצת, ואיפה תמונה/וידאו חובה. הצינור של הפרסום אמור לכבד את זה אוטומטית
          לפני שהוא שולח.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-1 pr-2 text-right">פלטפורמה</th>
                <th className="py-1 pr-2 text-right">טקסט בלבד</th>
                <th className="py-1 pr-2 text-right">תמונה</th>
                <th className="py-1 pr-2 text-right">וידאו</th>
                <th className="py-1 pr-2 text-right">הערה</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((p) => (
                <tr key={p.key} className="border-b last:border-0">
                  <td className="py-1 pr-2 font-medium">{p.hebrewName}</td>
                  <td className="py-1 pr-2">{textBadge(p.media?.textOnly)}</td>
                  <td className="py-1 pr-2">{mediaBadge(p.media?.image)}</td>
                  <td className="py-1 pr-2">{mediaBadge(p.media?.video)}</td>
                  <td className="py-1 pr-2 text-xs text-muted-foreground">{p.media?.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
