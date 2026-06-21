import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function HebrewApprovePage() {
  return (
    <div dir="rtl" className="space-y-6 text-right">
      <PageHeader
        eyebrow="אישור תוכן"
        title="אישור טיוטות - הדוח הארוך הוסר"
        description="המסך הזה כבר לא מציג רשימת ענק של כל המוצרים, הפלטפורמות והאישורים. עובדים לפי מוצר אחד בכל פעם."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/products" className={cn(buttonVariants({ variant: "default" }))}>
              פתח מוצרים
            </Link>
            <Link href="/dashboard/he/content-review" className={cn(buttonVariants({ variant: "outline" }))}>
              בדיקת קופי
            </Link>
            <Link href="/dashboard/he" className={cn(buttonVariants({ variant: "outline" }))}>
              חזרה לדשבורד
            </Link>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>איך עובדים עכשיו</CardTitle>
          <CardDescription>
            לא מאשרים מאות פריטים ממסך אחד. פותחים מוצר, בודקים פלטפורמה ושפה, עורכים את הפוסט המלא ואז מאשרים.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. לחץ על פתח מוצרים.</p>
          <p>2. בחר מוצר אחד.</p>
          <p>3. פתח את הפלטפורמה והשפה שאתה רוצה לעבוד עליהן.</p>
          <p>4. ערוך את הפוסט המלא מתוך מסך המוצר או בדיקת הקופי.</p>
          <p>5. אשר רק אחרי שראית את הטקסט.</p>
          <p className="font-medium text-foreground">
            לא נמחקו פוסטים, לא נמחקו פלטפורמות, ולא שונה מידע במסד הנתונים.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
