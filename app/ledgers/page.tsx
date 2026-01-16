"use client"

import React, { useEffect, useMemo, useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  RefreshCw,
  Inbox,
  UserCircle,
  LucideIcon,
} from "lucide-react"

// --- Types ---
interface Ledger {
  ledger_id: string
  creator_account_number?: string
  created_by?: string

  sender_account_number: string
  sender_account_name: string
  receiver_account_number: string
  receiver_account_name: string

  type: "credit" | "debit"
  description: string
  amount: number

  date_name: string
  created: string
  elapsed_time: string
}

interface SenderDetails {
  account_name: string
  account_number: string
  employee_name: string
  employee_number: string
}

type UiLedger = Ledger & {
  isOutflow: boolean
  counterparty_name: string
  counterparty_number: string
}

// --- Helpers ---
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(val)

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Normalizes ledger entries.
 * * LOGIC FIX: 
 * We use positive inclusion.
 * 1. If Active Account is Sender AND Type is Debit -> Keep (Outflow)
 * 2. If Active Account is Receiver AND Type is Credit -> Keep (Inflow)
 * 3. Discard everything else.
 */
function normalizeLedgersForAccount(items: Ledger[], activeAccount: string): UiLedger[] {
  const out: UiLedger[] = []

  for (const l of items || []) {
    const isSender = l.sender_account_number === activeAccount
    const isReceiver = l.receiver_account_number === activeAccount

    // Skip irrelevant rows entirely
    if (!isSender && !isReceiver) continue

    let isOutflow = false
    let isValidEntry = false

    // Positive inclusion logic handles Self-Transfers (Sender==Receiver) correctly
    if (isSender && l.type === "debit") {
      isValidEntry = true
      isOutflow = true
    } else if (isReceiver && l.type === "credit") {
      isValidEntry = true
      isOutflow = false
    }

    if (!isValidEntry) continue

    const counterparty_name = isOutflow ? l.receiver_account_name : l.sender_account_name
    const counterparty_number = isOutflow ? l.receiver_account_number : l.sender_account_number

    out.push({ ...l, isOutflow, counterparty_name, counterparty_number })
  }

  return out
}

// --- Sub-Components ---

interface StatCardProps {
  title: string
  amount: number
  icon: LucideIcon
  colorClass: string
}

const StatCard = ({ title, amount, icon: Icon, colorClass }: StatCardProps) => (
  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
    <Icon size={14} className={`${colorClass} mb-2`} />
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{title}</p>
    <p className="text-sm font-bold tabular-nums">{formatCurrency(amount)}</p>
  </div>
)

