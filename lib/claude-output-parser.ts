export interface ParsedClaudeOutput {
  title: string | null
  metaTitle: string | null
  metaDescription: string | null
  targetKeyword: string | null
  body: string | null
}

const fieldPatterns: Array<{
  key: keyof ParsedClaudeOutput
  labels: string[]
}> = [
  { key: "title", labels: ["title"] },
  { key: "metaTitle", labels: ["meta title", "meta_title", "seo title"] },
  {
    key: "metaDescription",
    labels: ["meta description", "meta_description", "seo description"],
  },
  {
    key: "targetKeyword",
    labels: ["target keyword", "target_keyword", "keyword"],
  },
  { key: "body", labels: ["body", "content"] },
]

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildLabelRegex(labels: string[]): RegExp {
  const alts = labels.map(escapeRegex).join("|")
  return new RegExp(`^(?:${alts})\\s*:\\s*`, "i")
}

export function parseClaudeOutput(raw: string): ParsedClaudeOutput {
  const result: ParsedClaudeOutput = {
    title: null,
    metaTitle: null,
    metaDescription: null,
    targetKeyword: null,
    body: null,
  }

  const stripped = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = stripped.split("\n")

  const compiled = fieldPatterns.map((fp) => ({
    key: fp.key,
    regex: buildLabelRegex(fp.labels),
  }))

  interface Segment {
    key: keyof ParsedClaudeOutput
    startLine: number
    valuePart: string
  }

  const segments: Segment[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const { key, regex } of compiled) {
      const match = regex.exec(line)
      if (match) {
        segments.push({
          key,
          startLine: i,
          valuePart: line.slice(match[0].length),
        })
        break
      }
    }
  }

  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s]
    const nextStart = s + 1 < segments.length ? segments[s + 1].startLine : lines.length
    const extraLines = lines.slice(seg.startLine + 1, nextStart)
    const full = [seg.valuePart, ...extraLines].join("\n").trim()
    if (full) {
      result[seg.key] = full
    }
  }

  return result
}
