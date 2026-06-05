import { CheckCircle2, CircleAlert, ExternalLink, ShieldCheck } from "lucide-react"
import type { ReactNode } from "react"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getPlatformCapabilities } from "@/lib/platform-capabilities"
import { getPlatformConnection } from "@/lib/platform-connections-db"
import type {
  AffiliateContentPolicy,
  PlatformConnectionStatus,
  SafeExecutorPath,
} from "@/types/platform-capability"
import type {
  PlatformConnection,
  PlatformConnectionStatus as StoredConnectionStatus,
} from "@/types/platform-connection"

export const dynamic = "force-dynamic"

const connectionLabels: Record<PlatformConnectionStatus, string> = {
  requires_official_connection: "נדרש חיבור רשמי",
  connected: "מחובר",
  blocked: "חסום",
}

const affiliateLabels: Record<AffiliateContentPolicy, string> = {
  allowed_with_disclosure: "מותר עם גילוי נאות",
  restricted: "מוגבל",
  prohibited: "אסור",
}

const executorLabels: Record<SafeExecutorPath, string> = {
  official_api_only: "API רשמי בלבד",
  browser_helper_allowed: "Browser Helper מותר",
  not_available: "אין נתיב בטוח",
}

const xStoredStatusLabels: Record<StoredConnectionStatus, string> = {
  not_connected: "לא מחובר",
  connected: "מחובר",
  requires_reconnect: "דורש חיבור מחדש",
  api_access_not_ready: "API לא מוכן",
}

function getXConnectionStatus(connection: PlatformConnection | null): StoredConnectionStatus {
  return connection?.status ?? "not_connected"
}

function getXBlockingReason(status: StoredConnectionStatus) {
  if (status === "api_access_not_ready") {
    return "חסום - X_API_ACCESS_READY=false. החשבון יכול להיות מחובר, אבל פרסום דרך X API נשאר כבוי עד שיש גישת API/קרדיטים פעילים."
  }
  if (status === "requires_reconnect") {
    return "דורש חיבור מחדש - תוקף החיבור פג או שהמערכת צריכה OAuth חדש."
  }
  if (status === "not_connected") {
    return "לא מחובר - MENI צריך ללחוץ על חבר X רשמי ולהשלים OAuth."
  }
  return "מחובר, אבל פרסום עדיין חסום עד ש-X_API_ACCESS_READY=true והמערכת תקבל אישור מפורש להפעלת פרסום."
}

export default async function PlatformCapabilitiesPage() {
  const [xConnection] = await Promise.all([getPlatformConnection("x")])
  const capabilities = getPlatformCapabilities()
  const xStoredStatus = getXConnectionStatus(xConnection)

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        eyebrow="מחקר יכולות פרסום"
        title="יכולות פלטפורמה"
        description="סטטוס מחקר וחיבור בלבד. המסך לא יוצר פוסטים, עבודות פרסום או רשומות פרסום. MENI רק מחבר חשבון או מאשר אחרי שנתיב רשמי מוכן."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={<CheckCircle2 className="size-4" />} label="API רשמי" value={capabilities.length} />
        <SummaryCard
          icon={<CircleAlert className="size-4" />}
          label="דורש חיבור"
          value={capabilities.filter((item) => item.connectionStatus === "requires_official_connection").length}
        />
        <SummaryCard
          icon={<ShieldCheck className="size-4" />}
          label="Browser Helper בטוח"
          value={capabilities.filter((item) => item.browserHelperAllowed).length}
        />
      </section>

      <section className="space-y-4">
        {capabilities.map((capability) => {
          const isX = capability.platform === "x_twitter"

          return (
            <Card key={capability.platform}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{capability.label}</CardTitle>
                    <CardDescription>נבדק בתאריך {capability.checkedAt}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>API רשמי קיים</Badge>
                    <Badge variant="destructive">{connectionLabels[capability.connectionStatus]}</Badge>
                    <Badge variant="outline">{affiliateLabels[capability.affiliateContentPolicy]}</Badge>
                    {isX ? <Badge variant="secondary">{xStoredStatusLabels[xStoredStatus]}</Badge> : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <CapabilityDetail label="סוג חשבון נדרש" value={capability.requiredAccountType} />
                  <CapabilityDetail label="נתיב ביצוע בטוח" value={executorLabels[capability.safeExecutorPath]} />
                  <CapabilityDetail label="מדיניות Affiliate" value={capability.affiliatePolicyNotes} />
                  <CapabilityDetail label="Browser Helper" value={capability.browserHelperNotes} />
                </div>

                {isX ? (
                  <XConnectionPanel connection={xConnection} status={xStoredStatus} />
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                  <ListBlock title="הרשאות נדרשות" items={capability.requiredPermissions} />
                  <ListBlock title="חסמים נוכחיים" items={capability.blockers} destructive />
                </div>

                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
                  <span className="font-medium">הפעולה היחידה של MENI בעתיד: </span>
                  {capability.nextOperatorAction}
                </div>

                {isX ? (
                  <a
                    href="/api/auth/x/connect"
                    className="inline-flex rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    חבר X רשמי
                  </a>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  {capability.sourceUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      מקור רשמי
                      <ExternalLink className="size-3" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>
    </div>
  )
}

function XConnectionPanel({
  connection,
  status,
}: {
  connection: PlatformConnection | null
  status: StoredConnectionStatus
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium">סטטוס חיבור X</div>
          <div className="mt-1 text-muted-foreground">{getXBlockingReason(status)}</div>
        </div>
        <Badge variant={status === "connected" ? "secondary" : "destructive"}>
          {xStoredStatusLabels[status]}
        </Badge>
      </div>
      {connection ? (
        <div className="mt-3 grid gap-2 md:grid-cols-3" dir="ltr">
          <CapabilityDetail label="connected_at" value={connection.connectedAt ?? "not available"} />
          <CapabilityDetail label="expires_at" value={connection.expiresAt ?? "not provided"} />
          <CapabilityDetail
            label="refresh token"
            value={connection.refreshTokenPresent ? "present metadata only" : "not present"}
          />
        </div>
      ) : null}
      <div className="mt-3 text-xs text-muted-foreground">
        אסימונים לא מוצגים במסך ולא נשלפים בשדות ציבוריים.
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-3xl font-semibold">{value}</CardContent>
    </Card>
  )
}

function CapabilityDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}

function ListBlock({
  title,
  items,
  destructive = false,
}: {
  title: string
  items: string[]
  destructive?: boolean
}) {
  return (
    <div className="rounded-lg border p-3">
      <h3 className="font-medium">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item} className={destructive ? "text-destructive" : "text-muted-foreground"} dir="ltr">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
