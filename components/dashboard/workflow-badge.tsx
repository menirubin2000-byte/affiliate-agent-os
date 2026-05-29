import { Badge } from "@/components/ui/badge"
import type { WorkflowLabel } from "@/types/workflow"

const workflowCopy: Record<
  WorkflowLabel,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  needs_draft: { label: "Needs draft", variant: "destructive" },
  draft_ready: { label: "Draft ready", variant: "outline" },
  awaiting_approval: { label: "Awaiting approval", variant: "secondary" },
  approved_not_queued: { label: "Approved, not queued", variant: "secondary" },
  queued_to_wordpress: { label: "Queued to WordPress", variant: "default" },
  wordpress_failed: { label: "WordPress failed", variant: "destructive" },
  published_draft_pending_performance: {
    label: "Pending performance",
    variant: "secondary",
  },
  performance_tracked: { label: "Performance tracked", variant: "default" },
}

export function WorkflowBadge({ workflow }: { workflow: WorkflowLabel }) {
  const config = workflowCopy[workflow]

  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function getWorkflowLabel(workflow: WorkflowLabel) {
  return workflowCopy[workflow].label
}

