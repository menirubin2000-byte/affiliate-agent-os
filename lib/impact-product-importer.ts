import type { ImpactProductCandidateInput } from "@/lib/impact-product-scoring"
import type { ImpactRelationshipStatus } from "@/types/impact-product-candidate"

type UnknownRecord = Record<string, unknown>

const PRODUCT_ARRAY_KEYS = [
  "products",
  "Products",
  "items",
  "Items",
  "catalogItems",
  "CatalogItems",
  "data",
  "Data",
  "records",
  "Records",
]

export function parseImpactProductsPayload(payload: unknown): Array<ImpactProductCandidateInput & { rawData: unknown }> {
  const records = extractRecords(payload)
  return records.map((record, index) => mapImpactRecord(record, index)).filter(isCandidateInput)
}

export function parseImpactProductsCsv(csv: string): Array<ImpactProductCandidateInput & { rawData: unknown }> {
  const rows = parseCsvRows(csv)
  if (rows.length < 2) return []
  const headers = rows[0].map((header) => normalizeKey(header))
  return rows.slice(1).map((row, index) => {
    const record: UnknownRecord = {}
    headers.forEach((header, columnIndex) => {
      record[header] = row[columnIndex] ?? ""
    })
    return mapImpactRecord(record, index)
  }).filter(isCandidateInput)
}

export async function fetchImpactProductsFromApi(options: {
  endpoint: string
  accountSid?: string
  authToken?: string
  pageLimit?: number
}) {
  const products: Array<ImpactProductCandidateInput & { rawData: unknown }> = []
  let endpoint: string | null = options.endpoint
  let pages = 0

  while (endpoint && pages < (options.pageLimit ?? 25)) {
    const response = await fetch(endpoint, {
      headers: buildImpactHeaders(options.accountSid, options.authToken),
    })
    if (!response.ok) {
      throw new Error(`Impact API request failed: ${response.status} ${response.statusText}`)
    }
    const payload = await response.json() as UnknownRecord
    products.push(...parseImpactProductsPayload(payload))
    endpoint = findNextPageUrl(payload, endpoint)
    pages += 1
  }

  return products
}

function mapImpactRecord(record: UnknownRecord, index: number): (ImpactProductCandidateInput & { rawData: unknown }) | null {
  const productName = firstText(record, [
    "productname",
    "name",
    "title",
    "itemname",
    "catalogitemname",
    "product",
  ])
  const landingPage = firstText(record, [
    "landingpage",
    "landingpageurl",
    "url",
    "producturl",
    "clickurl",
    "trackinglink",
    "uri",
  ])
  const externalId = firstText(record, [
    "id",
    "productid",
    "catalogitemid",
    "itemid",
    "sku",
    "mpn",
  ]) || stableExternalId(productName, landingPage, index)

  if (!productName) return null

  const payout = firstNumber(record, [
    "payout",
    "commission",
    "commissionrate",
    "commissionvalue",
    "defaultpayout",
    "salecommission",
  ])
  const payoutType = inferPayoutType(record, payout)
  const availability = firstText(record, ["availability", "stock", "stockstatus", "inventorystatus"])

  return {
    externalId,
    productName,
    brand: firstText(record, ["brand", "manufacturer", "merchant"]),
    advertiser: firstText(record, ["advertiser", "advertisername", "campaign", "campaignname", "program"]),
    price: firstNumber(record, ["price", "saleprice", "currentprice", "amount"]),
    currency: firstText(record, ["currency", "currencycode"]) ?? "USD",
    payout,
    payoutType,
    commissionSummary: firstText(record, ["commissionsummary", "commissiondescription", "payoutdescription", "terms"]),
    epc: firstNumber(record, ["epc", "networkepc", "threeMonthepc", "threemonth_epc"]),
    conversionRate: firstNumber(record, ["conversionrate", "conversion", "cr"]),
    recentSales: firstInteger(record, ["sales", "recentsales", "orders", "sold", "unitsSold", "unitssold"]),
    availability,
    inStock: inferInStock(availability, record),
    imageUrl: firstText(record, ["imageurl", "image", "thumbnail", "thumbnailurl", "pictureurl"]),
    landingPage,
    category: firstText(record, ["category", "categoryname", "vertical", "productcategory"]),
    labels: firstList(record, ["labels", "tags", "keywords"]),
    relationshipStatus: inferRelationshipStatus(record),
    shippingGeo: firstText(record, ["shipping", "shippinggeo", "geo", "country", "countries", "territory", "availabilitygeo"]),
    rawData: record,
  }
}

