import type { Draft, QualityChecks } from "@/types/draft"

export type ReadinessLevel = "ready" | "needs_review" | "not_ready"

export interface ReadinessIssue {
  label: string
  severity: "critical" | "warning"
}

export interface ApprovalReadiness {
  level: ReadinessLevel
  summary: string
  issues: ReadinessIssue[]
  passedChecks: number
  totalChecks: number
}

export function buildApprovalReadiness(draft: Draft): ApprovalReadiness {
  const issues: ReadinessIssue[] = []
  const qc = draft.qualityChecks

  if (!qc.has_disclosure) {
    issues.push({ label: "Missing affiliate disclosure", severity: "critical" })
  }

  if (!qc.has_clear_cta) {
    issues.push({ label: "Missing clear CTA", severity: "critical" })
  }

  if (!qc.has_required_structure) {
    issues.push({ label: "Missing required structure", severity: "critical" })
  }

  if (!qc.avoids_fake_claims) {
    issues.push({ label: "Contains flagged claims", severity: "critical" })
  }

  if (!qc.has_meta_title) {
    issues.push({ label: "Missing meta title", severity: "warning" })
  }

  if (!qc.has_meta_description) {
    issues.push({ label: "Missing meta description", severity: "warning" })
  }

  if (!qc.has_target_keyword) {
    issues.push({ label: "Missing target keyword", severity: "warning" })
  }

  const checkKeys: Array<keyof QualityChecks> = [
    "has_disclosure",
    "has_clear_cta",
    "has_target_keyword",
    "has_meta_title",
    "has_meta_description",
    "avoids_fake_claims",
    "has_required_structure",
  ]

  const passedChecks = checkKeys.filter((key) => qc[key]).length
  const totalChecks = checkKeys.length

  const hasCritical = issues.some((i) => i.severity === "critical")
  const hasWarning = issues.some((i) => i.severity === "warning")

  let level: ReadinessLevel
  let summary: string

  if (hasCritical) {
    level = "not_ready"
    summary = "This draft has critical issues that should be addressed before approval."
  } else if (hasWarning) {
    level = "needs_review"
    summary = "This draft is mostly ready but has minor issues to review."
  } else {
    level = "ready"
    summary = "All quality checks pass. This draft is ready for approval."
  }

  return { level, summary, issues, passedChecks, totalChecks }
}
