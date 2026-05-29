export type IntegrationName = "supabase" | "access_gate" | "ai" | "wordpress"

export type IntegrationReadinessStatus =
  | "configured"
  | "missing"
  | "placeholder"
  | "invalid"

export interface IntegrationReadiness {
  name: IntegrationName
  label: string
  status: IntegrationReadinessStatus
  summary: string
  guidance: string
  requiredKeys: string[]
  missingKeys: string[]
  placeholderKeys: string[]
}

export type IntegrationCheckStatus = "ready" | "blocked" | "error" | "fallback"

export interface IntegrationStatusDetail extends IntegrationReadiness {
  checkStatus: IntegrationCheckStatus
  checkMessage: string
}

export interface SystemReadiness {
  integrations: IntegrationReadiness[]
  configuredCount: number
  blockingCount: number
}

export interface SystemStatus {
  integrations: IntegrationStatusDetail[]
  configuredCount: number
  blockingCount: number
}

export type OnboardingStepStatus = "not_started" | "in_progress" | "complete" | "blocked"

export interface OnboardingStep {
  id: string
  title: string
  description: string
  status: OnboardingStepStatus
  actionLabel: string
  actionHref: string
  detail: string
}

export interface OnboardingChecklist {
  steps: OnboardingStep[]
  completedCount: number
  totalCount: number
  blockingCount: number
}

export interface VerificationChecklist {
  steps: OnboardingStep[]
  completedCount: number
  totalCount: number
  blockingCount: number
}

export type LaunchChecklistStatus = "not_started" | "ready" | "blocked" | "complete"

export interface LaunchChecklistStep {
  id: string
  title: string
  description: string
  status: LaunchChecklistStatus
  actionLabel: string
  actionHref: string
  detail: string
}

export interface LaunchChecklist {
  steps: LaunchChecklistStep[]
  completedCount: number
  readyCount: number
  totalCount: number
  blockingCount: number
}

export interface TrialProgress {
  completedWorkflowSteps: number
  totalWorkflowSteps: number
  percentComplete: number
  nextActionLabel: string
  nextActionHref: string
  summary: string
}

export type OperatorMode = "setup" | "limited" | "ready"

export interface OperatorModeSummary {
  mode: OperatorMode
  title: string
  description: string
  actionLabel: string
  actionHref: string
}

export interface DemoDataStatus {
  isLoaded: boolean
  productCount: number
  draftCount: number
  publishingJobCount: number
  performanceRecordCount: number
  title: string
  description: string
  actionLabel: string
  actionHref: string
}

export interface TrialHandoff {
  ready: boolean
  title: string
  description: string
  actionLabel: string
  actionHref: string
  testOrder: string[]
  stagingNotes: string[]
}

export interface OperatorExperience {
  systemStatus: SystemStatus
  checklist: OnboardingChecklist
  verificationChecklist: VerificationChecklist
  launchChecklist: LaunchChecklist
  trialProgress: TrialProgress
  demoData: DemoDataStatus
  trialHandoff: TrialHandoff
  blockers: string[]
  mode: OperatorModeSummary
}
