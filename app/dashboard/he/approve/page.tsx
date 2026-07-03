import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default function HebrewApproveHubPage() {
  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="אישור טיוטות"
        title="בחירת קטגוריית אישור"
        description="האישור מפוצל לשני דפים: תוכנות ומוצרים. בכל דף רואים את כל הפריטים של אותה קטגוריה, את כל 12 הפלטפורמות, אפשר לסמן פלטפורמות, לערוך את הטקסט למסומנות ולאשר את המסומנות."
      />
      <section className="grid gap-4 md:grid-cols-2">
        <ApprovalCategoryLink
          href="/dashboard/he/approve/software"
          title="אישור תוכנות"
          description="כל התוכנות, כל 12 הפלטפורמות, סימון פלטפורמות, מגבלת תווים ועריכה למסומנות."
        />
        <ApprovalCategoryLink
          href="/dashboard/he/approve/products"
          title="אישור מוצרים"
          description="כל המוצרים, כל 12 הפלטפורמות, סימון פלטפורמות, מגבלת תווים ועריכה למסומנות."
        />
      </section>
    </div>
  )
}

function ApprovalCategoryLink({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href} className={cn(buttonVariants(), "w-full")}>פתח דף אישור</Link>
      </CardContent>
    </Card>
  )
}
