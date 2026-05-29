# Platform Setup Checklist

Step-by-step setup for each platform Claude Code will operate on behalf of the operator.

**Last updated**: 2026-05-30

---

## LinkedIn

### Setup
- [ ] Human logs into LinkedIn in the Chrome browser with Claude extension
- [ ] Claude verifies browser access via `tabs_context_mcp`
- [ ] Claude can navigate to linkedin.com and see the feed

### Publishing workflow
- [ ] Claude prepares post text from approved distribution draft
- [ ] Claude presents final text to operator for approval
- [ ] Operator replies "Approved to publish"
- [ ] Claude opens LinkedIn > Start a post
- [ ] Claude pastes the approved text into the post composer
- [ ] Claude verifies disclosure is visible in the post
- [ ] Claude verifies the campaign link is the LinkedIn-specific URL
- [ ] Claude clicks Post
- [ ] Claude captures the post URL from the published post
- [ ] Claude records: date, platform, campaign link, post URL in publish log
- [ ] Claude creates improvement task: "Check LinkedIn performance after first share"

### Boundaries
- Human handles: login, CAPTCHA, 2FA, email verification, connection requests
- Claude does NOT: send connection requests, message other users, modify profile settings, accept invitations

---

## Medium

### Setup
- [ ] Human logs into Medium in the Chrome browser with Claude extension
- [ ] Claude verifies browser access via `tabs_context_mcp`
- [ ] Claude can navigate to medium.com and see the dashboard

### Publishing workflow
- [ ] Claude prepares article from approved distribution draft
- [ ] Claude presents final text to operator for approval
- [ ] Operator replies "Approved to publish"
- [ ] Claude opens Medium > Write / New story
- [ ] Claude pastes the approved article content
- [ ] Claude adds relevant tags
- [ ] Claude verifies affiliate disclosure is near the top of the article
- [ ] Claude verifies the campaign link is the Medium-specific URL
- [ ] Claude clicks Publish
- [ ] Claude captures the article URL
- [ ] Claude records: date, platform, campaign link, article URL in publish log

### Boundaries
- Human handles: login, 2FA, Medium Partner Program enrollment
- Claude does NOT: change account settings, respond to comments without approval, follow/unfollow users

---

## Systeme.io Affiliate Dashboard

### Setup
- [ ] Human logs into systeme.io (handles 2FA if required)
- [ ] Claude verifies browser access
- [ ] Claude can navigate to the affiliate dashboard

### Operations
- [ ] Claude inspects affiliate link and stats
- [ ] Claude copies real affiliate link to update Affiliate Agent OS DB
- [ ] Claude reads commission/performance data for reporting

### Boundaries
- Human handles: login, 2FA, account settings, payment setup
- Claude does NOT: create funnels, send emails, modify account, change affiliate settings

---

## Substack / Beehiiv (future)

### Setup
- [ ] Operator creates account on chosen newsletter platform
- [ ] Human logs in via Chrome browser
- [ ] Claude verifies browser access

### Publishing workflow
- [ ] Claude prepares newsletter draft from approved content
- [ ] Claude presents final text to operator for approval
- [ ] Operator replies "Approved to publish"
- [ ] Claude creates draft in the platform editor
- [ ] Claude verifies disclosure and campaign link
- [ ] Claude clicks Send/Publish
- [ ] Claude records: date, platform, campaign link, newsletter URL

### Boundaries
- Human handles: account creation, subscriber imports, payment/billing, DNS/domain setup
- Claude does NOT: delete subscribers, change billing, modify DNS settings

---

## Reddit / Communities (future)

### Setup
- [ ] Operator creates Reddit account (or uses existing)
- [ ] Human logs in via Chrome browser
- [ ] Claude verifies browser access

### Pre-publish checks (required for every subreddit)
- [ ] Claude reads the subreddit rules
- [ ] Claude checks if self-promotion or affiliate links are allowed
- [ ] Claude checks minimum account age / karma requirements
- [ ] If rules prohibit affiliate links: Claude prepares a value-first post without direct affiliate link and asks operator how to proceed

### Publishing workflow
- [ ] Claude prepares post/comment from approved content
- [ ] Claude presents final text with subreddit rule compliance notes
- [ ] Operator replies "Approved to publish"
- [ ] Claude posts to the subreddit
- [ ] Claude records: date, subreddit, campaign link (if allowed), post URL

### Boundaries
- Human handles: account creation, CAPTCHA, subreddit joining, moderator interactions
- Claude does NOT: upvote/downvote, mass-post to multiple subreddits, use multiple accounts, evade bans

---

## X / Twitter (future)

### Setup
- [ ] Operator creates account (or uses existing)
- [ ] Human logs in via Chrome browser
- [ ] Claude verifies browser access

### Publishing workflow
- [ ] Claude prepares tweet/thread from approved content
- [ ] Claude presents final text to operator for approval
- [ ] Operator replies "Approved to publish"
- [ ] Claude posts the tweet/thread
- [ ] Claude verifies disclosure is included
- [ ] Claude records: date, platform, campaign link, tweet URL

### Boundaries
- Human handles: account creation, 2FA, verification, DM responses
- Claude does NOT: follow/unfollow, like/retweet without approval, send DMs, change account settings

---

## GitHub

### Setup
- [x] CLI auth configured (`gh` command available)
- [x] Push access to repo

### Operations
- [x] Claude commits and pushes code changes
- [x] Claude creates PRs and issues
- [ ] Claude creates releases (requires operator approval)

### Boundaries
- Human handles: force push approval, branch protection changes, repo settings, collaborator management
- Claude does NOT: force push, delete branches without approval, change repo visibility, modify access controls

---

## Vercel

### Setup
- [x] Project connected to repo
- [x] Env vars configured

### Operations
- [x] Claude monitors deployments
- [x] Claude checks build logs

### Boundaries
- Human handles: env var changes, domain configuration, production deployments, billing
- Claude does NOT: modify env vars, change domains, adjust billing, delete projects

---

## Supabase

### Setup
- [x] Service role key in `.env.local`
- [x] All migrations applied

### Operations
- [x] Claude runs queries via REST API
- [x] Claude applies migrations
- [x] Claude seeds data

### Boundaries
- Human handles: project deletion, password resets, billing, auth policy changes
- Claude does NOT: delete projects, reset passwords, modify RLS policies without approval, drop tables without approval
