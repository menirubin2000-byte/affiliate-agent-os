import assert from "node:assert/strict"
import test from "node:test"

import {
  sortImprovementTasks,
  buildDuplicateKey,
  findDuplicateTask,
  isValidStatusTransition,
  summarizeImprovementTasks,
} from "../lib/improvement-tasks"
import type { ImprovementTask } from "../types/improvement-task"

function makeTask(overrides?: Partial<ImprovementTask>): ImprovementTask {
  return {
    id: "task-1",
    productId: null,
    productName: null,
    contentDraftId: null,
    draftTitle: null,
    sourceType: "manual",
    priority: "medium",
    status: "open",
    title: "Test task",
    description: null,
    suggestedAction: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  }
}

test("sortImprovementTasks puts in_progress before open before done", () => {
  const tasks = [
    makeTask({ id: "t1", status: "done" }),
    makeTask({ id: "t2", status: "open" }),
    makeTask({ id: "t3", status: "in_progress" }),
  ]
  const sorted = sortImprovementTasks(tasks)
  assert.equal(sorted[0].id, "t3")
  assert.equal(sorted[1].id, "t2")
  assert.equal(sorted[2].id, "t1")
})

test("sortImprovementTasks sorts by priority within same status", () => {
  const tasks = [
    makeTask({ id: "t1", status: "open", priority: "low" }),
    makeTask({ id: "t2", status: "open", priority: "critical" }),
    makeTask({ id: "t3", status: "open", priority: "high" }),
    makeTask({ id: "t4", status: "open", priority: "medium" }),
  ]
  const sorted = sortImprovementTasks(tasks)
  assert.equal(sorted[0].id, "t2")
  assert.equal(sorted[1].id, "t3")
  assert.equal(sorted[2].id, "t4")
  assert.equal(sorted[3].id, "t1")
})

test("buildDuplicateKey creates consistent keys", () => {
  const key = buildDuplicateKey("performance_insight", "Product A has 15 clicks")
  assert.equal(key, "performance_insight:Product A has 15 clicks")
})

test("findDuplicateTask finds matching open task", () => {
  const tasks = [
    makeTask({ id: "t1", sourceType: "performance_insight", title: "Product A needs attention", status: "open" }),
    makeTask({ id: "t2", sourceType: "manual", title: "Fix something", status: "open" }),
  ]
  const found = findDuplicateTask(tasks, "performance_insight", "Product A needs attention")
  assert.ok(found)
  assert.equal(found.id, "t1")
})

test("findDuplicateTask ignores done and dismissed tasks", () => {
  const tasks = [
    makeTask({ id: "t1", sourceType: "performance_insight", title: "Old task", status: "done" }),
    makeTask({ id: "t2", sourceType: "performance_insight", title: "Old task", status: "dismissed" }),
  ]
  const found = findDuplicateTask(tasks, "performance_insight", "Old task")
  assert.equal(found, undefined)
})

test("findDuplicateTask returns undefined when no match", () => {
  const tasks = [
    makeTask({ id: "t1", sourceType: "manual", title: "Different task" }),
  ]
  const found = findDuplicateTask(tasks, "performance_insight", "Product A needs attention")
  assert.equal(found, undefined)
})

test("isValidStatusTransition allows open to in_progress", () => {
  assert.equal(isValidStatusTransition("open", "in_progress"), true)
})

test("isValidStatusTransition allows open to dismissed", () => {
  assert.equal(isValidStatusTransition("open", "dismissed"), true)
})

test("isValidStatusTransition allows in_progress to done", () => {
  assert.equal(isValidStatusTransition("in_progress", "done"), true)
})

test("isValidStatusTransition blocks done to open", () => {
  assert.equal(isValidStatusTransition("done", "open"), false)
})

test("isValidStatusTransition blocks dismissed to open", () => {
  assert.equal(isValidStatusTransition("dismissed", "open"), false)
})

test("isValidStatusTransition blocks same-status transition", () => {
  assert.equal(isValidStatusTransition("open", "open"), false)
})

test("summarizeImprovementTasks counts correctly", () => {
  const tasks = [
    makeTask({ id: "t1", status: "open", priority: "critical" }),
    makeTask({ id: "t2", status: "open", priority: "medium" }),
    makeTask({ id: "t3", status: "in_progress", priority: "high" }),
    makeTask({ id: "t4", status: "done", priority: "critical" }),
    makeTask({ id: "t5", status: "dismissed", priority: "low" }),
  ]
  const summary = summarizeImprovementTasks(tasks)
  assert.equal(summary.total, 5)
  assert.equal(summary.open, 2)
  assert.equal(summary.inProgress, 1)
  assert.equal(summary.done, 1)
  assert.equal(summary.dismissed, 1)
  assert.equal(summary.critical, 1)
})

test("summarizeImprovementTasks returns zeros for empty list", () => {
  const summary = summarizeImprovementTasks([])
  assert.equal(summary.total, 0)
  assert.equal(summary.open, 0)
  assert.equal(summary.critical, 0)
})
