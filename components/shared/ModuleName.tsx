//components/shared/ModuleName.tsx
"use client"

import { usePathname } from "next/navigation"
import clsx from "clsx"

type ModuleNameProps = {
  className?: string
}

function formatModuleName(raw: string) {
  if (!raw) return ""
  return raw
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-")
}

export function ModuleName({ className }: ModuleNameProps) {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const moduleSegment = segments[0] ?? ""
  const label = formatModuleName(moduleSegment)

  if (!label) return null

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5",
        "text-sm font-semibold tracking-[0.18em] uppercase",
        "bg-background/80 shadow-sm backdrop-blur-sm",
        "text-foreground",
        "max-w-[14rem] truncate",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {label}
    </span>
  )
}
