"use client"

import * as React from "react"
import {
  Check,
  ChevronsUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  Fingerprint,
  RefreshCcw,
  ShieldCheck,
  CreditCard,
  History,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

/* ----------------------------- utils ----------------------------- */

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ")
const asStr = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const isMoney = (s: string) => /^(\d+)?(\.\d{0,2})?$/.test(s)

function makeUuid() {
  const c: any = (globalThis as any)?.crypto
  if (c && typeof c.randomUUID === "function") return c.randomUUID()
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1)
  return `${s4()}${s4()}-${s4()}-4${s4().slice(1)}-${((8 + Math.random()) * 0x10000)
    .toString(16)
    .slice(0, 4)}-${s4()}${s4()}${s4()}`
}

/* -------------------------- combobox -------------------------- */

type Account = { account_number: string; account_name: string }

function AccountCombobox(props: {
  label: string
  value: string
  onChange: (v: string) => void
  accounts: Account[]
  disabled?: boolean
  icon: any
}) {
  const { label, value, onChange, accounts, disabled, icon: Icon } = props
  const [open, setOpen] = React.useState(false)

  const selected = React.useMemo(
    () => accounts.find((x) => x.account_number === value),
    [accounts, value]
  )

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-black ml-1">
        {label}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-14 w-full justify-between px-4 rounded-2xl shadow-sm",
              "bg-background border-border",
              "hover:bg-accent hover:text-accent-foreground",
              "active:scale-[0.99] transition",
              !value && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-3 min-w-0 text-left">
              <div className="bg-foreground text-background p-2 rounded-xl shadow-sm shrink-0">
                <Icon size={16} />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate">
                  {value ? selected?.account_name ?? "Unknown account" : `Select ${label}`}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground leading-none truncate">
                  {value || "---- ----"}
                </span>
              </div>
            </div>

            <ChevronsUpDown className="h-4 w-4 opacity-40 shrink-0" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0 rounded-2xl overflow-hidden border border-border shadow-xl bg-popover text-popover-foreground"
          align="start"
        >
          <Command className="bg-popover text-popover-foreground">
            <CommandInput placeholder="Search system accounts..." className="h-12" />
            <CommandList className="max-h-64">
              <CommandEmpty>No results found.</CommandEmpty>

              <CommandGroup>
                {accounts.map((a) => (
                  <CommandItem
                    key={a.account_number}
                    value={`${a.account_name} ${a.account_number}`}
                    onSelect={() => {
                      onChange(a.account_number)
                      setOpen(false)
                    }}
                    className="py-3 px-4 cursor-pointer"
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-bold truncate">{a.account_name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase truncate">
                        {a.account_number}
                      </span>
                    </div>
                    {a.account_number === value && <Check size={16} className="text-foreground" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/* ----------------------------- page ----------------------------- */

export default function Page() {
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = React.useState(true)

  const [senderAccount, setSenderAccount] = React.useState<Account | null>(null)
  const [loadingSender, setLoadingSender] = React.useState(true)

  const [type, setType] = React.useState<"credit" | "debit">("credit")
  const [amount, setAmount] = React.useState("")
  const [receiver, setReceiver] = React.useState("")
  const [createdBy, setCreatedBy] = React.useState("")
  const [ledgerId, setLedgerId] = React.useState("") // ✅ hydration-safe
  const [description, setDescription] = React.useState("")

  const [submitting, setSubmitting] = React.useState(false)
  const [err, setErr] = React.useState("")
  const [msg, setMsg] = React.useState("")

  React.useEffect(() => {
    // ✅ generate only on client after mount
    setLedgerId(makeUuid())
  }, [])

  React.useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        setLoadingSender(true)
        setErr("")
        const res = await fetch("/api/accounts/get-by-account-number", { cache: "no-store" })
        const j = await res.json()
        const acc = j?.account && typeof j.account === "object" ? j.account : null
        if (mounted) {
          if (j?.exists && acc?.account_number) setSenderAccount(acc as Account)
          else setErr(asStr(j?.message) || "Sender account not found.")
        }
      } catch {
        if (mounted) setErr("Failed to load sender account.")
      } finally {
        if (mounted) setLoadingSender(false)
      }
    })()

    ;(async () => {
      try {
        setLoadingAccounts(true)
        const res = await fetch("/api/accounts/get-all", { cache: "no-store" })
        const j = await res.json()
        const list: Account[] = Array.isArray(j?.accounts) ? j.accounts : []
        if (mounted) setAccounts(list)
      } catch {
        if (mounted) setErr("Failed to load accounts.")
      } finally {
        if (mounted) setLoadingAccounts(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  const senderNumber = asStr(senderAccount?.account_number || "")
  const senderName = asStr(senderAccount?.account_name || "")

  const amountNum = Number(amount || "0")
  const canSubmit =
    !loadingAccounts &&
    !loadingSender &&
    !submitting &&
    !!asStr(ledgerId) && // ✅ ensure generated
    isFinite(amountNum) &&
    amountNum > 0 &&
    !!senderNumber &&
    !!asStr(receiver) &&
    receiver !== senderNumber &&
    !!asStr(createdBy) &&
    !!asStr(description)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr("")
    setMsg("")

    if (!canSubmit) {
      setErr("Please complete all fields.")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        account_number: senderNumber,
        sender_account_number: senderNumber,
        sender_account_name: senderName,
        receiver_account_number: receiver,
        receiver_account_name: accounts.find((x) => x.account_number === receiver)?.account_name || "",
        type,
        description: asStr(description),
        amount: amountNum,
        created_by: asStr(createdBy),
        ledger_id: ledgerId,
      }

      console.log(payload)

      setMsg("Transfer prepared.")
      setLedgerId(makeUuid()) // ✅ client-only (event handler)
      setAmount("")
      setDescription("")
      setReceiver("")
    } catch (e: any) {
      setErr(asStr(e?.message) || "Failed to submit.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-md min-h-screen p-4 pb-20 bg-background text-foreground">
      <header className="flex items-center justify-between px-1 pt-1 mb-4">
        <div>
          <h1 className="text-base font-black tracking-tight">Vault Terminal</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            JEF Industries Ledger v3
          </p>
        </div>
        <div className="bg-foreground text-background p-2 rounded-2xl shadow-sm">
          <Fingerprint size={18} />
        </div>
      </header>

      <form onSubmit={submit} className="space-y-4">
        {/* Amount */}
        <section className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black ml-1 text-center block">
            Transaction Amount
          </Label>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground/25">
              ₱
            </div>
            <Input
              className={cn(
                "h-20 pl-10 text-3xl font-black text-center rounded-3xl border-none shadow-sm",
                "bg-card text-card-foreground",
                "focus-visible:ring-2 focus-visible:ring-ring",
                "placeholder:text-muted-foreground/30"
              )}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                const v = e.target.value.trim()
                if (v === "" || isMoney(v)) setAmount(v)
              }}
            />
          </div>

          {senderNumber && receiver && receiver === senderNumber && (
            <div className="text-[11px] font-bold text-destructive text-center">
              Source and destination must be different.
            </div>
          )}
        </section>

        {/* Type toggle */}
        <section className="space-y-2">
          <div className="bg-muted p-1 rounded-2xl flex gap-1">
            <button
              type="button"
              onClick={() => setType("credit")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-[11px] font-black uppercase tracking-wider transition",
                type === "credit"
                  ? "bg-background text-emerald-600 shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowDownLeft size={16} strokeWidth={3} />
              Credit
            </button>

            <button
              type="button"
              onClick={() => setType("debit")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-[11px] font-black uppercase tracking-wider transition",
                type === "debit"
                  ? "bg-background text-rose-600 shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowUpRight size={16} strokeWidth={3} />
              Debit
            </button>
          </div>

          <Card className="rounded-3xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
            <CardContent className="p-4 space-y-3">
              {/* Fixed Sender */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-black ml-1">
                  Source Account
                </Label>

                <div
                  className={cn(
                    "h-14 w-full px-4 rounded-2xl shadow-sm border border-border",
                    "bg-muted/60 text-foreground",
                    "flex items-center justify-between"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-foreground text-background p-2 rounded-xl shadow-sm shrink-0">
                      <CreditCard size={16} />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black truncate">
                        {loadingSender ? "Loading sender..." : senderName || "Unknown account"}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground leading-none truncate">
                        {loadingSender ? "---- ----" : senderNumber || "---- ----"}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    fixed
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 px-1">
                <div className={cn("h-[2px] flex-1 rounded-full", type === "credit" ? "bg-emerald-500/20" : "bg-rose-500/20")} />
                <div
                  className={cn(
                    "p-2 rounded-full border shadow-sm",
                    "bg-background border-border",
                    type === "credit" ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  <RefreshCcw size={14} strokeWidth={3} className={cn(type === "debit" && "rotate-180")} />
                </div>
                <div className={cn("h-[2px] flex-1 rounded-full", type === "credit" ? "bg-emerald-500/20" : "bg-rose-500/20")} />
              </div>

              {/* Selectable Receiver */}
              <AccountCombobox
                label="Destination Account"
                value={receiver}
                onChange={setReceiver}
                accounts={accounts.filter((a) => a.account_number !== senderNumber)}
                disabled={loadingAccounts || loadingSender || !senderNumber}
                icon={History}
              />
            </CardContent>
          </Card>
        </section>

        {/* Audit / memo */}
        <section className="rounded-3xl p-4 shadow-sm border border-border bg-card text-card-foreground space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Processed By
              </Label>
              <Input
                className="h-10 rounded-xl bg-muted border-none font-mono text-xs font-bold"
                placeholder="00031"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Trace ID
              </Label>
              <div className="h-10 px-3 flex items-center bg-muted rounded-xl text-[10px] font-mono text-muted-foreground truncate">
                {(asStr(ledgerId).split("-")[0] || "—") + "..."}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Transaction Memo
            </Label>
            <Textarea
              className="min-h-[76px] rounded-2xl bg-muted border-none p-3 text-xs font-medium resize-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="e.g. Monthly Inventory Liquidation"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </section>

        {/* Messages + submit */}
        <section className="space-y-3">
          {err ? (
            <div className="p-3 rounded-2xl bg-destructive/10 text-destructive text-[11px] font-bold text-center">
              {err}
            </div>
          ) : null}
          {msg ? (
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold text-center">
              {msg}
            </div>
          ) : null}

          <Button
            className={cn(
              "h-16 w-full rounded-3xl font-black text-lg shadow-lg",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "active:scale-[0.98] transition disabled:opacity-30 disabled:grayscale flex gap-3"
            )}
            type="submit"
            disabled={!canSubmit}
          >
            <ShieldCheck size={20} strokeWidth={3} />
            {submitting ? "Authorizing..." : "Authorize Transfer"}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            {loadingAccounts || loadingSender ? "Loading…" : `${accounts.length} accounts loaded • sender fixed: ${senderNumber || "—"}`}
          </p>
        </section>
      </form>
    </main>
  )
}
