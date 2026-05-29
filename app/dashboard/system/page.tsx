import { CheckCircle2, CircleAlert, Rocket, Shield, Wrench } from "lucide-react"

import { DemoDataCard } from "@/components/dashboard/demo-data-card"
import { LaunchChecklistCard } from "@/components/dashboard/launch-checklist-card"
import { ModeBanner } from "@/components/dashboard/mode-banner"
import { OnboardingChecklistCard } from "@/components/dashboard/onboarding-checklist"
import { PageHeader } from "@/components/dashboard/page-header"
import { TrialReadinessCard } from "@/components/dashboard/trial-readiness-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getOperatorExperience } from "@/lib/system"
import type { IntegrationStatusDetail } from "@/types/system"

export const dynamic = "force-dynamic"

const statusVariantMap = {
  configured: "default",
  missing: "destructive",
  placeholder: "secondary",
  invalid: "destructive",
} as const

const checkLabelMap = {
  ready: "Ready",
  blocked: "Blocked",
  error: "Check failed",
  fallback: "Fallback active",
} as const

function IntegrationCard({ integration }: { integration: IntegrationStatusDetail }) {
  const missingKeys =
    integration.missingKeys.length > 0 ? integration.missingKeys.join(", ") : null
  const placeholderKeys =
    integration.placeholderKeys.length > 0 ? integration.placeholderKeys.join(", ") : null

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{integration.label}</CardTitle>
          <Badge variant={statusVariantMap[integration.status]}>
            {integration.status}
          </Badge>
          <Badge variant="outline">{checkLabelMap[integration.checkStatus]}</Badge>
        </div>
        <CardDescription>{integration.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
          {integration.checkMessage}
        </div>

        {missingKeys ? (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Missing keys:</span> {missingKeys}
          </div>
        ) : null}

        {placeholderKeys ? (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Placeholder keys:</span>{" "}
            {placeholderKeys}
          </div>
        ) : null}

        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Next step:</span> {integration.guidance}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function SystemPage() {
  const operatorExperience = await getOperatorExperience()
  const systemStatus = operatorExperience.systemStatus
  const supabase = systemStatus.integrations.find((item) => item.name === "supabase")
  const accessGate = systemStatus.integrations.find((item) => item.name === "access_gate")
  const wordpress = systemStatus.integrations.find((item) => item.name === "wordpress")
  const ai = systemStatus.integrations.find((item) => item.name === "ai")
  const readyForVercelStaging =
    supabase?.checkStatus === "ready" && accessGate?.checkStatus === "ready"

  return (
    <>
      <PageHeader
        eyebrow="Stage 14"
        title="System"
        description="Configuration readiness, staging launch checklist, demo visibility, and operator handoff for the first controlled trial."
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <ModeBanner mode={operatorExperience.mode} />
        <TrialReadinessCard handoff={operatorExperience.trialHandoff} />
      </section>

      <LaunchChecklistCard
        checklist={operatorExperience.launchChecklist}
        progress={operatorExperience.trialProgress}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <OnboardingChecklistCard
          checklist={operatorExperience.checklist}
          title="Operator onboarding"
          description="Track setup and the first real usage cycle from environment values through performance tracking."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <DemoDataCard demoData={operatorExperience.demoData} />
        <OnboardingChecklistCard
          checklist={operatorExperience.verificationChecklist}
          title="Staging verification checklist"
          description="Use this checklist to confirm the environment has been exercised for a real staged trial."
        />
      </section>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="size-4" />
              Vercel staging readiness
            </CardTitle>
            <CardDescription>
              Staging requires Supabase and the single-operator access gate. WordPress and AI API keys remain optional.
            </CardDescription>
          </div>
          <Badge variant={readyForVercelStaging ? "default" : "destructive"}>
            {readyForVercelStaging ? "Ready" : "Not ready"}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <p className="font-medium text-foreground">Access gate</p>
            <p className="mt-2 text-muted-foreground">
              {accessGate?.checkStatus === "ready"
                ? "Configured. Dashboard routes require login."
                : "Set APP_ACCESS_PASSWORD and APP_SESSION_SECRET before hosting."}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <p className="font-medium text-foreground">Supabase</p>
            <p className="mt-2 text-muted-foreground">
              {supabase?.checkStatus === "ready"
                ? "Configured and reachable."
                : "Required for persisted products, drafts, performance, and reports."}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <p className="font-medium text-foreground">WordPress</p>
            <p className="mt-2 text-muted-foreground">
              {wordpress?.checkStatus === "ready"
                ? "Optional draft queue is configured."
                : "Optional. Leave blank for WordPress-free staging."}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <p className="font-medium text-foreground">AI API keys</p>
            <p className="mt-2 text-muted-foreground">
              {ai?.checkStatus === "ready"
                ? "Optional live in-app generation is configured."
                : "Optional. Claude Code assisted/manual mode is supported."}
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Configured</CardTitle>
              <CardDescription>Integrations with real, non-placeholder values.</CardDescription>
            </div>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{systemStatus.configuredCount}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Needs setup</CardTitle>
              <CardDescription>Integrations still blocked by missing, placeholder, or invalid values.</CardDescription>
            </div>
            <CircleAlert className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{systemStatus.blockingCount}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Manual control</CardTitle>
              <CardDescription>Publishing stays gated behind approval. WordPress is optional.</CardDescription>
            </div>
            <Shield className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No live publish path exists. Failed readiness checks block actions cleanly.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {systemStatus.integrations.map((integration) => (
          <IntegrationCard key={integration.name} integration={integration} />
        ))}
      </section>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>What blocks the next step</CardTitle>
          <CardDescription>
            Human-readable blockers derived from current integration checks and onboarding progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {operatorExperience.blockers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hard blockers are visible right now. Continue through the onboarding checklist or operator loop.
            </p>
          ) : (
            operatorExperience.blockers.map((blocker) => (
              <div
                key={blocker}
                className="rounded-lg border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground"
              >
                {blocker}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Verification checklist</CardTitle>
            <CardDescription>Use this before running a live Supabase workflow test on staging.</CardDescription>
          </div>
          <Wrench className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <p>1. Confirm migrations 001 through 004 are applied to the target Supabase project.</p>
          <p>2. Fill `.env.local` with real Supabase values and restart the app.</p>
          <p>3. AI API keys are optional. Use Claude Code or manual draft creation.</p>
          <p>4. Run `supabase/seed.sql` only if you need a clearly marked demo dataset for local or staging review.</p>
          <p>5. Run the product → draft → approval → performance entry flow end to end.</p>
          <p>6. (Optional) Configure WordPress credentials only when you have a test site ready.</p>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Deployment handoff</CardTitle>
          <CardDescription>
            Keep the first hosted deployment staging-first, with manual approvals unchanged. WordPress is optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <p className="font-medium text-foreground">Ready for hosting</p>
            <p className="mt-2">
              Build, tests, and runtime fallbacks are in place. Supabase is environment-driven and server-side. WordPress and AI API keys are optional.
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <p className="font-medium text-foreground">Still manual by design</p>
            <p className="mt-2">
              Draft approval and performance entry remain operator-triggered. No auto-publish path exists.
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/70 p-3">
            <p className="font-medium text-foreground">Test first after deploy</p>
            <p className="mt-2">
              Create one product, generate one draft, approve it, then record one performance entry.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
