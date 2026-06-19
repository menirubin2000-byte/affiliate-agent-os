"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { OPERATOR_SESSION_COOKIE, verifyOperatorSessionToken } from "@/lib/operator-auth"
import { publishLinkedInJobViaOfficialApi } from "@/lib/linkedin-publisher"
import {
  importPublishLogsAndReconcileGaps,
  recordVerifiedManualPublishForJob,
} from "@/lib/manual-publish-reconciliation"
import { publishMetaJobViaOfficialApi } from "@/lib/meta-publisher"
import { confirmPreparedPublishJobForExecution } from "@/lib/publish-jobs-db"

export async function confirmPreparedPublishJobAction(formData: FormData) {
  const cookieStore = await cookies()
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value
  if (!(await verifyOperatorSessionToken(token))) {
    redirect("/login?next=%2Fdashboard%2Fhe%2Fpublish-ready")
  }

  const jobId = String(formData.get("jobId") ?? "")
  if (!jobId) redirect("/dashboard/he/publish-ready?error=missing_job")

  try {
    await confirmPreparedPublishJobForExecution(jobId)
  } catch (error) {
    redirect(
      `/dashboard/he/publish-ready?error=${encodeURIComponent(
        error instanceof Error ? error.message : "confirmation_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard/he/publish-ready")
  revalidatePath("/dashboard/he/browser-control")
  redirect("/dashboard/he/publish-ready?confirmed=1")
}

export async function confirmLinkedInOfficialPublishAction(formData: FormData) {
  const cookieStore = await cookies()
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value
  if (!(await verifyOperatorSessionToken(token))) {
    redirect("/login?next=%2Fdashboard%2Fhe%2Fpublish-ready")
  }

  const jobId = String(formData.get("jobId") ?? "")
  if (!jobId) redirect("/dashboard/he/publish-ready?error=missing_job")

  try {
    await publishLinkedInJobViaOfficialApi(jobId)
  } catch (error) {
    redirect(
      `/dashboard/he/publish-ready?error=${encodeURIComponent(
        error instanceof Error ? error.message : "linkedin_publish_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard/he/publish-ready")
  redirect("/dashboard/he/publish-ready?linkedin_published=1")
}

export async function confirmMetaOfficialPublishAction(formData: FormData) {
  const cookieStore = await cookies()
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value
  if (!(await verifyOperatorSessionToken(token))) {
    redirect("/login?next=%2Fdashboard%2Fhe%2Fpublish-ready")
  }

  const jobId = String(formData.get("jobId") ?? "")
  if (!jobId) redirect("/dashboard/he/publish-ready?error=missing_job")

  try {
    await publishMetaJobViaOfficialApi(jobId)
  } catch (error) {
    redirect(
      `/dashboard/he/publish-ready?error=${encodeURIComponent(
        error instanceof Error ? error.message : "meta_publish_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard/he/publish-ready")
  redirect("/dashboard/he/publish-ready?meta_published=1")
}

export async function recordManualPublishUrlAction(formData: FormData) {
  const cookieStore = await cookies()
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value
  if (!(await verifyOperatorSessionToken(token))) {
    redirect("/login?next=%2Fdashboard%2Fhe%2Fpublish-ready")
  }

  const jobId = String(formData.get("jobId") ?? "")
  const liveUrl = String(formData.get("liveUrl") ?? "").trim()
  if (!jobId) redirect("/dashboard/he/publish-ready?error=missing_job")
  if (!liveUrl) redirect("/dashboard/he/publish-ready?error=missing_live_url")

  try {
    await recordVerifiedManualPublishForJob({
      jobId,
      liveUrl,
    })
  } catch (error) {
    redirect(
      `/dashboard/he/publish-ready?error=${encodeURIComponent(
        error instanceof Error ? error.message : "manual_publish_record_failed",
      )}`,
    )
  }

  revalidatePath("/dashboard/he/publish-ready")
  revalidatePath("/dashboard/he/approve")
  redirect("/dashboard/he/publish-ready?manual_url_recorded=1")
}

export async function runManualPublishReconciliationAction() {
  const cookieStore = await cookies()
  const token = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value
  if (!(await verifyOperatorSessionToken(token))) {
    redirect("/login?next=%2Fdashboard%2Fhe%2Fpublish-ready")
  }

  try {
    const result = await importPublishLogsAndReconcileGaps()
    revalidatePath("/dashboard/he/publish-ready")
    revalidatePath("/dashboard/he/approve")
    redirect(
      `/dashboard/he/publish-ready?reconciled=1&imported=${result.importedCount}&existing=${result.alreadyRecordedCount}&synced=${result.sync.publishJobsUpdated}&queues=${result.sync.queuesUpdated}&skipped=${result.skippedCount}&invalid=${result.invalidCount}`,
    )
  } catch (error) {
    redirect(
      `/dashboard/he/publish-ready?error=${encodeURIComponent(
        error instanceof Error ? error.message : "manual_publish_reconciliation_failed",
      )}`,
    )
  }
}
