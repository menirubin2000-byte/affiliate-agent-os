# Publishing Policy

Rules governing all content publishing from Affiliate Agent OS to external platforms.

**Last updated**: 2026-05-30

## Core Rules

1. **No publish without explicit approval.** Claude prepares and presents content. The operator must reply with "Approved" or "Approved to publish" before Claude clicks any publish/post/submit button.

2. **No fake reviews.** Never invent personal testing experiences, usage periods, or product evaluations that did not happen.

3. **No fake ratings.** Never assign star ratings, numerical scores, or ranking positions unless sourced from verified third-party data with attribution.

4. **No fake earnings claims.** Never state specific income, revenue, or savings amounts unless the operator provides verifiable real data.

5. **No fake testimonials.** Never create quotes attributed to users, customers, or third parties.

6. **No fake discounts or offers.** Never invent promotional pricing, limited-time deals, or coupon codes.

7. **Affiliate disclosure must be visible.** Every published piece containing an affiliate link must include a clear FTC-style disclosure. The disclosure must appear before or near the affiliate link, not hidden at the bottom.

8. **Use correct channel-specific campaign link.** Each platform has its own campaign link with UTM parameters. Never use the wrong channel's link. Never strip or modify the affiliate `sa` parameter.

9. **Preserve affiliate parameters.** The `sa=` parameter in Systeme.io links (and equivalent parameters for other programs) must never be removed or altered.

10. **Respect platform rules.** Before publishing on any platform, verify the content complies with that platform's terms of service, community guidelines, and self-promotion policies.

11. **If unsure, save as draft and ask.** When Claude is uncertain whether content meets these rules or platform guidelines, save as draft and present to the operator for review.

## Disclosure Templates

### Standard inline disclosure
```
Affiliate disclosure: The link below is an affiliate link. If you sign up for a paid plan through it, I may earn a commission at no extra cost to you.
```

### Short disclosure (for character-limited platforms)
```
Affiliate disclosure: link below is an affiliate link.
```

### First-comment disclosure
```
Affiliate disclosure: The link in this post is an affiliate link. If you visit [Product] through it and later choose a paid plan, I may earn a commission at no extra cost to you.
```

## Approval Flow

```
Claude prepares content
    |
    v
Claude presents final text to operator
    |
    v
Operator reviews checklist:
  - Disclosure visible?
  - Campaign link correct?
  - No unsupported claims?
  - No fake language?
  - No spammy wording?
  - Platform rules followed?
    |
    v
Operator replies: "Approved to publish"
    |
    v
Claude publishes via browser
    |
    v
Claude records: post URL, date, platform, campaign link
    |
    v
Claude creates tracking task for performance check
```

## What Happens If Approval Is Not Given

- Content stays as a draft document in `docs/`.
- No external action is taken.
- Claude asks the operator for edits or alternative instructions.

## What Happens If Claude Cannot Publish

- Login/CAPTCHA/2FA blocks: Claude stops and asks the operator to complete authentication.
- Platform error: Claude captures the error, reports to the operator, and does not retry without permission.
- Content rejected by platform: Claude reports the rejection reason and asks for guidance.

## Performance Tracking After Publishing

- Do not create fake performance records.
- After publishing, create an improvement task: "Check [platform] performance after first share."
- Record real metrics only when they are observable (platform analytics, UTM tracking, affiliate dashboard).
- Recommended first check: 48-72 hours after publishing.
