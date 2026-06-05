# Data Model — Affiliate Agent OS

> Authoritative DB shape. Pulled from `supabase/migrations/` (numbered files).
> The live truth lives in Supabase project `gbkwydsodondarccqyet`.
> Re-run `node scripts/export-truth.js` for current row counts in
> `docs/OPERATOR_SOURCE_OF_TRUTH.md`.

## 1. Core product graph

### `products` (001 + later migrations)

- `id uuid PK`
- `name text not null`
- `slug text unique`
- `brand text`
- `category text`
- `description text`
- `affiliate_url text not null` — historical primary affiliate link (still required by older
  inserts; new inserts also use `affiliate_programs`).
- `price_usd numeric`
- `commission_rate numeric`
- `target_keyword text`, `secondary_keywords text`
- `search_intent text`, `content_angle text`
- `status text` — lifecycle (e.g. `intake_complete`, `published_first_post`, etc.)
- `internal_notes text`
- timestamps + updated_at

### `affiliate_programs` (011)

One product can have multiple programs (different networks).

- `id uuid PK`
- `product_id uuid FK -> products`
- `program_name text not null`
- `network text` — `Impact`, `PartnerStack`, `Reditus`, `CJ / Direct`, `Direct`, `Tolt`, etc.
- `status text` — `research_needed`, `signup_needed`, `submitted`, `awaiting_human_approval`,
  `link_ready`, `closed`, `rejected`
- `affiliate_link text` — only valid when `status = 'link_ready'`
- timestamps

### `campaign_links` (008)

UTM-tagged variants of affiliate links.

- `id uuid PK`
- `product_id uuid`
- `affiliate_program_id uuid`
- `name text` — operator label
- `base_url text`, `utm_*` columns
- `final_url text` — built URL
- timestamps

## 2. Content pipeline

### `source_contents` (014)

Editorial source for a product (one per product per campaign angle).

- `id uuid PK`
- `product_id uuid`
- `campaign_name text`
- `angle text`
- `title text`, `body text`
- `target_keyword text`
- `content_hash text` — change tracking
- `status text` — `active`, `draft`
- timestamps

### `platform_adaptations` (014 + 015 + 016)

Per-platform adaptation of a `source_content`.

- `id uuid PK`
- `source_content_id uuid`
- `product_id uuid`
- `platform text` — `linkedin | medium | substack | quora | reddit | tiktok | facebook_page |
  instagram_professional | pinterest | x_twitter | youtube` (legacy `tiktok` may still appear)
- `title text`, `body text`
- `content_hash text`
- `quality_checks jsonb`
- `auto_quality_status text` — `pending` / `auto_quality_passed` / `blocked`
- `blocking_reason text`
- `policy_check_status text` — `unknown` / `allowed` / `prohibited` / `unclear`
- `policy_checked_at timestamptz`
- `policy_source_url text`, `policy_notes text`
- `publish_mode text` — `auto` / `manual` / `executor`
- `manual_fallback_required boolean`
- `output_verification_required boolean`
- `campaign_link_id uuid`, `campaign_link_url text`
- `campaign_approval_status text`
- timestamps

### `content_drafts` (001 + 002)

Legacy long-form draft store (still used by older review flow).

- `id uuid PK`
- `product_id uuid`
- `template_type text` — `review | comparison | buying_guide | social_post | tiktok_script |
  quora_answer | reddit_post`
- `title text`, `body text`, `meta_title text`, `meta_description text`
- `quality_checks jsonb`, `quality_status text`
- `target_keyword text`
- `status text` — `draft` / `needs_review` / `approved` / `rejected`
- timestamps

### `draft_versions` (006)

Append-only version log per draft.

- `id uuid PK`
- `draft_id uuid`
- `version int`
- snapshot fields (`title`, `body`, etc.)
- `created_by text`, `created_at timestamptz`

### `final_copies` (018) — stable publish copy

The thing that actually gets approved + published.

