import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { NextAction } from "@/types/workflow"

export function NextActionLink({ action }: { action: NextAction }) {
  return (
    <Link
      href={action.href}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
    >
      {action.label}
    </Link>
  )
}
