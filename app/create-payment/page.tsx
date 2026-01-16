"use client"

import * as React from "react"
import {
  Check,
  ChevronsUpDown,
  Wallet,
  ShieldCheck,
  CreditCard,
  History,
  ArrowDownUp,
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
    <div className="space-y-2">
      <Label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold ml-1">
        {label}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-16 w-full justify-between px-4 rounded-2xl transition-all duration-200",
              "bg-background border-border hover:bg-muted/50",
              !value && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-3 min-w-0 text-left">
              <div className="bg-muted text-foreground p-2 rounded-xl shrink-0">
                <Icon size={18} />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate">
                  {value ? selected?.account_name ?? "Unknown Wallet" : `Select ${label}`}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground leading-none truncate uppercase">
                  {value || "no-selection"}
                </span>
              </div>
            </div>

            <ChevronsUpDown className="h-4 w-4 opacity-40 shrink-0" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0 rounded-2xl overflow-hidden border border-border shadow-2xl"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search wallets..." className="h-12" />
            <CommandList className="max-h-64">
              <CommandEmpty>No wallets found.</CommandEmpty>
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

type ApiCreateLedgerOk = {
  ok: boolean
  lambda?: { StatusCode?: number; FunctionError?: string | null }
  response?: any
  message?: string
}

export default function WalletsPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = React.useState(true)
  const [senderAccount, setSenderAccount] = React.useState<Account | null>(null)
  const [loadingSender, setLoadingSender] = React.useState(true)
  const [processedByName, setProcessedByName] = React.useState("")
  const [processedByNumber, setProcessedByNumber] = React.useState("")

  const [amount, setAmount] = React.useState("")
  const [receiver, setReceiver] = React.useState("")
  const [transactionId, setTransactionId] = React.useState("")
  const [description, setDescription] = React.useState("")

  const [submitting, setSubmitting] = React.useState(false)
  const [err, setErr] = React.useState("")
  const [msg, setMsg] = React.useState("")
  
  // FIX 1: Add a ref to track submission status synchronously
  const isSubmittingRef = React.useRef(false)

  React.useEffect(() => {
    setTransactionId(makeUuid())
  }, [])

  React.useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        setLoadingSender(true)
        const res = await fetch("/api/sender/get-sender-details", { cache: "no-store" })
        const j: SenderDetails = await res.json()
        if (!mounted) return
        if (j?.account_number) setSenderAccount({ account_number: j.account_number, account_name: j.account_name })
        if (j?.employee_name) setProcessedByName(j.employee_name)
        if (j?.employee_number) setProcessedByNumber(j.employee_number)
      } catch {
        if (mounted) setErr("Connection error: failed to sync sender.")
      } finally {
        if (mounted) setLoadingSender(false)
      }
    })()

    ;(async () => {
      try {
        setLoadingAccounts(true)
        const res = await fetch("/api/accounts/get-all", { cache: "no-store" })
        const j = await res.json()
        if (!mounted) return
        setAccounts(Array.isArray(j?.accounts) ? j.accounts : [])
      } catch {
        if (mounted) setErr("Connection error: failed to sync wallets.")
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

  const receiverName = React.useMemo(() => {
    const r = asStr(receiver)
    if (!r) return ""
    return accounts.find((x) => x.account_number === r)?.account_name || ""
  }, [accounts, receiver])

  const canSubmit =
    !loadingAccounts &&
    !loadingSender &&
    !submitting &&
    !!asStr(transactionId) &&
    isFinite(amountNum) &&
    amountNum > 0 &&
    !!senderNumber &&
    !!asStr(receiver) &&
    receiver !== senderNumber &&
    !!asStr(processedByNumber) &&
    !!asStr(description)

async function submit(e: React.FormEvent) {
  e.preventDefault()

  if (isSubmittingRef.current) return
  if (!canSubmit) return

  isSubmittingRef.current = true
  setSubmitting(true)

  setErr("")
  setMsg("")

  try {
    const payload = {
      creator_account_number: senderNumber,
      sender_account_number: senderNumber,
      sender_account_name: senderName,
      receiver_account_number: asStr(receiver),
      receiver_account_name: receiverName,
      description: asStr(description),
      amount: amountNum,
      created_by: asStr(processedByNumber),
      transaction_id: asStr(transactionId) || makeUuid(),
    }

    if (!payload.receiver_account_name) {
      setErr("Missing receiver_account_name.")
      return
    }

    console.log("POST /api/ledgers/create-one payload:", payload)

    setMsg("Payload logged.")
    setTransactionId(makeUuid())
    setAmount("")
    setDescription("")
    setReceiver("")
  } catch (e: any) {
    setErr(asStr(e?.message) || "Failed to log payload.")
  } finally {
    isSubmittingRef.current = false
    setSubmitting(false)
  }
}

  return (
    <main className="mx-auto w-full max-w-md min-h-screen p-6 pb-20 bg-background text-foreground">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Wallets</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            jef-wallets • Internal Ledger
          </p>
        </div>
        <div className="bg-foreground text-background p-3 rounded-2xl shadow-lg">
          <Wallet size={24} strokeWidth={2.5} />
        </div>
      </header>

      <form onSubmit={submit} className="space-y-6">
        {/* Amount Input */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black block text-center">
            Transfer Amount (PHP)
          </Label>
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-muted-foreground/30 group-focus-within:text-foreground transition-colors">
              ₱
            </div>
            <Input
              className="h-24 pl-12 text-4xl font-black text-center rounded-[2rem] border-2 border-muted bg-card focus-visible:ring-offset-0 focus-visible:ring-foreground transition-all"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                const v = e.target.value.trim()
                if (v === "" || isMoney(v)) setAmount(v)
              }}
            />
          </div>
        </div>

        {/* Transfer Path */}
        <Card className="rounded-[2rem] border border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-black ml-1">
                Source Wallet
              </Label>
              <div className="h-16 w-full px-4 rounded-2xl border border-dashed border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-foreground/5 text-foreground p-2 rounded-xl shrink-0">
                    <CreditCard size={18} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold truncate">
                      {loadingSender ? "Syncing..." : senderName || "Main Account"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase truncate">
                      {senderNumber || "---- ----"}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase px-2 py-1 bg-foreground text-background rounded-lg">
                  Primary
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center -my-2 relative z-10">
              <div className="bg-background border-2 border-border p-2 rounded-full text-muted-foreground shadow-sm">
                <ArrowDownUp size={16} strokeWidth={3} />
              </div>
            </div>

            <AccountCombobox
              label="Recipient Wallet"
              value={receiver}
              onChange={setReceiver}
              accounts={accounts.filter((a) => a.account_number !== senderNumber)}
              disabled={loadingAccounts || loadingSender || !senderNumber}
              icon={History}
            />
          </CardContent>
        </Card>

        {/* Audit Details */}
        <section className="rounded-[2rem] p-5 border border-border bg-card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Authorized By
              </Label>
              <div className="h-10 px-3 flex items-center bg-muted/50 border border-border/50 rounded-xl text-[11px] font-black truncate">
                {processedByName || "—"}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Trace Reference
              </Label>
              <div className="h-10 px-3 flex items-center bg-muted/50 border border-border/50 rounded-xl text-[10px] font-mono text-muted-foreground truncate uppercase">
                #{(transactionId || "").split("-")[0] || "—"}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Note / Memo
            </Label>
            <Textarea
              className="min-h-[80px] rounded-xl bg-muted/50 border border-border/50 p-3 text-xs font-medium resize-none focus-visible:ring-foreground"
              placeholder="What is this transfer for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </section>

        {/* Status & Submit */}
        <div className="space-y-3">
          {err && (
            <div className="p-4 rounded-2xl bg-neutral-100 text-neutral-900 text-xs font-bold text-center border border-neutral-200">
              {err}
            </div>
          )}
          {msg && (
            <div className="p-4 rounded-2xl bg-foreground text-background text-xs font-bold text-center">
              {msg}
            </div>
          )}

          <Button
            className="h-18 w-full rounded-[2rem] font-black text-lg shadow-xl bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-20 flex gap-3"
            type="submit"
            disabled={!canSubmit}
          >
            {submitting ? (
              "Securing..."
            ) : (
              <>
                <ShieldCheck size={22} strokeWidth={2.5} />
                Authorize Transfer
              </>
            )}
          </Button>
        </div>
      </form>
    </main>
  )
}