// Per-source adapters for performance metric imports.
//
// Each external network / platform exports CSV with totally different column
// names. Rather than force one giant alias map (and silently accept anything),
// the operator picks WHICH source they're importing and the matching adapter
// validates the columns + normalizes the rows.
//
// Hard rules enforced here:
//   - The `source` value is set BY the adapter, never by the operator.
//   - Numeric fields are parsed strictly. If the file claims 1,000 clicks it
//     becomes 1000; if it claims "1.5 clicks" the row is rejected.
//   - Missing required column -> the whole import fails before any insert.
//   - We never invent a metric: if a row has neither clicks nor conversions
//     nor revenue, it is dropped.

export type PerformanceSourceKey =
  | "impact"
  | "partnerstack"
  | "reditus"
  | "systeme_io"
  | "elevenlabs"
  | "medium"
  | "substack"
  | "linkedin"

export interface AdapterRow {
  /** Canonical platform/channel key. Maps onto routing platform when applicable. */
  channel: string
  /** Product matching key — slug or external product name from the CSV. */
  productHint: string
  campaignName: string | null
  clicks: number
  conversions: number | null
  revenue: number | null
  recordedAt: string | null
  notes: string | null
}

export interface AdapterDefinition {
  key: PerformanceSourceKey
  hebrewLabel: string
  englishLabel: string
  /** Channel value written into performance_metrics.channel for every row this adapter produces. */
  defaultChannel: string
  /** Columns required in the header. */
  requiredColumns: string[]
  /** Help text explaining what to paste. */
  help: string
  /** Parse a single normalized row from the CSV row dict. Throws Error on bad data. */
  parseRow: (row: Record<string, string>) => AdapterRow
}

function toNumber(value: string | undefined, field: string): number {
  if (value === undefined || value === null) {
    throw new Error(`Missing value for ${field}`)
  }
  const cleaned = value.trim().replace(/[$,€£\s]/g, "")
  if (cleaned === "" || cleaned === "-") return 0
  const num = Number(cleaned)
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`Invalid number for ${field}: "${value}"`)
  }
  return num
}

function toInt(value: string | undefined, field: string): number {
  const num = toNumber(value, field)
  if (!Number.isInteger(num)) {
    throw new Error(`Field ${field} must be a whole number, got "${value}"`)
  }
  return num
}

function optionalNumber(value: string | undefined): number | null {
  if (value === undefined || value === null || value.trim() === "") return null
  const n = toNumber(value, "value")
  return Number.isFinite(n) ? n : null
}

function optionalInt(value: string | undefined): number | null {
  const n = optionalNumber(value)
  if (n === null) return null
  if (!Number.isInteger(n)) return null
  return n
}

