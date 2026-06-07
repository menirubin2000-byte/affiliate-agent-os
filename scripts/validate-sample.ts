import { validateFinalMediumArticle } from "../lib/content-review"

const body = `Affiliate disclosure: this post includes an affiliate link. We may earn a commission if you sign up.

GetResponse — Email marketing platform with landing pages, webinars, and automation.

A practical option for commercial.

## Call to action
Try GetResponse: https://try.getresponsetoday.com/lnnr40k51ywy`

const result = validateFinalMediumArticle({ body, finalAffiliateLink: "https://try.getresponsetoday.com/lnnr40k51ywy" })
console.log(JSON.stringify(result, null, 2))
