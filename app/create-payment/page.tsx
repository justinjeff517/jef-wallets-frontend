"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

type Account = { account_number: string; account_name: string }
type TxType = "credit" | "debit"

function makeUuid() {
  const c: any = (globalThis as any)?.crypto
  if (c && typeof c.randomUUID === "function") return c.randomUUID()
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1)
  return `${s4()}${s4()}-${s4()}-4${s4().slice(1)}-${((8 + Math.random() * 4) | 0)
    .toString(16)}${s4().slice(1)}-${s4()}${s4()}${s4()}`
}

const asStr = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const onlyDigits = (s: string) => s.replace(/\D+/g, "")
const isMoney = (s: string) => /^\d+(\.\d{0,2})?$/.test(s)

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ")
}

function AccountCombobox({
  label,
  value,
  onChange,
  accounts,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  accounts: Account[]
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  const selected = React.useMemo(() => {
    const a = accounts.find((x) => x.account_number === value)
    return a ? `${a.account_number} — ${a.account_name}` : ""
  }, [accounts, value])

  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("h-9 w-full justify-between px-3", !value && "text-muted-foreground")}
            disabled={disabled}
          >
            <span className="truncate text-left">
              {value ? selected : `Select ${label.toLowerCase()}`}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No accounts found.</CommandEmpty>

              <CommandGroup>
                {accounts.map((a) => {
                  const v = a.account_number
                  const text = `${a.account_number} — ${a.account_name}`
                  const active = v === value

                  return (
                    <CommandItem
                      key={v}
                      value={`${a.account_number} ${a.account_name}`}
                      onSelect={() => {
                        onChange(v)
                        setOpen(false)
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", active ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{text}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default function Page() {
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = React.useState(true)

  const [type, setType] = React.useState<TxType>("credit")
  const [sender, setSender] = React.useState("")
  const [receiver, setReceiver] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [createdBy, setCreatedBy] = React.useState("")
  const [ledgerId, setLedgerId] = React.useState("")

  const [msg, setMsg] = React.useState("")
  const [err, setErr] = React.useState("")

  React.useEffect(() => {
    setLedgerId(makeUuid())
  }, [])

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      setLoadingAccounts(true)
      setErr("")
      try {
        const res = await fetch("/api/accounts/get-all", { cache: "no-store" })
        const data = await res.json().catch(() => null)
        const list = Array.isArray(data?.accounts) ? data.accounts : []
        if (!alive) return

        setAccounts(list)
        if (list.length >= 1 && !sender) setSender(list[0].account_number)
        if (list.length >= 2 && !receiver) setReceiver(list[1].account_number)
      } catch {
        if (!alive) return
        setErr("Failed to load accounts.")
        setAccounts([])
      } finally {
        if (!alive) return
        setLoadingAccounts(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const byNo = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const a of accounts) m.set(a.account_number, a.account_name)
    return m
  }, [accounts])

  React.useEffect(() => {
    if (!sender || !receiver) return
    if (sender === receiver) {
      const alt = accounts.find((a) => a.account_number !== sender)?.account_number || ""
      setReceiver(alt)
    }
  }, [sender, receiver, accounts])

  const accountNumber = React.useMemo(() => {
    return type === "credit" ? receiver : sender
  }, [type, sender, receiver])

  const amountOk = amount.length > 0 && isMoney(amount) && Number(amount) > 0
  const createdByOk = onlyDigits(createdBy).length > 0
  const senderOk = !!sender && sender !== receiver
  const receiverOk = !!receiver && receiver !== sender

  const canSubmit =
    !loadingAccounts &&
    senderOk &&
    receiverOk &&
    amountOk &&
    createdByOk &&
    asStr(description).length > 0 &&
    !!accountNumber &&
    !!ledgerId

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg("")
    setErr("")

    if (!canSubmit) {
      setErr("Please complete all required fields.")
      return
    }

    const payload = {
      account_number: accountNumber,
      sender_account_number: sender,
      sender_account_name: byNo.get(sender) || "",
      receiver_account_number: receiver,
      receiver_account_name: byNo.get(receiver) || "",
      type,
      description: asStr(description),
      amount: Number(amount),
      created_by: asStr(createdBy),
      ledger_id: ledgerId,
    }

    console.log(payload)

    setMsg("Payload logged to console.")
    setDescription("")
    setAmount("")
    setLedgerId(makeUuid())
  }

  return (
    <div className="mx-auto w-full max-w-md px-3 py-3">
      <Card className="rounded-xl">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-base">Create Payment</CardTitle>
        </CardHeader>

        <CardContent className="p-3 pt-2">
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Type</Label>
              <RadioGroup
                value={type}
                onValueChange={(v) => setType(v as TxType)}
                className="flex gap-3"
              >
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <RadioGroupItem id="credit" value="credit" />
                  <Label htmlFor="credit" className="text-[12px] leading-none">
                    credit
                  </Label>
                </div>

                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <RadioGroupItem id="debit" value="debit" />
                  <Label htmlFor="debit" className="text-[12px] leading-none">
                    debit
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <AccountCombobox
              label="Sender"
              value={sender}
              onChange={setSender}
              accounts={accounts}
              disabled={loadingAccounts}
            />

            <AccountCombobox
              label="Receiver"
              value={receiver}
              onChange={setReceiver}
              accounts={accounts}
              disabled={loadingAccounts}
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Amount</Label>
                <Input
                  className="h-9"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value.trim()
                    if (v === "" || isMoney(v)) setAmount(v)
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Created by</Label>
                <Input
                  className="h-9"
                  placeholder="00031"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Description</Label>
              <Textarea
                className="min-h-[70px] resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">Ledger ID</div>
                <div className="truncate text-[12px] font-mono">{ledgerId || "—"}</div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-3"
                onClick={() => setLedgerId(makeUuid())}
                disabled={!ledgerId}
              >
                New
              </Button>
            </div>

            {err ? <div className="text-[11px] text-destructive">{err}</div> : null}
            {msg ? <div className="text-[11px] text-muted-foreground">{msg}</div> : null}

            <Button className="h-9 w-full" type="submit" disabled={!canSubmit}>
              Log Payload
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