function extractRecords(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord)
  if (!isRecord(payload)) return []
  for (const key of PRODUCT_ARRAY_KEYS) {
    const value = payload[key]
    if (Array.isArray(value)) return value.filter(isRecord)
  }
  return [payload]
}

function buildImpactHeaders(accountSid?: string, authToken?: string) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }
  if (accountSid && authToken) {
    headers.Authorization = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`
  }
  return headers
}

function findNextPageUrl(payload: UnknownRecord, currentEndpoint: string) {
  const next = firstText(payload, ["@nextpageuri", "nextpageuri", "next", "nexturl"])
  if (!next) return null
  if (next.startsWith("http://") || next.startsWith("https://")) return next
  return new URL(next, currentEndpoint).toString()
}

function firstText(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = findValue(record, key)
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

function firstNumber(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = findValue(record, key)
    const parsed = parseNumber(value)
    if (parsed !== null) return parsed
  }
  return null
}

function firstInteger(record: UnknownRecord, keys: string[]) {
  const value = firstNumber(record, keys)
  return value === null ? null : Math.round(value)
}

function firstList(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = findValue(record, key)
    if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean)
    if (typeof value === "string" && value.trim()) {
      return value.split(/[|,;]/).map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

function findValue(record: UnknownRecord, requestedKey: string): unknown {
  const normalizedRequested = normalizeKey(requestedKey)
  for (const [key, value] of Object.entries(record)) {
    if (normalizeKey(key) === normalizedRequested) return value
  }
  return undefined
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const normalized = value.replace(/[$,%\s]/g, "")
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function inferPayoutType(record: UnknownRecord, payout: number | null) {
  const text = [
    firstText(record, ["payouttype", "commissiontype", "commissionsummary", "terms"]),
    payout !== null ? String(payout) : null,
  ].filter(Boolean).join(" ").toLowerCase()
  if (/%|percent|percentage|revshare/.test(text)) return "percent"
  if (/fixed|flat|amount|usd|\$/.test(text)) return "amount"
  return payout !== null && payout <= 100 ? "percent" : null
}

function inferInStock(availability: string | null, record: UnknownRecord) {
  const explicit = findValue(record, "instock")
  if (typeof explicit === "boolean") return explicit
  const text = availability?.toLowerCase() ?? ""
  if (!text) return null
  if (/out|unavailable|sold out|discontinued/.test(text)) return false
  if (/in stock|available|yes|true/.test(text)) return true
  return null
}

function inferRelationshipStatus(record: UnknownRecord): ImpactRelationshipStatus {
  const text = firstText(record, [
    "relationshipstatus",
    "approvalstatus",
    "status",
    "partnerstatus",
    "campaignstatus",
  ])?.toLowerCase()
  if (!text) return "unknown"
  if (/approved|joined|active/.test(text)) return "approved"
  if (/pending|apply|approval|required|review/.test(text)) return "needs_brand_approval"
  if (/rejected|declined|not approved|inactive/.test(text)) return "not_approved"
  return "unknown"
}

function parseCsvRows(csv: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index]
    const next = csv[index + 1]
    if (char === '"' && quoted && next === '"') {
      field += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === "," && !quoted) {
      row.push(field)
      field = ""
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1
      row.push(field)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }

  row.push(field)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}

function stableExternalId(productName: string | null, landingPage: string | null, index: number) {
  return [productName, landingPage, index].filter(Boolean).join(":").toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function isCandidateInput(
  value: (ImpactProductCandidateInput & { rawData: unknown }) | null,
): value is ImpactProductCandidateInput & { rawData: unknown } {
  return value !== null
}
