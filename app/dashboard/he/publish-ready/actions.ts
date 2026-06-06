"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { OPERATOR_SESSION_COOKIE, verifyOperatorSessionToken } from "@/lib/operator-auth"
import { publishLinkedInJobViaOfficialApi } from "@/lib/linkedin-publisher"
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