function isoDate(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export const PERFORMANCE_SOURCE_ADAPTERS: Record<PerformanceSourceKey, AdapterDefinition> = {
  impact: {
    key: "impact",
    hebrewLabel: "Impact.com",
    englishLabel: "Impact.com",
    defaultChannel: "impact",
    requiredColumns: ["Action Date", "Campaign", "Clicks", "Actions", "Payout"],
    help: "Impact -> Reports -> Actions / Performance by Campaign. Export CSV.",
    parseRow: (row) => ({
      channel: "impact",
      productHint: row["Campaign"] ?? "",
      campaignName: row["Sub Id 1"] ?? row["Sub ID"] ?? null,
      clicks: toInt(row["Clicks"], "Clicks"),
      conversions: optionalInt(row["Actions"]),
      revenue: optionalNumber(row["Payout"]),
      recordedAt: isoDate(row["Action Date"]),
      notes: row["Notes"] ?? null,
    }),
  },
  partnerstack: {
    key: "partnerstack",
    hebrewLabel: "PartnerStack",
    englishLabel: "PartnerStack",
    defaultChannel: "partnerstack",
    requiredColumns: ["Date", "Program", "Clicks", "Conversions", "Commission"],
    help: "PartnerStack -> Reports -> Performance. Export CSV.",
    parseRow: (row) => ({
      channel: "partnerstack",
      productHint: row["Program"] ?? row["Partner Program"] ?? "",
      campaignName: row["Sub ID"] ?? null,
      clicks: toInt(row["Clicks"], "Clicks"),
      conversions: optionalInt(row["Conversions"]),
      revenue: optionalNumber(row["Commission"]),
      recordedAt: isoDate(row["Date"]),
      notes: row["Notes"] ?? null,
    }),
  },
  reditus: {
    key: "reditus",
    hebrewLabel: "Reditus",
    englishLabel: "Reditus",
    defaultChannel: "reditus",
    requiredColumns: ["date", "program_name", "clicks", "conversions", "commission"],
    help: "Reditus -> Earnings -> Per program. Export CSV.",
    parseRow: (row) => ({
      channel: "reditus",
      productHint: row["program_name"] ?? "",
      campaignName: row["sub_id"] ?? null,
      clicks: toInt(row["clicks"], "clicks"),
      conversions: optionalInt(row["conversions"]),
      revenue: optionalNumber(row["commission"]),
      recordedAt: isoDate(row["date"]),
      notes: row["notes"] ?? null,
    }),
  },
  systeme_io: {
    key: "systeme_io",
    hebrewLabel: "Systeme.io",
    englishLabel: "Systeme.io",
    defaultChannel: "systeme_io",
    requiredColumns: ["Date", "Clicks", "Sales", "Commission"],
    help: "Systeme.io -> Affiliate -> Stats. Export CSV.",
    parseRow: (row) => ({
      channel: "systeme_io",
      productHint: row["Product"] ?? "Systeme.io",
      campaignName: row["Source"] ?? null,
      clicks: toInt(row["Clicks"], "Clicks"),
      conversions: optionalInt(row["Sales"]),
      revenue: optionalNumber(row["Commission"]),
      recordedAt: isoDate(row["Date"]),
      notes: row["Notes"] ?? null,
    }),
  },
  elevenlabs: {
    key: "elevenlabs",
    hebrewLabel: "ElevenLabs Partner",
    englishLabel: "ElevenLabs Partner",
    defaultChannel: "elevenlabs",
    requiredColumns: ["Date", "Clicks", "Signups", "Revenue"],
    help: "ElevenLabs Partner dashboard -> Stats export.",
    parseRow: (row) => ({
      channel: "elevenlabs",
      productHint: "ElevenLabs",
      campaignName: row["Campaign"] ?? null,
      clicks: toInt(row["Clicks"], "Clicks"),
      conversions: optionalInt(row["Signups"]),
      revenue: optionalNumber(row["Revenue"]),
      recordedAt: isoDate(row["Date"]),
      notes: row["Notes"] ?? null,
    }),
  },
  medium: {
    key: "medium",
    hebrewLabel: "Medium",
    englishLabel: "Medium (per article stats)",
    defaultChannel: "medium",
    requiredColumns: ["Title", "Views", "Reads"],
    help: "Medium -> Stats -> Posts. Export CSV. (Views map to clicks; revenue is left null.)",
    parseRow: (row) => ({
      channel: "medium",
      productHint: row["Product"] ?? row["Title"] ?? "",
      campaignName: row["Title"] ?? null,
      // Treat Reads as a stronger engagement signal than Views — Reads = clicks,
      // because each Read is someone who reached the bottom of the article.
      clicks: toInt(row["Reads"] ?? row["Views"], "Reads/Views"),
      conversions: null,
      revenue: null,
      recordedAt: isoDate(row["Date"]),
      notes: `views=${row["Views"] ?? "-"} reads=${row["Reads"] ?? "-"}`,
    }),
  },
  substack: {
    key: "substack",
    hebrewLabel: "Substack",
    englishLabel: "Substack (per post stats)",
    defaultChannel: "substack",
    requiredColumns: ["Post", "Opens", "Clicks"],
    help: "Substack -> Stats -> Posts. Export CSV.",
    parseRow: (row) => ({
      channel: "substack",
      productHint: row["Product"] ?? row["Post"] ?? "",
      campaignName: row["Post"] ?? null,
      clicks: toInt(row["Clicks"], "Clicks"),
      conversions: null,
      revenue: null,
      recordedAt: isoDate(row["Date"]),
      notes: `opens=${row["Opens"] ?? "-"}`,
    }),
  },
  linkedin: {
    key: "linkedin",
    hebrewLabel: "LinkedIn",
    englishLabel: "LinkedIn (per post analytics)",
    defaultChannel: "linkedin",
    requiredColumns: ["Post", "Impressions", "Clicks"],
    help: "LinkedIn -> Analytics -> Posts. Export CSV.",
    parseRow: (row) => ({
      channel: "linkedin",
      productHint: row["Product"] ?? row["Post"] ?? "",
      campaignName: row["Post"] ?? null,
      clicks: toInt(row["Clicks"], "Clicks"),
      conversions: null,
      revenue: null,
      recordedAt: isoDate(row["Date"]),
      notes: `impressions=${row["Impressions"] ?? "-"}`,
    }),
  },
}

export function getSourceAdapter(key: PerformanceSourceKey): AdapterDefinition {
  const adapter = PERFORMANCE_SOURCE_ADAPTERS[key]
  if (!adapter) throw new Error(`Unknown performance source: ${key}`)
  return adapter
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ",") {
        out.push(cur)
        cur = ""
      } else if (ch === "\t") {
        out.push(cur)
        cur = ""
      } else {
        cur += ch
      }
    }
  }
  out.push(cur)
  return out.map((x) => x.trim())
}

export interface ParsedAdapterCsv {
  source: PerformanceSourceKey
  rows: AdapterRow[]
  errors: { rowIndex: number; message: string }[]
}

export function parseCsvForSource(
  csv: string,
  source: PerformanceSourceKey,
): ParsedAdapterCsv {
  const adapter = getSourceAdapter(source)
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length === 0) return { source, rows: [], errors: [] }

  const header = parseCsvLine(lines[0])
  const missing = adapter.requiredColumns.filter((col) => !header.includes(col))
  if (missing.length > 0) {
    return {
      source,
      rows: [],
      errors: [
        {
          rowIndex: 0,
          message: `מקור ${adapter.englishLabel} דורש את העמודות: ${missing.join(", ")}`,
        },
      ],
    }
  }

  const rows: AdapterRow[] = []
  const errors: { rowIndex: number; message: string }[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const dict: Record<string, string> = {}
    header.forEach((key, idx) => {
      dict[key] = values[idx] ?? ""
    })
    try {
      const parsed = adapter.parseRow(dict)
      // Drop rows that carry no signal at all — do not insert empty metrics.
      if (parsed.clicks === 0 && (parsed.conversions ?? 0) === 0 && (parsed.revenue ?? 0) === 0) {
        continue
      }
      rows.push(parsed)
    } catch (err) {
      errors.push({
        rowIndex: i,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return { source, rows, errors }
}
