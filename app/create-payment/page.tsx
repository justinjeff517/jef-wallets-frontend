"use client"

import * as React from "react"
import {
  Check,
  ChevronsUpDown,
  ArrowUpRight,
  Fingerprint,
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
            <CommandInput placeholder="Search accounts..." className="h-12" />
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

type SenderDetails = {
  account_name: string
  account_number: string
  employee_name: string
  employee_number: string
}

export default function Page() {
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = React.useState(true)
  const [senderAccount, setSenderAccount] = React.useState<Account | null>(null)
  const [loadingSender, setLoadingSender] = React.useState(true)
  const [processedByName, setProcessedByName] = React.useState("")
  const [processedByNumber, setProcessedByNumber] = React.useState("")

  // Type is now fixed
  const type = "debit"

  const [amount, setAmount] = React.useState("")
  const [receiver, setReceiver] = React.useState("")
  const [ledgerId, setLedgerId] = React.useState("")
  const [description, setDescription] = React.useState("")

  const [submitting, setSubmitting] = React.useState(false)
  const [err, setErr] = React.useState("")
  const [msg, setMsg] = React.useState("")

  React.useEffect(() => {
    setLedgerId(makeUuid())
  }, [])

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoadingSender(true)
        const res = await fetch("/api/sender/get-sender-details", { cache: "no-store" })
        const j: SenderDetails = await res.json()
        if (mounted) {
          if (j?.account_number) setSenderAccount({ account_number: j.account_number, account_name: j.account_name })
          if (j?.employee_name) setProcessedByName(j.employee_name)
          if (j?.employee_number) setProcessedByNumber(j.employee_number)
        }
      } catch {
        if (mounted) setErr("Failed to load sender details.")
      } finally {
        if (mounted) setLoadingSender(false)
      }
    })()

    ;(async () => {
      try {
        setLoadingAccounts(true)
        const res = await fetch("/api/accounts/get-all", { cache: "no-store" })
        const j = await res.json()
        if (mounted) setAccounts(Array.isArray(j?.accounts) ? j.accounts : [])
      } catch {
        if (mounted) setErr("Failed to load accounts.")
      } finally {
        if (mounted) setLoadingAccounts(false)
      }
    })()

    return () => { mounted = false }
  }, [])

  const senderNumber = asStr(senderAccount?.account_number || "")
  const senderName = asStr(senderAccount?.account_name || "")
  const amountNum = Number(amount || "0")

  const canSubmit =
    !loadingAccounts &&
    !loadingSender &&
    !submitting &&
    !!asStr(ledgerId) &&
    isFinite(amountNum) &&
    amountNum > 0 &&
    !!senderNumber &&
    !!asStr(receiver) &&
    receiver !== senderNumber &&
    !!asStr(processedByNumber) &&
    !!asStr(description)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setErr("")
    setMsg("")

    try {
      const payload = {
        account_number: senderNumber,
        sender_account_number: senderNumber,
        sender_account_name: senderName,
        receiver_account_number: receiver,
        receiver_account_name: accounts.find((x) => x.account_number === receiver)?.account_name || "",
        type, // Fixed at "debit"
        description: asStr(description),
        amount: amountNum,
        created_by: processedByNumber,
        ledger_id: ledgerId,
      }

      console.log("Submitting Payment:", payload)
      setMsg("Debit transfer authorized.")
      setLedgerId(makeUuid())
      setAmount("")
      setDescription("")
      setReceiver("")
    } catch (e: any) {
      setErr(asStr(e?.message) || "Transaction failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-md min-h-screen p-4 pb-20 bg-background text-foreground">
      <header className="flex items-center justify-between px-1 pt-1 mb-6">
        <div>
          <h1 className="text-base font-black tracking-tight">Vault Terminal</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            JEF Industries Ledger v3 • Payment Mode
          </p>
        </div>
        {/* Grayscale header icon */}
        <div className="bg-foreground text-background p-2 rounded-2xl shadow-sm">
          <Fingerprint size={18} />
        </div>
      </header>

      <form onSubmit={submit} className="space-y-4">
        {/* Amount Section */}
        <section className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black ml-1 text-center block">
            Payment Amount (PHP)
          </Label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground/25">
              ₱
            </div>
            <Input
              // Grayscale focus ring
              className="h-20 pl-10 text-3xl font-black text-center rounded-3xl border-none shadow-sm bg-card text-card-foreground focus-visible:ring-2 focus-visible:ring-ring"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                const v = e.target.value.trim()
                if (v === "" || isMoney(v)) setAmount(v)
              }}
            />
          </div>
        </section>

        {/* Account Flow Section */}
        <Card className="rounded-3xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          <CardContent className="p-4 space-y-3">
            {/* Fixed Source */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-black ml-1">
                Source (Debit From)
              </Label>
              <div className="h-14 w-full px-4 rounded-2xl shadow-sm border border-border bg-muted/60 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-foreground text-background p-2 rounded-xl shrink-0">
                    <CreditCard size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black truncate">{loadingSender ? "Loading..." : senderName}</span>
                    <span className="text-[10px] font-mono text-muted-foreground leading-none truncate">{senderNumber || "---- ----"}</span>
                  </div>
                </div>
                {/* Grayscale fixed badge */}
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fixed</span>
              </div>
            </div>

            {/* Visual Connector - Grayscale */}
            <div className="flex items-center gap-3 px-1">
              <div className="h-[2px] flex-1 rounded-full bg-border" />
              <div className="p-2 rounded-full border shadow-sm bg-background border-border text-foreground">
                <ArrowUpRight size={14} strokeWidth={3} />
              </div>
              <div className="h-[2px] flex-1 rounded-full bg-border" />
            </div>

            {/* Selectable Destination */}
            <AccountCombobox
              label="Destination (Credit To)"
              value={receiver}
              onChange={setReceiver}
              accounts={accounts.filter((a) => a.account_number !== senderNumber)}
              disabled={loadingAccounts || loadingSender || !senderNumber}
              icon={History}
            />
          </CardContent>
        </Card>

        {/* Audit Section */}
        <section className="rounded-3xl p-4 shadow-sm border border-border bg-card text-card-foreground space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Processor</Label>
              <div className="h-10 px-3 flex items-center bg-muted rounded-xl text-[11px] font-black truncate">
                {processedByName || "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Trace ID</Label>
              <div className="h-10 px-3 flex items-center bg-muted rounded-xl text-[10px] font-mono text-muted-foreground truncate">
                {ledgerId.split("-")[0]}...
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Transaction Memo</Label>
            <Textarea
               // Grayscale focus ring
              className="min-h-[76px] rounded-2xl bg-muted border-none p-3 text-xs font-medium resize-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Reason for payment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </section>

        {/* Action Section */}
        <section className="space-y-3">
          {/* Grayscale error/success messages */}
          {err && <div className="p-3 rounded-2xl bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50 text-[11px] font-bold text-center border border-neutral-200 dark:border-neutral-700">{err}</div>}
          {msg && <div className="p-3 rounded-2xl bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50 text-[11px] font-bold text-center border border-neutral-200 dark:border-neutral-700">{msg}</div>}

          <Button
            // Grayscale button theme (foreground/background inverse)
            className="h-16 w-full rounded-3xl font-black text-lg shadow-lg bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] transition disabled:opacity-30 flex gap-3"
            type="submit"
            disabled={!canSubmit}
          >
            <ShieldCheck size={20} strokeWidth={3} />
            {submitting ? "Processing..." : "Confirm Payment"}
          </Button>
        </section>
      </form>
    </main>
  )
}