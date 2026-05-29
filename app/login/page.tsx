import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { LockKeyhole, ShieldAlert } from "lucide-react"

import { loginOperatorAction } from "@/app/login/actions"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAccessGateReadiness } from "@/lib/env"
import {
  OPERATOR_SESSION_COOKIE,
  verifyOperatorSessionToken,
} from "@/lib/operator-auth"

export const dynamic = "force-dynamic"

function getSafeNext(value: string | undefined) {
  return value?.startsWith("/dashboard") ? value : "/dashboard"
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    next?: string
    error?: string
    logged_out?: string
  }>
}) {
  const params = (await searchParams) ?? {}
  const next = getSafeNext(params.next)
  const readiness = getAccessGateReadiness()
  const cookieStore = await cookies()
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value

  if (await verifyOperatorSessionToken(token)) {
    redirect(next)
  }

  const setupMissing = readiness.status !== "configured"

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <div className="space-y-2 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Affiliate Agent OS
          </p>
          <h1 className="text-2xl font-semibold">Operator Login</h1>
          <p className="text-sm text-muted-foreground">
            Single-operator access gate for the dashboard.
          </p>
        </div>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <LockKeyhole className="size-4" />
                Access required
              </CardTitle>
              <Badge variant={setupMissing ? "destructive" : "default"}>
                {setupMissing ? "setup needed" : "configured"}
              </Badge>
            </div>
            <CardDescription>
              Enter the operator password configured in the server environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {params.error === "invalid" ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Invalid operator password.
              </div>
            ) : null}

            {params.logged_out ? (
              <div className="rounded-lg border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
                You have been logged out.
              </div>
            ) : null}

            {setupMissing ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Access gate setup is incomplete.</p>
                    <p className="mt-1">
                      Add `APP_ACCESS_PASSWORD` and `APP_SESSION_SECRET` to the server environment and restart the app. Do not commit real values.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form action={loginOperatorAction} className="space-y-4">
                <input type="hidden" name="next" value={next} />
                <div className="space-y-2">
                  <Label htmlFor="password">Operator password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className={buttonVariants({ variant: "default", className: "w-full" })}
                >
                  Log in
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          This is an MVP single-operator gate, not a multi-user auth or RLS system.
        </p>
      </div>
    </main>
  )
}
