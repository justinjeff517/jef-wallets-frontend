/* src/components/shared/HeaderNavbar.tsx */
"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"

import { ModuleBreadcrumb } from "@/components/shared/ModuleBreadcrumb"
import { ProfileDropdown } from "@/components/shared/ProfileDropdown"

type Props = {
  className?: string
  containerClassName?: string

  title?: string
  titleClassName?: string
  titleFallback?: string

  showBreadcrumb?: boolean
  breadcrumbClassName?: string

  maxWidthClassName?: string
}

function titleFromPath(pathname: string) {
  const p = (pathname || "/").split("?")[0].split("#")[0]
  const segs = p.split("/").filter(Boolean)

  const moduleRoot = segs[0] === "app" ? segs[1] : segs[0]
  const root = (moduleRoot || "").trim()
  if (!root) return ""

  const s = root.replace(/[-_]+/g, " ").trim()
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function HeaderNavbar(props: Props) {
  const pathname = usePathname()

  useMemo(() => {
    const fromProp = (props.title || "").trim()
    if (fromProp) return fromProp

    const fromPublicEnv = (process.env.NEXT_PUBLIC_MODULE_NAME || "").trim()
    if (fromPublicEnv) return fromPublicEnv

    const fromPath = titleFromPath(pathname)
    if (fromPath) return fromPath

    return (props.titleFallback || "Module").trim() || "Module"
  }, [props.title, props.titleFallback, pathname])

  const showBreadcrumb = props.showBreadcrumb !== false

  return (
    <header
      className={[
        "sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "mx-auto flex h-10 w-full items-center gap-2 px-3",
          props.maxWidthClassName || "max-w-5xl",
          props.containerClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* CENTER: Breadcrumb */}
        <div className="flex flex-1 items-center justify-start overflow-hidden px-2">
          {showBreadcrumb ? (
            <div className="min-w-0 max-w-full">
              <ModuleBreadcrumb
                className={[
                  "truncate text-xs font-semibold leading-none tracking-tight",
                  props.breadcrumbClassName,
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </div>
          ) : null}
        </div>

        {/* RIGHT: Profile */}
        <div className="flex shrink-0 items-center justify-end">
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}
