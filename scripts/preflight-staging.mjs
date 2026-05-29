import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_ACCESS_PASSWORD",
  "APP_SESSION_SECRET",
]

const optionalEnvKeys = [
  "WORDPRESS_BASE_URL",
  "WORDPRESS_USERNAME",
  "WORDPRESS_APP_PASSWORD",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "AI_PROVIDER",
]

const root = process.cwd()
const results = []

function addResult(status, title, detail) {
  results.push({ status, title, detail })
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {}

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...parts] = line.split("=")
        return [key.trim(), parts.join("=").trim().replace(/^['"]|['"]$/g, "")]
      }),
  )
}

function isPlaceholder(value) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return true

  return (
    normalized.includes("your_") ||
    normalized.includes("replace-me") ||
    normalized.includes("changeme") ||
    normalized.includes("example.com") ||
    normalized === "password" ||
    normalized === "secret"
  )
}

function getEnvValue(key, envFileValues) {
  return process.env[key] ?? envFileValues[key] ?? ""
}

function run(command, args) {
  const executable = process.platform === "win32" && command === "npm" ? "cmd.exe" : command
  const commandArgs =
    process.platform === "win32" && command === "npm"
      ? ["/d", "/s", "/c", ["npm.cmd", ...args].join(" ")]
      : args

  return spawnSync(executable, commandArgs, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
  })
}

function checkEnv() {
  const envFileValues = parseEnvFile(join(root, ".env.local"))
  const missing = requiredEnvKeys.filter((key) => isPlaceholder(getEnvValue(key, envFileValues)))
  const missingAccessGateKeys = missing.filter((key) =>
    ["APP_ACCESS_PASSWORD", "APP_SESSION_SECRET"].includes(key),
  )
  const optionalConfigured = optionalEnvKeys.filter((key) => !isPlaceholder(getEnvValue(key, envFileValues)))

  if (missing.length === 0) {
    addResult("pass", "Required staging env vars", "All required staging env keys are present.")
  } else if (missingAccessGateKeys.length > 0) {
    addResult(
      "fail",
      "Required staging env vars",
      [
        `Missing or placeholder values: ${missing.join(", ")}.`,
        `Access gate setup: run npm run generate:access-secret to generate APP_SESSION_SECRET.`,
        "Choose APP_ACCESS_PASSWORD yourself; use a long unique passphrase.",
        "Paste both values into .env.local and Vercel Project Settings -> Environment Variables.",
        "Do not commit .env.local or share these secrets.",
      ].join(" "),
    )
  } else {
    addResult(
      "fail",
      "Required staging env vars",
      `Missing or placeholder values: ${missing.join(", ")}.`,
    )
  }

  addResult(
    "info",
    "Optional integrations",
    optionalConfigured.length > 0
      ? `Optional env keys configured: ${optionalConfigured.join(", ")}.`
      : "WordPress and AI env keys are not required for staging.",
  )
}

function checkEnvLocalIgnored() {
  const gitignorePath = join(root, ".gitignore")
  const gitignore = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8") : ""
  const hasIgnoreRule = gitignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === ".env*" || line === ".env.local" || line === "*.env")
  const tracked = run("git", ["ls-files", "--error-unmatch", ".env.local"]).status === 0

  if (hasIgnoreRule && !tracked) {
    addResult("pass", ".env.local git safety", ".env.local is ignored and is not tracked.")
  } else if (tracked) {
    addResult("fail", ".env.local git safety", ".env.local is tracked. Remove it from git before staging.")
  } else {
    addResult("fail", ".env.local git safety", ".gitignore does not clearly ignore .env.local.")
  }
}

function checkMigrations() {
  const migrationsDir = join(root, "supabase", "migrations")
  const requiredMigrations = [
    "001_init.sql",
    "002_content_quality.sql",
    "003_wordpress_queue.sql",
    "004_performance_metrics.sql",
    "005_service_role_api_grants.sql",
    "006_draft_versions.sql",
    "007_improvement_tasks.sql",
    "008_campaign_links.sql",
    "009_performance_campaign_link.sql",
    "010_saved_views.sql",
  ]

  if (!existsSync(migrationsDir)) {
    addResult("fail", "Supabase migrations", "supabase/migrations does not exist.")
    return
  }

  const files = new Set(readdirSync(migrationsDir))
  const missing = requiredMigrations.filter((file) => !files.has(file))

  if (missing.length === 0) {
    addResult("pass", "Supabase migrations", "All expected migration files are present.")
  } else {
    addResult("fail", "Supabase migrations", `Missing migration files: ${missing.join(", ")}.`)
  }
}

function walkFiles(dir, files = []) {
  if (!existsSync(dir)) return files

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) {
      walkFiles(path, files)
    } else {
      files.push(path)
    }
  }

  return files
}

function getScanFiles() {
  const roots = [
    "app",
    "components",
    "docs",
    "lib",
    "scripts",
    "supabase",
    "tests",
    "types",
  ]
  const rootFiles = [
    ".env.example",
    ".gitignore",
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "middleware.ts",
    "next.config.ts",
    "package.json",
    "postcss.config.mjs",
    "tsconfig.json",
  ]

  return [
    ...roots.flatMap((dir) => walkFiles(join(root, dir))),
    ...rootFiles.map((file) => join(root, file)).filter((file) => existsSync(file)),
  ].filter((file) => !file.includes(`${join(root, "supabase", "seed.sql")}`))
}

function checkObviousSecrets() {
  const patterns = [
    { label: "OpenAI-style API key", regex: /sk-[A-Za-z0-9_-]{32,}/ },
    { label: "Anthropic-style API key", regex: /sk-ant-[A-Za-z0-9_-]{20,}/ },
    { label: "JWT-like token", regex: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
    { label: "Supabase secret key", regex: /sb_secret_(?!your)[A-Za-z0-9_-]{20,}/ },
  ]
  const hits = []

  for (const file of getScanFiles()) {
    const relativePath = relative(root, file).replaceAll("\\", "/")
    const text = readFileSync(file, "utf8")
    for (const pattern of patterns) {
      if (pattern.regex.test(text)) {
        hits.push(`${relativePath} (${pattern.label})`)
      }
    }
  }

  if (hits.length === 0) {
    addResult("pass", "Secret scan", "No obvious secret patterns found in source or docs.")
  } else {
    addResult("fail", "Secret scan", `Potential secrets found: ${hits.join(", ")}.`)
  }
}

function checkVerify() {
  const result = run("npm", ["run", "verify"])

  if (result.status === 0) {
    addResult("pass", "npm run verify", "Lint, tests, and build pass.")
  } else {
    addResult(
      "fail",
      "npm run verify",
      "Verification failed. Run npm run verify locally and fix the reported issue before deployment.",
    )
  }
}

function printResults() {
  console.log("Affiliate Agent OS staging preflight")
  console.log("")

  for (const result of results) {
    const prefix = result.status === "pass" ? "PASS" : result.status === "fail" ? "FAIL" : "INFO"
    console.log(`${prefix}: ${result.title}`)
    console.log(`  ${result.detail}`)
  }

  const failures = results.filter((result) => result.status === "fail")
  console.log("")
  if (failures.length > 0) {
    console.log(`Preflight found ${failures.length} setup item(s) to fix before staging deployment.`)
    process.exitCode = 1
  } else {
    console.log("Preflight passed. The project is ready for a Vercel staging deployment review.")
  }
}

checkEnv()
checkEnvLocalIgnored()
checkMigrations()
checkObviousSecrets()
checkVerify()
printResults()