- `id uuid PK`
- `product_id uuid`
- `affiliate_program_id uuid`
- `affiliate_link text`
- `source_content_id uuid`
- `platform_adaptation_id uuid`
- `platform text` — same enum as adaptations
- `title text`, `body text`
- `content_hash text`
- `version int`
- `status text` — `draft_internal` / `ready_for_operator_approval` / `validated` /
  `operator_approved` / `ready_for_manual_publish` / `needs_system_fix` / `published_verified`
- `validation_status text` — `valid` / `fix_requested` / `unknown`
- `blocking_reasons text[]`
- timestamps

## 3. Approval flow

### `approval_items` (012)

Unified approval queue (campaign, draft, final copy, publish).

- `id uuid PK`
- `kind text` — `campaign_approval` / `final_copy_approval` / `publish_confirmation`
- `subject_id uuid` — points at the row being approved
- `subject_type text`
- `status text` — `open` / `approved` / `rejected` / `fix_requested`
- `decided_by text`, `decided_at timestamptz`
- `notes text`
- timestamps

### `campaigns` + `campaign_approvals` (014 + 017)

Per-product campaign decision (which platforms a product is allowed to publish to).

- `campaigns`: id, product_id, source_content_id, name, status, created_at
- `campaign_approvals`: id, campaign_id, source_content_id, status, approved_platforms text[],
  decided_by, decided_at, notes

## 4. Publish pipeline

### `publish_jobs` (019 + 020 + 021 + 022)

One job per final_copy that MENI approved for publishing.

- `id uuid PK`
- `product_id uuid`
- `final_copy_id uuid`
- `platform text`
- `executor_type text` — `medium_browser`, `substack_browser`, `linkedin_official_api`, etc.
- `status text` — `pending_meni_approval`, `approved_waiting_executor`,
  `blocked_executor_not_connected`, `blocked_policy`, `requires_auth`,
  `pending_operator_confirmation`, `running`, `waiting_url_verification`, `verified`,
  `needs_system_fix`, `failed_needs_system_fix`
- `blocking_reason text`
- `live_url text` — set only when executor returns a URL
- `verified_at timestamptz` — set only after URL is independently verified
- timestamps

### `published_records`

The canonical "this is live" log.

- `id uuid PK`
- `product_id uuid`
- `source_content_id uuid`
- `platform_adaptation_id uuid`
- `platform text`
- `live_url text not null`
- `verification_status text` — `verified`, `failed`, etc.
- `verified_at timestamptz`
- `final_copy_id uuid`
- `campaign_approval_id uuid`
- timestamps

> A post counts as **published** **only** when it has a row here with
> `verification_status='verified'` and a non-empty `live_url`. All other states are work in
> progress.

## 5. Connections + browser helper

### `platform_connections` (023)

OAuth / token state per platform. Only mirrors the `status`, not the secrets.

- `id uuid PK`
- `platform text` — `x_twitter`, `linkedin`, `facebook_page`, etc.
- `status text` — `connected`, `pending_oauth`, `expired`, `revoked`, `not_started`
- `connected_account_label text`
- timestamps

### `browser_sessions` / `browser_jobs` / `browser_events` (013)

Used by the browser helper extension to run real publish jobs through Medium / Substack / etc.

- `browser_sessions`: id, helper_name, instance_id, status, active_tab_*, last_seen_at
- `browser_jobs`: id, session_id, platform, payload, status, result, created_at
- `browser_events`: id, session_id, event_type, payload, created_at

## 6. Metrics + ops

### `performance_metrics` (004 + 009)

Real-world performance ingested from affiliate networks.

- `id uuid PK`
- `product_id uuid`, `campaign_link_id uuid`, `channel text`
- `clicks int`, `conversions int`, `revenue numeric`
- `recorded_at date`
- timestamps

### `improvement_tasks` (007)

Issues that the operator should fix later.

- `id uuid PK`
- `kind text`, `severity text`
- `subject_id uuid`, `subject_type text`
- `description text`
- `status text` — `open` / `closed` / `wontfix`
- timestamps

### `saved_views` (010)

Persisted dashboard filters per user.

- `id uuid PK`
- `name text`, `payload jsonb`
- timestamps
