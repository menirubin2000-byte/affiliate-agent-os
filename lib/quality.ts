import type { DraftCreateInput, QualityChecks, TemplateType } from "@/types/draft"

function includesNormalized(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function hasDisclosure(body: string) {
  const disclosurePhrases = [
    "affiliate disclosure",
    "affiliate link",
    "affiliate links",
    "may earn a commission",
    "commission at no extra cost",
  ]

  return disclosurePhrases.some((phrase) => includesNormalized(body, phrase))
}

function hasClearCta(body: string, affiliateUrl: string, templateType: TemplateType) {
  const ctaPhrases = [
    "visit",
    "check it out",
    "learn more",
    "see current details",
    "review the official page",
    "public review page",
  ]

  const hasCtaPhrase = ctaPhrases.some((phrase) => includesNormalized(body, phrase))
  if (templateType === "quora_answer" || templateType === "reddit_post") {
    return hasCtaPhrase && /https?:\/\/[^\s]+\/(?:he\/)?reviews\/[a-z0-9-]+/i.test(body)
  }

  return body.includes(affiliateUrl) && hasCtaPhrase
}

function hasTargetKeyword(draft: DraftCreateInput, targetKeyword: string | null) {
  if (!targetKeyword) {
    return false
  }

  const combined = [draft.title ?? "", draft.body, draft.metaTitle ?? "", draft.metaDescription ?? ""]
    .join(" ")
    .toLowerCase()

  return combined.includes(targetKeyword.toLowerCase())
}

function avoidsFakeClaims(body: string) {
  const bannedClaims = [
    "5-star",
    "award-winning",
    "certified",
    "guaranteed results",
    "best price today",
    "limited-time discount",
    "verified testimonials",
    "thousands of reviews",
  ]

  return !bannedClaims.some((phrase) => includesNormalized(body, phrase))
}

function hasRequiredStructure(body: string, templateType: TemplateType) {
  if (templateType === "review") {
    return (
      includesNormalized(body, "who it is for") &&
      includesNormalized(body, "who it is not for") &&
      includesNormalized(body, "affiliate disclosure")
    )
  }

  if (templateType === "comparison") {
    return (
      includesNormalized(body, "how it compares") &&
      includesNormalized(body, "best fit") &&
      includesNormalized(body, "affiliate disclosure")
    )
  }

  if (templateType === "buying_guide") {
    return (
      includesNormalized(body, "what to look for") &&
      includesNormalized(body, "best for") &&
      includesNormalized(body, "affiliate disclosure")
    )
  }

  if (templateType === "tiktok_script") {
    return (
      includesNormalized(body, "hook") &&
      includesNormalized(body, "affiliate disclosure")
    )
  }

  if (templateType === "quora_answer") {
    return (
      includesNormalized(body, "what stands out") &&
      includesNormalized(body, "affiliate disclosure")
    )
  }

  if (templateType === "reddit_post") {
    return (
      includesNormalized(body, "affiliate disclosure")
    )
  }

  return hasDisclosure(body)
}

export function buildQualityChecks(params: {
  draft: DraftCreateInput
  affiliateUrl: string
  targetKeyword: string | null
  templateType: TemplateType
}): QualityChecks {
  return {
    has_disclosure: hasDisclosure(params.draft.body),
    has_clear_cta: hasClearCta(params.draft.body, params.affiliateUrl, params.templateType),
    has_target_keyword: hasTargetKeyword(params.draft, params.targetKeyword),
    has_meta_title: Boolean(params.draft.metaTitle?.trim()),
    has_meta_description: Boolean(params.draft.metaDescription?.trim()),
    avoids_fake_claims: avoidsFakeClaims(params.draft.body),
    has_required_structure: hasRequiredStructure(params.draft.body, params.templateType),
  }
}
