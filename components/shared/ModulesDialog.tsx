/* src/components/shared/ModulesDialog.tsx */
"use client"

import * as React from "react"
import Fuse from "fuse.js"
import { usePathname } from "next/navigation"
import { 
  Search, 
  LayoutGrid, 
  ArrowRight, 
  Loader2, 
  Box,
  AlertCircle
} from "lucide-react"
import clsx from "clsx"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
// IMPORANT: Added DialogTitle here
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

// ... [Types and Utils remain exactly the same] ...

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

type ModulesDialogProps = {
  trigger?: "default" | "moduleName"
  triggerClassName?: string
}

const API_URL = "/api/shared/get-allowed-modules-by-entity-number"

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null
  if (!t) return false
  const tag = (t.tagName || "").toLowerCase()
  return tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable
}

function safeArr(v: any) { return Array.isArray(v) ? v : [] }
function toStr(v: any) { return typeof v === "string" ? v : String(v ?? "") }
function cleanHref(href: string) { return toStr(href).trim() }

function isSubdomainUrl(href: string) {
  try {
    const u = new URL(href)
    if (u.protocol !== "https:") return false
    const host = (u.hostname || "").toLowerCase()
    if (process.env.NODE_ENV === 'development') return true 
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

function formatModuleName(raw: string) {
  if (!raw) return ""
  return raw
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-")
}

export function ModulesDialog({ trigger = "default", triggerClassName }: ModulesDialogProps) {
  const pathname = usePathname()
  const segments = (pathname || "").split("/").filter(Boolean)
  const moduleSegment = segments[0] ?? ""

  const envModuleName = (process.env.NEXT_PUBLIC_MODULE_NAME || "").trim()
  const moduleLabel = formatModuleName(envModuleName || moduleSegment)

  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState("")
  const [mods, setMods] = React.useState<AllowedModule[]>([])

  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const didLoadRef = React.useRef(false)

  const fuse = React.useMemo(() => {
    return new Fuse(mods, {
      keys: ["name", "description", "module_number"],
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
    const t = window.setTimeout(() => inputRef.current?.focus(), 100)
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
        if (!alive) return

        if (!res.ok || !json?.exists) {
          setMods([])
          setErr(toStr(json?.message) || `Request failed (${res.status})`)
          return
        }

        const allowed = safeArr(json.allowed_modules)
          .map((m: any) => ({
              module_number: toStr(m.module_number).trim(),
              name: toStr(m.name).trim(),
              description: toStr(m.description).trim(),
              href: cleanHref(m.href),
          }))
          .filter((m: AllowedModule) => !!m.module_number && !!m.name && !!m.href)
          .filter((m: AllowedModule) => isSubdomainUrl(m.href))

        setMods(sortMods(uniqByKey(allowed)))
        didLoadRef.current = true
      } catch (e: any) {
        if (!alive || e?.name === "AbortError") return
        setMods([])
        setErr(toStr(e?.message) || "Network error")
      } finally {
        if (alive) setLoading(false)
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

const renderTrigger = () => {
  if (trigger === "moduleName") {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className={clsx(
          "h-9 gap-2.5 px-3 shadow-sm border-dashed hover:border-solid transition-all", 
          triggerClassName
        )}
      >
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </div>
        <span className="font-semibold tracking-wide uppercase text-xs truncate max-w-[12rem]">
          {moduleLabel || "Select Module"}
        </span>
        <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
      </Button>
    )
  }

  // Default trigger (optimized for Dropdown usage)
  return (
    <button 
      type="button"
      className={clsx(
        "flex w-full items-center justify-between text-xs transition-colors hover:text-primary focus:outline-none",
        triggerClassName
      )}
    >
      <span>Switch module...</span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.2 font-mono text-[9px] font-medium opacity-100 sm:flex">
        <span>⌘</span>K
      </kbd>
    </button>
  )
}

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {renderTrigger()}
      </DialogTrigger>

      <DialogContent className="p-0 gap-0 max-w-[550px] overflow-hidden shadow-2xl rounded-xl border-border/60 backdrop-blur-xl bg-background/95">
        
        {/* --- ACCESSIBILITY FIX START --- */}
        {/* The title is required by Radix UI but hidden visually */}
        <DialogTitle className="sr-only">
          Search Modules
        </DialogTitle>
        {/* --- ACCESSIBILITY FIX END --- */}

        <div className="flex items-center px-4 border-b h-14 shrink-0">
          <Search className="h-5 w-5 text-muted-foreground/50 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search modules..."
            className="flex h-12 w-full bg-transparent py-3 pl-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            autoComplete="off"
            autoCorrect="off"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!loading && (
             <div className="text-[10px] text-muted-foreground/60 border rounded px-1.5 py-0.5">
                ESC
             </div>
          )}
        </div>

        {err ? (
            <div className="p-6 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-destructive">Unable to load modules</h3>
                <p className="mt-1 text-xs text-muted-foreground">{err}</p>
            </div>
        ) : (
            <ScrollArea className="max-h-[350px] overflow-y-auto">
                <div className="p-2">
                    {!loading && mods.length === 0 && (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No modules assigned to your account.
                        </div>
                    )}
                    
                    {!loading && mods.length > 0 && results.length === 0 && (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No modules found for "{q}"
                        </div>
                    )}

                    <div className="grid gap-1">
                        {results.map((m) => (
                            <button
                                key={`${m.module_number}:${m.href}`}
                                onClick={() => go(m.href)}
                                className={clsx(
                                    "group relative flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all",
                                    "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none"
                                )}
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted/50 border group-hover:bg-background group-hover:border-primary/20 transition-colors">
                                    <Box className="h-5 w-5 text-foreground/70" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-medium leading-none text-foreground">
                                            {m.name}
                                        </span>
                                        <Badge 
                                            variant="secondary" 
                                            className="h-5 px-1.5 font-mono text-[10px] tracking-wider text-muted-foreground/70 group-hover:text-foreground group-hover:bg-background transition-colors"
                                        >
                                            {m.module_number}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate group-hover:text-muted-foreground/80">
                                        {m.description || "System Module"}
                                    </p>
                                </div>

                                <ArrowRight className="h-4 w-4 text-muted-foreground/30 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                            </button>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        )}
        
        {!err && mods.length > 0 && (
            <div className="border-t bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground flex justify-between">
               <span>JEF Ecosystem</span>
               <span>{mods.length} Modules Available</span>
            </div>
        )}
      </DialogContent>
    </Dialog>
  )
}