"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bookmark,
  Bot,
  Building2,
  CheckSquare,
  ClipboardList,
  Command,
  ExternalLink,
  FileBarChart,
  FileText,
  FolderKanban,
  Languages,
  LayoutDashboard,
  LogOut,
  Package2,
  Send,
  Shield,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const englishNavigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package2 },
  { href: "/dashboard/command-center", label: "Command Center", icon: Command },
  { href: "/dashboard/operator", label: "Operator", icon: ClipboardList },
  { href: "/dashboard/he", label: "Hebrew", icon: Languages },
  { href: "/dashboard/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/dashboard/drafts", label: "Drafts", icon: FileText },
  { href: "/dashboard/publishing", label: "Publishing", icon: Send },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: FolderKanban },
  { href: "/dashboard/campaign-links", label: "Campaign Links", icon: ExternalLink },
  { href: "/dashboard/affiliate-programs", label: "Affiliate Programs", icon: Building2 },
  { href: "/dashboard/performance", label: "Performance", icon: Activity },
  { href: "/dashboard/improvements", label: "Improvements", icon: ClipboardList },
  { href: "/dashboard/reports", label: "Reports", icon: FileBarChart },
  { href: "/dashboard/data-quality", label: "Data Quality", icon: AlertTriangle },
  { href: "/dashboard/saved-views", label: "Saved Views", icon: Bookmark },
  { href: "/dashboard/system", label: "System", icon: Shield },
]

const hebrewNavigation = [
  { href: "/dashboard/he", label: "בית", icon: LayoutDashboard },
  { href: "/dashboard/he/campaigns", label: "קמפיינים", icon: FolderKanban },
  { href: "/dashboard/he/content-review", label: "בדיקת קופי", icon: FileText },
  { href: "/dashboard/he/approve", label: "אישור טיוטות", icon: CheckSquare },
  { href: "/dashboard/he/publish-ready", label: "מוכן לפרסום", icon: Send },
  { href: "/dashboard/he/browser-control", label: "שליטה בדפדפן", icon: Bot },
  { href: "/dashboard/he#products", label: "מוצרים", icon: Package2 },
  { href: "/dashboard/he#programs", label: "תוכניות שותפים", icon: Building2 },
  { href: "/dashboard/he#published", label: "מה פורסם", icon: Send },
  { href: "/dashboard/he#where", label: "איפה פורסם", icon: ExternalLink },
  { href: "/dashboard/he#pending", label: "מחכה לאישור", icon: CheckSquare },
  { href: "/dashboard/he#rejected", label: "נדחה", icon: AlertTriangle },
  { href: "/dashboard/he#actions", label: "פעולה עכשיו", icon: Command },
  { href: "/dashboard/he#performance", label: "נתונים אמיתיים", icon: Activity },
  { href: "/dashboard/operator", label: "English", icon: Languages },
]

export function DashboardSidebar({
  pendingApprovalCount = 0,
}: {
  pendingApprovalCount?: number
}) {
  const pathname = usePathname()
  const isHebrew = pathname === "/dashboard/he" || pathname.startsWith("/dashboard/he/")
  const navigation = isHebrew ? hebrewNavigation : englishNavigation

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
          {isHebrew ? "דשבורד מפעיל" : "MVP Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isHebrew
            ? "אותה מערכת, אותם נתונים, ממשק עברי לעבודה יומית."
            : "Products, AI drafts, human approval, publishing queue, performance tracking."}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (!item.href.includes("#") && pathname.startsWith(`${item.href}/`))

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
                  <span className="flex-1">{item.label}</span>
                  {!isHebrew && item.href === "/dashboard/approvals" && pendingApprovalCount > 0 ? (
                    <Badge variant="destructive" className="ml-auto px-1.5 py-0 text-xs">
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
          {isHebrew ? "פרסום חי כבוי עד שיש URL אמיתי." : "Live publishing is disabled."}
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
