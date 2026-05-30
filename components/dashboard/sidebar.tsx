"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bookmark,
  Building2,
  CheckSquare,
  ClipboardList,
  Command,
  ExternalLink,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LogOut,
  Package2,
  Send,
  Shield,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const navigation = [
  {
    href: "/dashboard",
    label: "Overview",
    hebrewLabel: "סקירה באנגלית",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/products",
    label: "Products",
    hebrewLabel: "מוצרים",
    icon: Package2,
  },
  {
    href: "/dashboard/command-center",
    label: "Command Center",
    hebrewLabel: "מרכז פעולות",
    icon: Command,
  },
  {
    href: "/dashboard/operator",
    label: "Operator",
    hebrewLabel: "מפעיל באנגלית",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/he",
    label: "Hebrew Home",
    hebrewLabel: "בית בעברית",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/approvals",
    label: "Approvals",
    hebrewLabel: "אישורים",
    icon: CheckSquare,
  },
  {
    href: "/dashboard/drafts",
    label: "Drafts",
    hebrewLabel: "טיוטות",
    icon: FileText,
  },
  {
    href: "/dashboard/publishing",
    label: "Publishing",
    hebrewLabel: "הפצה",
    icon: Send,
  },
  {
    href: "/dashboard/campaign-links",
    label: "Campaign Links",
    hebrewLabel: "קישורי קמפיין",
    icon: ExternalLink,
  },
  {
    href: "/dashboard/affiliate-programs",
    label: "Affiliate Programs",
    hebrewLabel: "תוכניות שותפים",
    icon: Building2,
  },
  {
    href: "/dashboard/performance",
    label: "Performance",
    hebrewLabel: "ביצועים",
    icon: Activity,
  },
  {
    href: "/dashboard/improvements",
    label: "Improvements",
    hebrewLabel: "משימות שיפור",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    hebrewLabel: "דוחות",
    icon: FileBarChart,
  },
  {
    href: "/dashboard/data-quality",
    label: "Data Quality",
    hebrewLabel: "איכות נתונים",
    icon: AlertTriangle,
  },
  {
    href: "/dashboard/saved-views",
    label: "Saved Views",
    hebrewLabel: "תצוגות שמורות",
    icon: Bookmark,
  },
  {
    href: "/dashboard/system",
    label: "System",
    hebrewLabel: "מערכת",
    icon: Shield,
  },
]

export function DashboardSidebar({
  pendingApprovalCount = 0,
}: {
  pendingApprovalCount?: number
}) {
  const pathname = usePathname()
  const isHebrew = pathname === "/dashboard/he" || pathname.startsWith("/dashboard/he/")

  return (
    <aside
      dir={isHebrew ? "rtl" : "ltr"}
      className="flex h-full w-full flex-col border-r border-border/70 bg-card/60"
    >
      <div className="border-b border-border/70 px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Affiliate Agent OS
        </p>
        <h1 className="mt-2 text-lg font-semibold">
          {isHebrew ? "דשבורד MVP" : "MVP Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isHebrew
            ? "מוצרים, טיוטות, אישור אנושי, הפצה ידנית ומדידת ביצועים."
            : "Products, AI drafts, human approval, publishing queue, performance tracking."}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                  >
                  <item.icon className="size-4" />
                  <span className="flex-1">{isHebrew ? item.hebrewLabel : item.label}</span>
                  {item.href === "/dashboard/approvals" && pendingApprovalCount > 0 ? (
                    <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0">
                      {pendingApprovalCount}
                    </Badge>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-border/70 px-6 py-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4" />
          {isHebrew ? "פרסום חי כבוי." : "Live publishing is disabled."}
        </div>
        <a
          href="/logout"
          className="mt-3 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-4" />
          {isHebrew ? "יציאה" : "Log out"}
        </a>
      </div>
    </aside>
  )
}
