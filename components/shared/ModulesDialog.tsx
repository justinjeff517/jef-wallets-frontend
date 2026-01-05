/* src/components/shared/ModulesDialog.tsx */
"use client"

import * as React from "react"
import Fuse from "fuse.js"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Kbd } from "@/components/ui/kbd"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { ScrollArea } from "@/components/ui/scroll-area"

type AllowedModule = {
  module_number: string
  name: string
  description?: string
  href: string
}

type ApiResp = {
  exists: boolean
  message: string
  allowed_modules: AllowedModule[]
  server_time?: string
}

const API_URL = "/api/shared/get-allowed-modules-by-entity-number"

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null
  if (!t) return false
  const tag = (t.tagName || "").toLowerCase()
  return tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable
}

function safeArr(v: any) {
  return Array.isArray(v) ? v : []
}

function toStr(v: any) {
  return typeof v === "string" ? v : String(v ?? "")
}

function cleanHref(href: string) {
  return toStr(href).trim()
}

function isSubdomainUrl(href: string) {
  try {
    const u = new URL(href)
    if (u.protocol !== "https:") return false
    const host = (u.hostname || "").toLowerCase()
    if (!host.endsWith("jefoffice.com") && !host.endsWith("jefoffice.co")) return false
    const parts = host.split(".")
    return parts.length >= 3
  } catch {
    return false
  }
}

function uniqByKey(list: AllowedModule[]) {
  const seen = new Set<string>()
  const out: AllowedModule[] = []
  for (const m of list) {
    const k = `${toStr(m.module_number).trim()}|${toStr(m.href).trim().toLowerCase()}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(m)
  }
  return out
}

function sortMods(list: AllowedModule[]) {
  return [...list].sort((a, b) => {
    const an = toStr(a.name).trim().toLowerCase()
    const bn = toStr(b.name).trim().toLowerCase()
    const byName = an.localeCompare(bn)
    if (byName !== 0) return byName
    return toStr(a.module_number).localeCompare(toStr(b.module_number))
  })
}

export function ModulesDialog() {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")

  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState("")
  const [mods, setMods] = React.useState<AllowedModule[]>([])

  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const didLoadRef = React.useRef(false)

  const fuse = React.useMemo(() => {
    return new Fuse(mods, {
      keys: ["name", "description", "href", "module_number"],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 1,
    })
  }, [mods])

  const results = React.useMemo(() => {
    const query = (q || "").trim()
    if (!query) return sortMods(mods)
    return sortMods(fuse.search(query).map((r) => r.item))
  }, [q, fuse, mods])

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return

      const key = (e.key || "").toLowerCase()
      const cmdOrCtrl = e.metaKey || e.ctrlKey

      if (cmdOrCtrl && key === "k") {
        e.preventDefault()
        setOpen(true)
        return
      }

      if (e.key === "Escape") setOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  React.useEffect(() => {
    if (!open) {
      setQ("")
      setErr("")
      return
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    if (didLoadRef.current) return

    let alive = true
    const ac = new AbortController()

    async function run() {
      try {
        setLoading(true)
        setErr("")

        const res = await fetch(API_URL, {
          method: "GET",
          cache: "no-store",
          headers: { accept: "application/json" },
          signal: ac.signal,
        })

        const json = (await res.json().catch(() => null)) as ApiResp | null
        const ok = !!json && typeof json === "object" && typeof (json as any).exists === "boolean"

        if (!alive) return

        if (!res.ok || !ok || !json?.exists) {
          setMods([])
          setErr(toStr(json?.message) || `Request failed (${res.status})`)
          return
        }

        const allowed = safeArr(json.allowed_modules)
          .filter((m: any) => !!m && typeof m === "object")
          .map((m: any) => {
            const href = cleanHref(m.href)
            return {
              module_number: toStr(m.module_number).trim(),
              name: toStr(m.name).trim(),
              description: toStr(m.description).trim(),
              href,
            } as AllowedModule
          })
          .filter((m: AllowedModule) => !!m.module_number && !!m.name && !!m.href)
          .filter((m: AllowedModule) => isSubdomainUrl(m.href))

        setMods(sortMods(uniqByKey(allowed)))
        didLoadRef.current = true
      } catch (e: any) {
        if (!alive) return
        if (e?.name === "AbortError") return
        setMods([])
        setErr(toStr(e?.message) || "Network error")
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }

    run()
    return () => {
      alive = false
      ac.abort()
    }
  }, [open])

  function go(href: string) {
    const url = cleanHref(href)
    if (!isSubdomainUrl(url)) return
    setOpen(false)
    window.location.assign(url)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border text-[11px] font-semibold leading-none">
            J
          </span>
          <span>Modules</span>
          <span className="ml-1 inline-flex items-center gap-1">
            <Kbd className="px-1.5 py-0 text-[10px]">Ctrl</Kbd>
            <Kbd className="px-1.5 py-0 text-[10px]">K</Kbd>
          </span>
        </Button>
      </DialogTrigger>

      {/* ✅ TOP-ALIGNED (instead of centered) */}
      <DialogContent className="w-[calc(100vw-24px)] max-w-md rounded-2xl p-0 !top-4 !left-1/2 !-translate-x-1/2 !translate-y-0 max-h-[calc(100vh-32px)] overflow-hidden">
        <DialogHeader className="px-3 pt-3">
          <DialogTitle className="text-sm">Modules</DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="p-3 space-y-2">
          {err ? (
            <Alert variant="destructive" className="py-2">
              <AlertTitle className="text-xs">Error</AlertTitle>
              <AlertDescription className="text-[11px] leading-snug">{err}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-xl border overflow-hidden">
            <div className="flex items-center gap-2 border-b px-2">
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={loading ? "Loading modules..." : "Search modules..."}
                className="h-9 w-full bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
                aria-label="Search modules"
              />
              {loading ? (
                <div className="pr-1">
                  <Spinner className="h-4 w-4" />
                </div>
              ) : null}
            </div>

            <ScrollArea className="max-h-[56vh]">
              {!loading && mods.length === 0 ? (
                <div className="px-2 py-3 text-[11px] text-muted-foreground">No modules.</div>
              ) : null}

              {!loading && results.length === 0 && mods.length > 0 ? (
                <div className="px-2 py-3 text-[11px] text-muted-foreground">No results.</div>
              ) : null}

              <div className="p-1">
                {results.map((m) => (
                  <button
                    key={`${m.module_number}:${m.href}`}
                    type="button"
                    onClick={() => go(m.href)}
                    className="w-full rounded-lg px-2 py-2 text-left hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium leading-tight truncate">{m.name}</div>
                        {m.description ? (
                          <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground line-clamp-1">
                            {m.description}
                          </div>
                        ) : null}
                        <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground truncate">{m.href}</div>
                      </div>

                      <Badge variant="secondary" className="shrink-0 px-2 py-0 text-[11px]">
                        {m.module_number}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Button variant="secondary" className="h-9 w-full text-xs" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
