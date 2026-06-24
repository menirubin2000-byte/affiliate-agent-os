import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const HOME_RULES_WARNING_TITLE = "לפני פרסום חובה לקרוא את הכללים באדום למעלה"
const HOME_RULES_WARNING_DESCRIPTION =
  "אסור לפרסם פוסט לא מאושר. לפני כל פרסום, אישור או סקריפט חובה לפתוח את דף הכללים ולעבור עליו."
const HOME_RULES_WARNING_CTA = "פתח כללים לפני פרסום"

export function RulesWarningCards() {
  return (
    <>
      <Card className="border-destructive/50 bg-destructive/10">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-destructive">{HOME_RULES_WARNING_TITLE}</CardTitle>
            <CardDescription>{HOME_RULES_WARNING_DESCRIPTION}</CardDescription>
          </div>
          <Link href="/dashboard/he/claude-rules" className={cn(buttonVariants({ variant: "destructive" }))}>
            {HOME_RULES_WARNING_CTA}
          </Link>
        </CardHeader>
      </Card>

      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-destructive">כללים לקלוד - חובה לקרוא לפני הפעלה</CardTitle>
            <CardDescription>
              לפני כל פרסום / אישור / סקריפט - קלוד חייב לעבור על הצ׳קליסט. בלי זה אסור להגיד &quot;אי אפשר&quot;.
            </CardDescription>
          </div>
          <Link href="/dashboard/he/claude-rules" className={cn(buttonVariants({ variant: "destructive" }))}>
            פתח כללים לקלוד
          </Link>
        </CardHeader>
      </Card>
    </>
  )
}
