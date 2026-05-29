import type {
  ImprovementTask,
  ImprovementTaskPriority,
  ImprovementTaskStatus,
  ImprovementTaskSummary,
} from "@/types/improvement-task"

const priorityOrder: Record<ImprovementTaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const statusOrder: Record<ImprovementTaskStatus, number> = {
  in_progress: 0,
  open: 1,
  done: 2,
  dismissed: 3,
}

export function sortImprovementTasks(tasks: ImprovementTask[]): ImprovementTask[] {
  return [...tasks].sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status]
    if (statusDiff !== 0) return statusDiff
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

export function buildDuplicateKey(sourceType: string, title: string): string {
  return `${sourceType}:${title}`
}

export function findDuplicateTask(
  tasks: ImprovementTask[],
  sourceType: string,
  title: string,
): ImprovementTask | undefined {
  const key = buildDuplicateKey(sourceType, title)
  return tasks.find(
    (t) =>
      t.status !== "done" &&
      t.status !== "dismissed" &&
      buildDuplicateKey(t.sourceType, t.title) === key,
  )
}

export function isValidStatusTransition(
  from: ImprovementTaskStatus,
  to: ImprovementTaskStatus,
): boolean {
  if (from === to) return false
  if (from === "open" && (to === "in_progress" || to === "dismissed")) return true
  if (from === "in_progress" && (to === "done" || to === "dismissed")) return true
  if (from === "done") return false
  if (from === "dismissed") return false
  return false
}

export function summarizeImprovementTasks(tasks: ImprovementTask[]): ImprovementTaskSummary {
  return {
    total: tasks.length,
    open: tasks.filter((t) => t.status === "open").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    dismissed: tasks.filter((t) => t.status === "dismissed").length,
    critical: tasks.filter(
      (t) => t.priority === "critical" && t.status !== "done" && t.status !== "dismissed",
    ).length,
  }
}