const LedgerItem = ({ item }: { item: UiLedger }) => {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-2 rounded-xl ${
              !item.isOutflow ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
            }`}
          >
            {!item.isOutflow ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
          </div>

          <div className="min-w-0">
            <h4 className="text-[14px] font-bold truncate leading-tight">{item.description}</h4>

            <div className="flex gap-3 text-[10px] text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Calendar size={10} /> {item.date_name}
              </span>
              <span className="flex items-center gap-1 uppercase">
                <Clock size={10} /> {item.elapsed_time}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right pl-3">
          <p
            className={`text-[15px] font-black tabular-nums ${
              !item.isOutflow ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {!item.isOutflow ? "+" : "-"}
            {formatCurrency(item.amount).replace("₱", "")}
          </p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
            ID: {item.ledger_id.slice(0, 8)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/50 text-[11px] font-bold">
        <div className="flex-1 truncate">
          <p className="text-[9px] text-slate-400 uppercase font-medium">{item.isOutflow ? "To" : "From"}</p>
          <span className="text-emerald-600 dark:text-emerald-400">{item.counterparty_name}</span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex-1 truncate text-right">
          <p className="text-[9px] text-slate-400 uppercase font-medium">Account</p>
          <span className="text-slate-600 dark:text-slate-300">{item.counterparty_number}</span>
        </div>
      </div>
    </div>
  )
}

// --- Main Content ---
function LedgerContent() {
  const sp = useSearchParams()
  const accountNumber = asStr(sp.get("account_number") || "1001")

  const [rawLedgers, setRawLedgers] = useState<Ledger[]>([])
  const [profile, setProfile] = useState<SenderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now())
  const [timeElapsedDisplay, setTimeElapsedDisplay] = useState("0s")

  const load = useCallback(async () => {
    try {
      setLoading(true)

      const [resLedgers, resProfile] = await Promise.all([
        fetch(
          `/api/ledgers/get-all-by-account-number?account_number=${encodeURIComponent(accountNumber)}`,
          { cache: "no-store" }
        ),
        fetch(`/api/sender/get-sender-details?account_number=${encodeURIComponent(accountNumber)}`, {
          cache: "no-store",
        }),
      ])

      const ledgersText = await resLedgers.text()
      const dataLedgers = safeJsonParse(ledgersText)

      const profileText = await resProfile.text()
      const dataProfile = safeJsonParse(profileText)

      if (resProfile.ok && dataProfile && typeof dataProfile === "object") {
        setProfile(dataProfile as SenderDetails)
      } else {
        setProfile(null)
      }

      const list = dataLedgers?.exists ? (dataLedgers.ledgers as Ledger[]) : []
      setRawLedgers(Array.isArray(list) ? list : [])
      setLastRefreshed(Date.now())
    } catch (e) {
      console.error("Fetch error", e)
      setRawLedgers([])
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [accountNumber])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastRefreshed) / 1000)
      if (diff < 60) setTimeElapsedDisplay(`${diff}s`)
      else setTimeElapsedDisplay(`${Math.floor(diff / 60)}m ${diff % 60}s`)
    }, 1000)
    return () => clearInterval(interval)
  }, [lastRefreshed])

  const { sorted, totals, displayName, employeeLine } = useMemo(() => {
    const uiLedgers = normalizeLedgersForAccount(rawLedgers, accountNumber)
    
    // Sort by date descending
    const sorted = [...uiLedgers].sort((a, b) => b.created.localeCompare(a.created))

    const totals = uiLedgers.reduce(
      (acc, l) => {
        if (l.isOutflow) acc.outflow += l.amount
        else acc.inflow += l.amount
        return acc
      },
      { inflow: 0, outflow: 0 }
    )

    const profileMatches = profile?.account_number === accountNumber

    const displayName = profileMatches && profile?.account_name
      ? profile.account_name
      : `Account ${accountNumber}`

    const employeeLine = profileMatches && profile?.employee_name
      ? profile.employee_name
      : ""

    return { sorted, totals, displayName, employeeLine }
  }, [rawLedgers, accountNumber, profile])

  const net = totals.inflow - totals.outflow

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-100 pb-10">
      <nav className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Wallet className="text-emerald-500" size={18} />
            </div>

            <div>
              <h1 className="font-bold text-sm truncate max-w-[160px]">{displayName}</h1>

              <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                {employeeLine ? (
                  <span className="flex items-center gap-1 mr-1 text-emerald-600 dark:text-emerald-400">
                    <UserCircle size={10} /> {employeeLine}
                  </span>
                ) : null}
                <span>• {loading ? "Syncing..." : `Updated ${timeElapsedDisplay} ago`}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-emerald-500" : "text-slate-500"} />
            </button>

            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Net Balance</p>
              <p className={`font-black text-lg tabular-nums leading-none ${net >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatCurrency(net).replace("₱", "")}
              </p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-6 py-8">
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard title="Total Inflow" amount={totals.inflow} icon={TrendingUp} colorClass="text-emerald-500" />
          <StatCard title="Total Outflow" amount={totals.outflow} icon={TrendingDown} colorClass="text-red-500" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1 mb-2">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Recent Activity</h2>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {sorted.length} Records
            </span>
          </div>

          {loading && sorted.length === 0 ? (
            <div className="animate-pulse space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-200 dark:bg-slate-900 rounded-2xl" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-20 text-center space-y-3 opacity-50">
              <Inbox className="mx-auto text-slate-400" size={32} />
              <p className="text-xs font-bold uppercase tracking-widest">No transactions found</p>
            </div>
          ) : (
            // FIX: Added 'type' to key to prevent duplicates if ledger_id is shared between debit/credit rows
            sorted.map((item) => <LedgerItem key={`${item.ledger_id}-${item.type}`} item={item} />)
          )}
        </div>
      </main>
    </div>
  )
}

// --- Page Export ---
export default function LedgerPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs font-bold uppercase">Loading Ledger...</div>}>
      <LedgerContent />
    </Suspense>
  )
}