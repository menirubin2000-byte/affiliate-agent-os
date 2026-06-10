import crypto from "node:crypto"

export type AmazonImageSource = "none" | "paapi" | "manufacturer" | "uploaded"
export type AmazonApiStatus =
  | "not_checked"
  | "ready"
  | "missing_api_credentials"
  | "api_error"
  | "manual_image_required"

export interface AmazonProductMedia {
  asin: string
  title: string | null
  detailPageUrl: string | null
  imageUrl: string | null
  fetchedAt: string
}

interface AmazonPaApiConfig {
  accessKey: string
  secretKey: string
  partnerTag: string
  host: string
  marketplace: string
  region: string
}

type AmazonGetItemsResponse = {
  ItemResults?: {
    Items?: Array<{
      ASIN?: string
      DetailPageURL?: string
      Images?: {
        Primary?: {
          Large?: { URL?: string }
          Medium?: { URL?: string }
          Small?: { URL?: string }
        }
      }
      ItemInfo?: {
        Title?: {
          DisplayValue?: string
        }
      }
    }>
  }
  Errors?: Array<{ Code?: string; Message?: string }>
}

const AMAZON_IMAGE_HOSTS = [
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  "ssl-images-amazon.com",
  "images-amazon.com",
  "ecx.images-amazon.com",
]

export function isAmazonPaApiConfigured(env = process.env) {
  return Boolean(
    env.AMAZON_PAAPI_ACCESS_KEY?.trim() &&
      env.AMAZON_PAAPI_SECRET_KEY?.trim() &&
      env.AMAZON_ASSOCIATE_TAG?.trim(),
  )
}

export function getAmazonPaApiReadiness(env = process.env): {
  configured: boolean
  missing: string[]
} {
  const required = [
    "AMAZON_PAAPI_ACCESS_KEY",
    "AMAZON_PAAPI_SECRET_KEY",
    "AMAZON_ASSOCIATE_TAG",
  ] as const
  const missing = required.filter((key) => !env[key]?.trim())
  return { configured: missing.length === 0, missing }
}

export function extractAmazonAsin(value: string) {
  const normalized = value.trim()
  if (!normalized) return null

  const direct = normalized.match(/^[A-Z0-9]{10}$/i)
  if (direct) return direct[0].toUpperCase()

  try {
    const url = new URL(normalized)
    const asinMatch = url.pathname.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?]|$)/i)
    if (asinMatch?.[1]) return asinMatch[1].toUpperCase()

    const pathParts = url.pathname.split("/").filter(Boolean)
    const candidate = pathParts.find((part) => /^[A-Z0-9]{10}$/i.test(part))
    return candidate?.toUpperCase() ?? null
  } catch {
    return null
  }
}

export function isAmazonHostedImageUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return AMAZON_IMAGE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

export async function fetchAmazonProductMediaByAsin(asin: string): Promise<AmazonProductMedia> {
  const config = getConfig()
  const normalizedAsin = extractAmazonAsin(asin)
  if (!normalizedAsin) {
    throw new Error("Amazon ASIN must be a valid 10-character ASIN.")
  }

  const body = JSON.stringify({
    ItemIds: [normalizedAsin],
    ItemIdType: "ASIN",
    Marketplace: config.marketplace,
    PartnerTag: config.partnerTag,
    PartnerType: "Associates",
    Resources: [
      "Images.Primary.Large",
      "Images.Primary.Medium",
      "ItemInfo.Title",
    ],
  })

  const response = await signedAmazonRequest(config, body)
  const json = (await response.json()) as AmazonGetItemsResponse

  if (!response.ok) {
    const apiMessage = json.Errors?.map((error) => error.Message).filter(Boolean).join("; ")
    throw new Error(apiMessage || `Amazon Product API request failed with status ${response.status}.`)
  }

  const item = json.ItemResults?.Items?.find((candidate) => candidate.ASIN === normalizedAsin)
  if (!item) {
    const apiMessage = json.Errors?.map((error) => error.Message).filter(Boolean).join("; ")
    throw new Error(apiMessage || "Amazon Product API did not return the requested ASIN.")
  }

  return {
    asin: normalizedAsin,
    title: item.ItemInfo?.Title?.DisplayValue ?? null,
    detailPageUrl: item.DetailPageURL ?? null,
    imageUrl:
      item.Images?.Primary?.Large?.URL ??
      item.Images?.Primary?.Medium?.URL ??
      item.Images?.Primary?.Small?.URL ??
      null,
    fetchedAt: new Date().toISOString(),
  }
}

function getConfig(): AmazonPaApiConfig {
  const readiness = getAmazonPaApiReadiness()
  if (!readiness.configured) {
    throw new Error(`Missing Amazon Product API credentials: ${readiness.missing.join(", ")}.`)
  }

  return {
    accessKey: process.env.AMAZON_PAAPI_ACCESS_KEY!.trim(),
    secretKey: process.env.AMAZON_PAAPI_SECRET_KEY!.trim(),
    partnerTag: process.env.AMAZON_ASSOCIATE_TAG!.trim(),
    host: process.env.AMAZON_PAAPI_HOST?.trim() || "webservices.amazon.com",
    marketplace: process.env.AMAZON_PAAPI_MARKETPLACE?.trim() || "www.amazon.com",
    region: process.env.AMAZON_PAAPI_REGION?.trim() || "us-east-1",
  }
}

async function signedAmazonRequest(config: AmazonPaApiConfig, body: string) {
  const now = new Date()
  const amzDate = toAmzDate(now)
  const dateStamp = amzDate.slice(0, 8)
  const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems"
  const path = "/paapi5/getitems"
  const contentType = "application/json; charset=utf-8"
  const payloadHash = sha256Hex(body)

  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:${contentType}\n` +
    `host:${config.host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target"
  const canonicalRequest = [
    "POST",
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n")

  const algorithm = "AWS4-HMAC-SHA256"
  const credentialScope = `${dateStamp}/${config.region}/ProductAdvertisingAPI/aws4_request`
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n")
  const signingKey = getSignatureKey(config.secretKey, dateStamp, config.region, "ProductAdvertisingAPI")
  const signature = hmacHex(signingKey, stringToSign)
  const authorization =
    `${algorithm} Credential=${config.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`

  return fetch(`https://${config.host}${path}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Encoding": "amz-1.0",
      "Content-Type": contentType,
      Host: config.host,
      "X-Amz-Date": amzDate,
      "X-Amz-Target": target,
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  })
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "")
}

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex")
}

function hmac(key: crypto.BinaryLike, value: string) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest()
}

function hmacHex(key: crypto.BinaryLike, value: string) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest("hex")
}

function getSignatureKey(secretKey: string, dateStamp: string, regionName: string, serviceName: string) {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp)
  const kRegion = hmac(kDate, regionName)
  const kService = hmac(kRegion, serviceName)
  return hmac(kService, "aws4_request")
}
