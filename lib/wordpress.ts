import { getWordPressReadiness } from "@/lib/env"

interface WordPressDraftPostInput {
  title: string
  content: string
  excerpt?: string | null
}

interface WordPressDraftPostResult {
  wordpressPostId: string
  wordpressPostUrl: string | null
}

function getRequiredWordPressEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    const readiness = getWordPressReadiness()
    throw new Error(`${readiness.summary} ${readiness.guidance}`)
  }

  return value
}

function getWordPressConfig() {
  return {
    baseUrl: getRequiredWordPressEnv("WORDPRESS_BASE_URL").replace(/\/+$/, ""),
    username: getRequiredWordPressEnv("WORDPRESS_USERNAME"),
    appPassword: getRequiredWordPressEnv("WORDPRESS_APP_PASSWORD"),
  }
}

export function isWordPressConfigured() {
  return getWordPressReadiness().status === "configured"
}

export async function createWordPressDraftPost(
  input: WordPressDraftPostInput,
): Promise<WordPressDraftPostResult> {
  const config = getWordPressConfig()
  const authToken = Buffer.from(
    `${config.username}:${config.appPassword}`,
    "utf8",
  ).toString("base64")

  const response = await fetch(`${config.baseUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: input.title,
      content: input.content,
      excerpt: input.excerpt ?? "",
      status: "draft",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  })

  const payload = (await response.json().catch(() => null)) as
    | {
        id?: number | string
        link?: string
        guid?: { rendered?: string }
        message?: string
      }
    | null

  if (!response.ok || !payload?.id) {
    throw new Error(
      `WordPress draft creation failed: ${payload?.message ?? response.statusText}`,
    )
  }

  return {
    wordpressPostId: String(payload.id),
    wordpressPostUrl: payload.link ?? payload.guid?.rendered ?? null,
  }
}
