function requireDirectPublishOverride(scriptName) {
  const enabled = process.env.AFFILIATE_AGENT_OS_ALLOW_DIRECT_PUBLISH === "true"
  const acknowledged =
    process.env.AFFILIATE_AGENT_OS_DIRECT_PUBLISH_ACK ===
    "I understand this bypasses the normal MENI approval publish_job workflow"

  if (enabled && acknowledged) return

  throw new Error(
    [
      `${scriptName} is blocked by Affiliate Agent OS safety rules.`,
      "Direct publishing scripts bypass the normal workflow:",
      "final_copy -> MENI approval -> publish_job -> executor -> verified live URL -> published_record.",
      "Use the app workflow unless this is an intentional controlled operator run.",
      "To override, set both:",
      "AFFILIATE_AGENT_OS_ALLOW_DIRECT_PUBLISH=true",
      'AFFILIATE_AGENT_OS_DIRECT_PUBLISH_ACK="I understand this bypasses the normal MENI approval publish_job workflow"',
    ].join("\n"),
  )
}

function requireApprovalOverride(scriptName) {
  const enabled = process.env.AFFILIATE_AGENT_OS_ALLOW_BULK_APPROVAL === "true"
  const acknowledged =
    process.env.AFFILIATE_AGENT_OS_BULK_APPROVAL_ACK ===
    "I understand MENI approval must be explicit and this is a controlled approval operation"

  if (enabled && acknowledged) return

  throw new Error(
    [
      `${scriptName} is blocked by Affiliate Agent OS safety rules.`,
      "Scripts must not mark final copies as operator_approved without explicit MENI approval.",
      "Use the one-click MENI approval UI, or run this only as an intentional controlled operator approval.",
      "To override, set both:",
      "AFFILIATE_AGENT_OS_ALLOW_BULK_APPROVAL=true",
      'AFFILIATE_AGENT_OS_BULK_APPROVAL_ACK="I understand MENI approval must be explicit and this is a controlled approval operation"',
    ].join("\n"),
  )
}

module.exports = { requireApprovalOverride, requireDirectPublishOverride }
