export interface ParsedProductRow {
  rowIndex: number
  name: string
  slug: string
  brand: string | null
  category: string | null
  affiliateUrl: string
  price: number | null
  commissionRate: number | null
  notes: string | null
  targetKeyword: string | null
  secondaryKeywords: string[]
  searchIntent: string | null
  contentAngle: string | null
  status: string
}

export interface ProductRowError {
  rowIndex: number
  field: string
  message: string
}

export interface ProductImportResult {
  validRows: ParsedProductRow[]
  errors: ProductRowError[]
  duplicateSlugs: string[]
  totalRows: number
}

const REQUIRED_FIELDS = ["name", "slug", "affiliate_url"] as const

const FIELD_ALIASES: Record<string, string> = {
  name: "name",
  product_name: "name",
  productname: "name",
  slug: "slug",
  product_slug: "slug",
  brand: "brand",
  category: "category",
  affiliate_url: "affiliate_url",
  affiliateurl: "affiliate_url",
  affiliate_link: "affiliate_url",
  url: "affiliate_url",
  price: "price",
  commission_rate: "commission_rate",
  commissionrate: "commission_rate",
  commission: "commission_rate",
  notes: "notes",
  target_keyword: "target_keyword",
  targetkeyword: "target_keyword",
  keyword: "target_keyword",
  secondary_keywords: "secondary_keywords",
  secondarykeywords: "secondary_keywords",
  search_intent: "search_intent",
  searchintent: "search_intent",
  intent: "search_intent",
  content_angle: "content_angle",
  contentangle: "content_angle",
  angle: "content_angle",
  status: "status",
}

function detectSeparator(headerLine: string): string {
  const tabCount = (headerLine.match(/\t/g) ?? []).length
  const commaCount = (headerLine.match(/,/g) ?? []).length
  return tabCount > commaCount ? "\t" : ","
}

function splitRow(line: string, separator: string): string[] {
  if (separator === "\t") {
    return line.split("\t").map((v) => v.trim())
  }

  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === separator && !inQuotes) {
      fields.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

function normalizeHeader(header: string): string | null {
  const key = header.toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "")
  return FIELD_ALIASES[key] ?? null
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function parseNumber(value: string): number | null {
  if (!value) return null
  const cleaned = value.replace(/[$,]/g, "").trim()
  if (!cleaned) return null
  const num = Number(cleaned)
  if (!Number.isFinite(num)) return null
  return num
}

export function parseProductCsv(raw: string): ProductImportResult {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    return { validRows: [], errors: [], duplicateSlugs: [], totalRows: 0 }
  }

  const headerLine = lines[0]
  const separator = detectSeparator(headerLine)
  const rawHeaders = splitRow(headerLine, separator)
  const headers = rawHeaders.map(normalizeHeader)

  const errors: ProductRowError[] = []
  const validRows: ParsedProductRow[] = []
  const seenSlugs = new Set<string>()
  const duplicateSlugs: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = splitRow(lines[i], separator)
    const rowIndex = i + 1

    const record: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j]
      if (header) {
        record[header] = values[j] ?? ""
      }
    }

    let rowValid = true

    for (const field of REQUIRED_FIELDS) {
      if (!record[field]?.trim()) {
        errors.push({ rowIndex, field, message: `${field} is required` })
        rowValid = false
      }
    }

    if (record.affiliate_url?.trim() && !isValidHttpUrl(record.affiliate_url.trim())) {
      errors.push({ rowIndex, field: "affiliate_url", message: "Must be a valid http or https URL" })
      rowValid = false
    }

    let price: number | null = null
    if (record.price?.trim()) {
      price = parseNumber(record.price)
      if (price === null || price < 0) {
        errors.push({ rowIndex, field: "price", message: "Must be a non-negative number" })
        rowValid = false
        price = null
      }
    }

    let commissionRate: number | null = null
    if (record.commission_rate?.trim()) {
      commissionRate = parseNumber(record.commission_rate)
      if (commissionRate === null || commissionRate < 0) {
        errors.push({ rowIndex, field: "commission_rate", message: "Must be a non-negative number" })
        rowValid = false
        commissionRate = null
      }
    }

    const slug = record.slug?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") ?? ""
    if (slug && seenSlugs.has(slug)) {
      duplicateSlugs.push(slug)
      errors.push({ rowIndex, field: "slug", message: `Duplicate slug "${slug}" in import` })
      rowValid = false
    }
    if (slug) {
      seenSlugs.add(slug)
    }

    const status = record.status?.trim().toLowerCase() || "active"
    if (status !== "active" && status !== "inactive") {
      errors.push({ rowIndex, field: "status", message: "Must be 'active' or 'inactive'" })
      rowValid = false
    }

    if (!rowValid) continue

    const secondaryRaw = record.secondary_keywords?.trim() ?? ""
    const secondaryKeywords = secondaryRaw
      ? secondaryRaw.split(/[;|]/).map((k) => k.trim()).filter(Boolean)
      : []

    validRows.push({
      rowIndex,
      name: record.name.trim(),
      slug,
      brand: record.brand?.trim() || null,
      category: record.category?.trim() || null,
      affiliateUrl: record.affiliate_url.trim(),
      price,
      commissionRate,
      notes: record.notes?.trim() || null,
      targetKeyword: record.target_keyword?.trim() || null,
      secondaryKeywords,
      searchIntent: record.search_intent?.trim() || null,
      contentAngle: record.content_angle?.trim() || null,
      status,
    })
  }

  return {
    validRows,
    errors,
    duplicateSlugs: [...new Set(duplicateSlugs)],
    totalRows: lines.length - 1,
  }
}
