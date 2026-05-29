import type { Recommendation, RecommendationSummary } from "@/types/recommendation"

function severityRank(severity: Recommendation["severity"]) {
  switch (severity) {
    case "critical":
      return 0
    case "warning":
      return 1
    default:
      return 2
  }
}

export function sortRecommendations(recommendations: Recommendation[]) {
  return [...recommendations].sort((left, right) => {
    const severityOrder = severityRank(left.severity) - severityRank(right.severity)
    if (severityOrder !== 0) {
      return severityOrder
    }

    return left.title.localeCompare(right.title)
  })
}

export function summarizeRecommendations(
  recommendations: Recommendation[],
): RecommendationSummary {
  return recommendations.reduce<RecommendationSummary>(
    (summary, recommendation) => {
      summary.total += 1
      summary[recommendation.severity] += 1
      return summary
    },
    {
      total: 0,
      info: 0,
      warning: 0,
      critical: 0,
    },
  )
}
