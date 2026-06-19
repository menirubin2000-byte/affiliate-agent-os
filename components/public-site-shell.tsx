import Link from "next/link"
import type { ReactNode } from "react"

type ActivePage = "home" | "software" | "products" | "guides" | "terms" | "privacy" | "accessibility"

export function PublicSiteShell({
  active,
  children,
}: {
  active: ActivePage
  children: ReactNode
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-white text-slate-950">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Rubin-Q.S Reviews
          </Link>
          <ul className="flex items-center gap-6 text-sm font-medium text-slate-600">
            <li>
              <Link href="/software" className={active === "software" ? "font-semibold text-slate-950" : "hover:text-slate-950"}>
                תוכנות
              </Link>
            </li>
            <li>
              <Link href="/products" className={active === "products" ? "font-semibold text-slate-950" : "hover:text-slate-950"}>
                מוצרים
              </Link>
            </li>
            <li>
              <Link href="/guides" className={active === "guides" ? "font-semibold text-slate-950" : "hover:text-slate-950"}>
                Guides
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className={active === "terms" ? "font-semibold text-slate-950" : "hover:text-slate-950"}>
                תנאים
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className={active === "privacy" ? "font-semibold text-slate-950" : "hover:text-slate-950"}>
                פרטיות
              </Link>
            </li>
            <li>
              <Link href="/accessibility" className={active === "accessibility" ? "font-semibold text-slate-950" : "hover:text-slate-950"}>
                נגישות
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>

      <footer className="border-t bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Rubin Quantum Systems. כל הזכויות שמורות.</p>
          <ul className="flex gap-6">
            <li><Link href="/legal/terms" className="hover:text-slate-950">תנאי שימוש</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-slate-950">מדיניות פרטיות</Link></li>
            <li><Link href="/accessibility" className="hover:text-slate-950">נגישות</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  )
}
