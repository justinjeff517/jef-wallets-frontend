"use client"

import React, { useEffect, useMemo, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Clock, 
  RefreshCw 
} from "lucide-react"

interface Ledger {
  ledger_id: string;
  account_number: string;
  sender_account_number: string;
  sender_account_name: string;
  receiver_account_number: string;
  receiver_account_name: string;
  type: "credit" | "debit";
  description: string;
  amount: number;
  date: string;
  date_name: string;
  created: string;
  created_name: string;
  created_by: string;
  elapsed_time: string;
}

const StatCard = ({ title, amount, icon: Icon, colorClass }: any) => (
  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
    <Icon size={14} className={`${colorClass} mb-2`} />
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{title}</p>
    <p className="text-sm font-bold tabular-nums">{amount.toLocaleString()}</p>
  </div>
)

const LedgerItem = ({ item }: { item: Ledger }) => {
  const isOutflow = item.type === "debit"
  
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-xl ${!isOutflow ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
            {!isOutflow ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
          </div>
          <div className="min-w-0">
            <h4 className="text-[14px] font-bold truncate">{item.description}</h4>
            <div className="flex gap-3 text-[10px] text-slate-500 mt-0.5">
              <span className="flex items-center gap-1"><Calendar size={10}/> {item.date_name}</span>
              <span className="flex items-center gap-1"><Clock size={10}/> {item.elapsed_time}</span>
            </div>
          </div>
        </div>
        <div className="text-right pl-3">
          <p className={`text-[15px] font-black tabular-nums ${!isOutflow ? "text-emerald-600" : "text-red-600"}`}>
            {!isOutflow ? "+" : "-"}{item.amount.toLocaleString()}
          </p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ref: {item.ledger_id.slice(0,8)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/50 text-[11px] font-bold">
        <div className="flex-1 truncate">
          <p className="text-[9px] text-slate-400 uppercase">From</p>
          {item.sender_account_name}
        </div>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
        <div className="flex-1 truncate text-right">
          <p className="text-[9px] text-slate-400 uppercase">To</p>
          {item.receiver_account_name}
        </div>
      </div>
    </div>
  )
}

export default function LedgerPage() {
  const sp = useSearchParams()
  const accountNumber = (sp.get("account_number") || "1001").trim()

  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [timeElapsedDisplay, setTimeElapsedDisplay] = useState("0:00")

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/ledgers/get-all-by-account-number?account_number=${accountNumber}`)
      const data = await res.json()
      setLedgers(data.exists ? data.ledgers : [])
      setLastRefreshed(new Date())
      setErr("")
    } catch (e: any) {
      setErr("Failed to fetch ledger data")
    } finally {
      setLoading(false)
    }
  }, [accountNumber])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const interval = setInterval(() => {
      const secondsTotal = Math.floor((new Date().getTime() - lastRefreshed.getTime()) / 1000)
      const mins = Math.floor(secondsTotal / 60)
      const secs = secondsTotal % 60
      setTimeElapsedDisplay(`${mins}:${secs.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [lastRefreshed])

  const { sorted, totals, accountName } = useMemo(() => {
    const sorted = [...ledgers].sort((a, b) => b.created.localeCompare(a.created))
    const totals = ledgers.reduce((acc, l) => {
      if (l.type === "credit") acc.inflow += l.amount
      else acc.outflow += l.amount
      return acc
    }, { inflow: 0, outflow: 0 })

    const firstMatch = ledgers[0]
    const name = firstMatch 
      ? (firstMatch.sender_account_number === accountNumber ? firstMatch.sender_account_name : firstMatch.receiver_account_name) 
      : `Account ${accountNumber}`

    return { sorted, totals, accountName: name }
  }, [ledgers, accountNumber])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-100">
      <nav className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg"><Wallet className="text-emerald-500" size={18} /></div>
            <div>
              <h1 className="font-bold text-sm truncate max-w-[150px]">{accountName}</h1>
              <div className="text-[9px] font-bold text-slate-400 uppercase">{loading ? "Refreshing..." : `Live • ${timeElapsedDisplay} ago`}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={load} disabled={loading} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full disabled:opacity-50">
              <RefreshCw size={16} className={loading ? "animate-spin" : "text-slate-500"} />
            </button>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Net Movement</p>
              <p className="font-black text-lg tabular-nums">{(totals.inflow - totals.outflow).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-6 py-8">
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard title="Total Credit" amount={totals.inflow} icon={TrendingUp} colorClass="text-emerald-500" />
          <StatCard title="Total Debit" amount={totals.outflow} icon={TrendingDown} colorClass="text-red-500" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1 mb-2">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Transaction History</h2>
            <span className="text-[10px] text-slate-400 font-medium">{sorted.length} records</span>
          </div>

          {loading && sorted.length === 0 ? (
            <div className="animate-pulse space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-900 rounded-2xl" />)}
            </div>
          ) : (
            sorted.map(item => <LedgerItem key={item.ledger_id} item={item} />)
          )}
        </div>
      </main>
    </div>
  )
}