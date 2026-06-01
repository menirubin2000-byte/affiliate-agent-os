import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const TITLE = "Systeme.io Review: Funnels, Email Marketing, and Online Courses in One Platform"

const BODY = `Affiliate disclosure: This post contains an affiliate link. If you sign up or buy through it, I may earn a commission at no extra cost to you.

Systeme.io is an all-in-one marketing platform for people who want to build funnels, landing pages, email campaigns, automations, websites, online courses, and digital product sales from one place.

The main reason to consider Systeme.io is simplicity. Instead of connecting a separate funnel builder, email tool, course platform, website builder, and automation tool, Systeme.io puts the core pieces inside one account.

This can be useful for solo operators, creators, freelancers, and small online businesses that want to launch faster without building a complicated tech stack.

It is best for people who need:

* sales funnels
* landing pages
* email marketing
* simple automations
* websites
* online courses
* digital product sales

The biggest advantage is that it can reduce setup friction. If you are testing an offer, building a simple funnel, or starting an online business, using one platform can be easier than managing several tools at once.

The tradeoff is depth. An all-in-one platform may not replace every advanced feature from specialized tools. If you need advanced CRM workflows, enterprise email automation, or very custom website control, you should compare Systeme.io carefully against dedicated platforms.

Systeme.io is a practical option for beginners and small operators who care more about launching and testing than building a complex software stack.

Who it is for:

* beginners building their first funnel
* creators selling digital products
* small businesses testing offers
* operators who want email and funnels in one place
* people who want a simpler setup

Who it is not for:

* teams that need enterprise-level customization
* users who already have a full advanced stack
* buyers who need very deep features in every category
* people who want separate specialized tools for each workflow

Overall, Systeme.io is worth checking if your goal is to keep your marketing setup simple and move faster with funnels, email, courses, and automations from one platform.

Check the current details here:
https://systeme.io/?sa=sa0272930337c3024fcafe085f6b63e73bbc0e3365`

const ids = [
  { id: "3282aef9-290d-4275-a7f1-67bfccff323b", label: "Substack review" },
  { id: "82454a78-3050-46c9-9b5c-a3d94efd1fd5", label: "LinkedIn social_post" },
]

for (const u of ids) {
  const { error } = await supabase
    .from("content_drafts")
    .update({
      title: TITLE,
      body: BODY,
      meta_title: TITLE.slice(0, 60),
      meta_description: "Systeme.io review — funnels, email marketing, online courses, and websites in one platform for solo operators and creators.",
      target_keyword: "systeme.io review",
      quality_checks: {
        has_disclosure: true,
        has_clear_cta: true,
        has_target_keyword: true,
        has_meta_title: true,
        has_meta_description: true,
        avoids_fake_claims: true,
        has_required_structure: true,
      },
    })
    .eq("id", u.id)

  if (error) console.error(`FAIL ${u.label}: ${error.message}`)
  else console.log(`UPDATED ${u.label} (${u.id}) — ${BODY.length} chars`)
}

console.log("\nDone. Both drafts now use the approved post content.")
