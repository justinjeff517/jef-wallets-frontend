/* src/components/shared/ModuleBreadcrumb.tsx */
"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Crumb = { label: string; href?: string }
type Group = { label: string; onSelect?: () => void; href?: string }

type Props = {
  className?: string

  homeHref?: string
  homeLabel?: string

  crumbs?: Crumb[]
  current?: string
  overflow?: Group[]

  usePath?: boolean
  hideSegments?: string[]
  labelMap?: Record<string, string>
  labeler?: (segment: string, href: string, index: number, segments: string[]) => string

  maxItems?: number
  minItems?: number
  preferTail?: boolean
  treatGroupsAsOverflow?: boolean
  collapseToTwoLayersAt?: number
}

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

function titleize(s: string) {
  const t = asStr(s)
  if (!t) return "Item"
  return t
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ")
}

function safeDecode(seg: string) {
  try {
    return decodeURIComponent(seg)
  } catch {
    return seg
  }
}

function safeEncodeSegment(seg: string) {
  try {
    return encodeURIComponent(seg)
  } catch {
    return seg
  }
}

function clampInt(v: unknown, fallback: number, min: number, max: number) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  const i = Math.trunc(n)
  return Math.max(min, Math.min(max, i))
}

function uniqKey(label: string, href: string, idx: number) {
  return `${label}::${href || ""}::${idx}`
}

export function ModuleBreadcrumb(p?: Props) {
  const props = (p || {}) as Props
  const pathnameRaw = usePathname() || "/"

  const homeHref = asStr(props.homeHref) || "/"
  const homeLabel = asStr(props.homeLabel) || "Home"

  const usePath = props.usePath !== false
  const hideSegments = Array.isArray(props.hideSegments) ? props.hideSegments : ["app"]

  const labelMap = props.labelMap && typeof props.labelMap === "object" ? props.labelMap : undefined
  const labeler = typeof props.labeler === "function" ? props.labeler : undefined

  const maxItems = clampInt(props.maxItems, 2, 1, 20)
  const minItems = clampInt(props.minItems, 1, 1, 20)
  const preferTail = props.preferTail !== false
  const treatGroupsAsOverflow = props.treatGroupsAsOverflow !== false
  const collapseToTwoLayersAt = clampInt(props.collapseToTwoLayersAt, 4, 2, 20)

  const manualCrumbs = Array.isArray(props.crumbs) ? props.crumbs : null
  const manualCurrent = asStr(props.current)
  const extraOverflow = Array.isArray(props.overflow) ? props.overflow : []

  const built = useMemo(() => {
    if (manualCrumbs) {
      return { crumbs: manualCrumbs, current: manualCurrent, overflow: extraOverflow }
    }

    if (!usePath) {
      return { crumbs: [], current: manualCurrent, overflow: extraOverflow }
    }

    const pathname = (pathnameRaw || "/").trim() || "/"
    const rawSegs = pathname.split("/").filter(Boolean).map(safeDecode)
    const segs = rawSegs.filter((s) => !hideSegments.includes(s))

    const all: Crumb[] = []
    let acc = ""
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      acc += `/${safeEncodeSegment(seg)}`
      const href = acc || "/"
      const mapped = labelMap?.[seg]
      const label = labeler ? labeler(seg, href, i, segs) : mapped ? asStr(mapped) : titleize(seg)
      all.push({ label, href })
    }

    const autoCurrent = manualCurrent || (all.length ? asStr(all[all.length - 1].label) : "")
    const autoCrumbs = all.length ? all.slice(0, -1) : []

    if (autoCrumbs.length <= maxItems) {
      return { crumbs: autoCrumbs, current: autoCurrent, overflow: extraOverflow }
    }

    const visibleCount = Math.max(minItems, Math.min(maxItems, autoCrumbs.length))
    const keepHead = preferTail ? Math.max(1, visibleCount - 1) : Math.ceil(visibleCount / 2)
    const keepTail = Math.max(1, visibleCount - keepHead)

    const head = autoCrumbs.slice(0, keepHead)
    const tail = autoCrumbs.slice(autoCrumbs.length - keepTail)
    const middle = autoCrumbs.slice(keepHead, autoCrumbs.length - keepTail)

    const overflowFromPath: Group[] = (treatGroupsAsOverflow ? middle : []).map((c) => ({
      label: asStr(c.label) || "Item",
      href: asStr(c.href),
    }))

    return {
      crumbs: [...head, ...tail],
      current: autoCurrent,
      overflow: [...overflowFromPath, ...extraOverflow],
    }
  }, [
    pathnameRaw,
    manualCrumbs,
    manualCurrent,
    extraOverflow,
    usePath,
    hideSegments.join("|"),
    maxItems,
    minItems,
    preferTail,
    treatGroupsAsOverflow,
    labeler,
    labelMap ? JSON.stringify(labelMap) : "",
  ])

  const crumbs = Array.isArray(built.crumbs) ? built.crumbs : []
  const current = asStr(built.current)
  const overflow = Array.isArray(built.overflow) ? built.overflow : []

  const totalLayers = 1 + crumbs.length + (current ? 1 : 0)
  const collapseToTwoLayers = totalLayers >= collapseToTwoLayersAt

  const view = useMemo(() => {
    if (!collapseToTwoLayers) return { crumbs, current, dropdown: overflow }

    const allIntermediatesAsGroups: Group[] = crumbs.map((c) => ({
      label: asStr(c.label) || "Item",
      href: asStr(c.href),
    }))

    return {
      crumbs: [] as Crumb[],
      current,
      dropdown: [...allIntermediatesAsGroups, ...overflow],
    }
  }, [collapseToTwoLayers, crumbs, current, overflow])

  return (
    <Breadcrumb className={props.className}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={homeHref}>{homeLabel}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {view.dropdown.length > 0 ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1">
                  <BreadcrumbEllipsis className="size-4" />
                  <span className="sr-only">Toggle menu</span>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start">
                  {view.dropdown.map((g, idx) => {
                    const label = asStr(g.label) || "Item"
                    const href = asStr(g.href)
                    const onSelect = typeof g.onSelect === "function" ? g.onSelect : undefined

                    if (href) {
                      return (
                        <DropdownMenuItem key={uniqKey(label, href, idx)} asChild>
                          <Link href={href}>{label}</Link>
                        </DropdownMenuItem>
                      )
                    }

                    return (
                      <DropdownMenuItem
                        key={uniqKey(label, "", idx)}
                        onSelect={(e) => {
                          e.preventDefault()
                          onSelect?.()
                        }}
                      >
                        {label}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </>
        ) : null}

        {view.crumbs.map((c, idx) => {
          const label = asStr(c.label) || "Item"
          const href = asStr(c.href)

          return (
            <span key={uniqKey(label, href, idx)} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {href ? (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </span>
          )
        })}

        {view.current ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{view.current}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
