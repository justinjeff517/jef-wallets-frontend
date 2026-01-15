"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Wallet, History, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Calendar, Clock } from "lucide-react"

// --- Types ---
interface Ledger {
  ledger_id: string; account_number: string; sender_account_number: string;
  sender_account_name: string; receiver_account_number: string;
  receiver_account_name: string; type: "credit" | "debit";
  description: string; amount: number; balance_after: number;
  created: string; created_name: string; date_name: string; elapsed_time?: string;
}

// --- Sub-Components ---
const StatCard = ({ title, amount, icon: Icon, colorClass }: any) => (
  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
    <Icon size={14} className={`${colorClass} mb-2`} />
    <p className="text-[10px] font-bold text-slate-500 uppercase">{title}</p>
    <p className="text-sm font-bold tabular-nums">₱{amount.toLocaleString()}</p>
  </div>
)

const LedgerItem = ({ item, currentAccountName }: { item: Ledger, currentAccountName: string }) => {
  const isCredit = item.type === "credit"
  const origin = isCredit ? item.sender_account_name : currentAccountName
  const dest = isCredit ? currentAccountName : item.receiver_account_name

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-slate-400 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-xl ${isCredit ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
            {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
          </div>
          <div className="min-w-0">
            <h4 className="text-[14px] font-bold truncate">{item.description}</h4>
            <div className="flex gap-3 text-[10px] text-slate-500 mt-0.5">
              <span className="flex items-center gap-1"><Calendar size={10}/> {item.date_name}</span>
              {item.elapsed_time && <span className="flex items-center gap-1"><Clock size={10}/> {item.elapsed_time}</span>}
            </div>
          </div>
        </div>
        <div className="text-right pl-3">
          <p className={`text-[15px] font-black ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
            {isCredit ? "+" : "-"}₱{item.amount.toLocaleString()}
          </p>
          <p className="text-[10px] font-bold text-slate-400">₱{item.balance_after.toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/50 text-[11px] font-bold">
        <div className="flex-1 truncate"><p className="text-[9px] text-slate-400 uppercase">Origin</p>{origin}</div>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
        <div className="flex-1 truncate text-right"><p className="text-[9px] text-slate-400 uppercase">Destination</p>{dest}</div>
      </div>
    </div>
  )
}

// --- Main Page ---
export default function LedgerPage() {
  const sp = useSearchParams()
  const accountNumber = (sp.get("account_number") || "1001").trim()
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/ledgers/get-all-by-account-number?account_number=${accountNumber}`)
        const data = await res.json()
        setLedgers(data?.exists ? data.ledgers : [])
      } catch (e: any) { setErr(e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [accountNumber])

  const { sorted, totals, accountName } = useMemo(() => {
    const sorted = [...ledgers].sort((a, b) => b.created.localeCompare(a.created))
    const totals = ledgers.reduce((acc, l) => {
      if (l.type === "credit") acc.inflow += l.amount
      else acc.outflow += l.amount
      return acc
    }, { inflow: 0, outflow: 0 })
    
    const firstMatch = ledgers.find(l => l.sender_account_number === accountNumber || l.receiver_account_number === accountNumber)
    const name = firstMatch ? (firstMatch.sender_account_number === accountNumber ? firstMatch.sender_account_name : firstMatch.receiver_account_name) : `Account ${accountNumber}`
    
    return { sorted, totals, accountName: name }
  }, [ledgers, accountNumber])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505]">
      <nav className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b p-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wallet className="text-emerald-500" size={18} />
            <h1 className="font-bold text-sm truncate">{accountName}</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Balance</p>
            <p className="font-black text-lg">₱{loading ? "---" : (sorted[0]?.balance_after ?? 0).toLocaleString()}</p>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-6 py-8">
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard title="Inflow" amount={totals.inflow} icon={TrendingUp} colorClass="text-emerald-500" />
          <StatCard title="Outflow" amount={totals.outflow} icon={TrendingDown} colorClass="text-red-500" />
        </div>

        <div className="space-y-3">
          {loading ? <div className="animate-pulse space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-900 rounded-2xl" />)}</div> :
           err ? <p className="text-red-500 text-center">{err}</p> :
           sorted.map(item => <LedgerItem key={item.ledger_id} item={item} currentAccountName={accountName} />)}
        </div>
      </main>
    </div>
  )
}