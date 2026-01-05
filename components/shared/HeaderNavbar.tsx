/* src/components/shared/HeaderNavbar.tsx */
"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"

import { ModuleBreadcrumb } from "@/components/shared/ModuleBreadcrumb"

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

  const title = useMemo(() => {
    const fromProp = (props.title || "").trim()
    if (fromProp) return fromProp

    // optional client-side fallback (if you ever set it)
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
          "mx-auto grid h-10 w-full grid-cols-8 items-center gap-2 px-3",
          props.maxWidthClassName || "max-w-5xl",
          props.containerClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="col-span-2 min-w-0">
          <div
            className={[
              "truncate text-[13px] font-semibold leading-none tracking-tight text-foreground",
              props.titleClassName,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui" }}
            title={title}
          >
            {title}
          </div>
        </div>

        <div className="col-span-6 min-w-0 overflow-hidden">
          <div className="flex w-full min-w-0 items-center overflow-hidden">
            {showBreadcrumb ? (
              <ModuleBreadcrumb
                className={[
                  "min-w-0 max-w-full truncate text-xs font-semibold leading-none tracking-tight",
                  props.breadcrumbClassName,
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
