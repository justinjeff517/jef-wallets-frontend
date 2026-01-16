"use client"

import React, { useEffect, useMemo, useState, useCallback } from "react"
import {
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Clock,
  Wallet,
  RotateCw,
} from "lucide-react"

// --- Types ---

type TxType = "sender" | "receiver"

type Transaction = {
  transaction_id: string
  counterparty_account_number: string
  counterparty_account_name: string
  date: string
  date_name: string
  created: string
  created_name: string
  created_by: string
  type: TxType
  description: string
  amount: number
}

type ApiResponse = {
  exists: boolean
  message: string
  transactions: Transaction[]
}

// --- Helpers ---

const asStr = (v: unknown) => (typeof v === "string" ? v : "")
const asNum = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

const formatCurrency = (num: number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

function lastCommaPart(s: string) {
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean)
  return parts.length ? parts[parts.length - 1] : s
}

function firstCommaPart(s: string) {
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean)
  return parts.length ? parts[0] : s
}

// --- Sub-Component: Transaction Item ---

function TransactionItem({ tx }: { tx: Transaction }) {
  const [isNew, setIsNew] = useState(false)
  const isSent = tx.type === "sender"

  useEffect(() => {
    if (!tx.created) return

    const createdTime = new Date(tx.created).getTime()
    const currentTime = Date.now()
    const diffSec = (currentTime - createdTime) / 1000
    const highlightWindow = 30 // seconds

    if (diffSec < highlightWindow) {
      setIsNew(true)

      // Calculate remaining time to keep the highlight active
      const remainingMs = (highlightWindow - diffSec) * 1000
      
      const timer = setTimeout(() => {
        setIsNew(false)
      }, remainingMs)

      return () => clearTimeout(timer)
    }
  }, [tx.created])

  return (
    <div
      className={`group p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all duration-1000 ease-out
        ${
          isNew
            ? "bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-100/50 dark:bg-emerald-900/20 dark:border-emerald-500 dark:shadow-none scale-[1.01] z-10"
            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
        }
      `}
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-3 rounded-xl transition-colors ${
            isSent
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
              : isNew 
                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700"
                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
          }`}
        >
          {isSent ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
        </div>

        <div className="flex flex-col">
          <span className="font-bold text-sm sm:text-base leading-tight">
            {tx.counterparty_account_name || "—"}
            {isNew && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 animate-pulse">
                NEW
              </span>
            )}
          </span>
          <span className="text-xs text-zinc-500 line-clamp-1">
            {tx.description || "—"}
          </span>
          <div className="flex items-center gap-3 mt-1 text-[10px] font-medium text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock size={10} /> {lastCommaPart(tx.created_name)}
            </span>
            <span className="flex items-center gap-1">
              <User size={10} /> {tx.created_by || "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right flex flex-col items-end">
        <span
          className={`text-base sm:text-lg font-mono font-bold ${
            isSent ? "text-zinc-900 dark:text-zinc-100" : "text-emerald-600"
          }`}
        >
          {isSent ? "-" : "+"}
          {formatCurrency(asNum(tx.amount))}
        </span>
        <span className="text-[10px] font-bold text-zinc-400 uppercase">
          {firstCommaPart(tx.date_name)}
        </span>
      </div>
    </div>
  )
}

// --- Main Component ---

export default function TransactionList() {
  const [accountNumber, setAccountNumber] = useState("1001")
  const [data, setData] = useState<ApiResponse>({
    exists: false,
    message: "Loading...",
    transactions: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const acc = asStr(sp.get("account_number")).trim()
      if (acc) setAccountNumber(acc)
    } catch {}
  }, [])

  const fetchData = useCallback(async (acc: string) => {
    setLoading(true)
    setError("")
    try {
      const url = `/api/transactions/get-all-by-account-number?account_number=${encodeURIComponent(
        acc
      )}`
      const res = await fetch(url, { method: "GET", cache: "no-store" })

      let payload: any = null
      try {
        payload = await res.json()
      } catch {
        payload = null
      }

      if (!res.ok) {
        const msg = asStr(payload?.message) || `Request failed (${res.status})`
        throw new Error(msg)
      }

      const txs = Array.isArray(payload?.transactions) ? payload.transactions : []
      const normalized: ApiResponse = {
        exists: Boolean(payload?.exists),
        message: asStr(payload?.message) || "ok",
        transactions: txs.map((t: any) => ({
          transaction_id: asStr(t?.transaction_id),
          counterparty_account_number: asStr(t?.counterparty_account_number),
          counterparty_account_name: asStr(t?.counterparty_account_name),
          date: asStr(t?.date),
          date_name: asStr(t?.date_name),
          created: asStr(t?.created),
          created_name: asStr(t?.created_name),
          created_by: asStr(t?.created_by),
          type: (t?.type === "sender" ? "sender" : "receiver") as TxType,
          description: asStr(t?.description),
          amount: asNum(t?.amount),
        })),
      }

      setData(normalized)
      setLastRefreshed(new Date())
    } catch (e: any) {
      setError(asStr(e?.message) || "Failed to load transactions.")
      setData({ exists: false, message: "error", transactions: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(accountNumber)
  }, [accountNumber, fetchData])

  const inflow = useMemo(() => {
    return (data.transactions || [])
      .filter((t) => t.type === "receiver")
      .reduce((acc, curr) => acc + asNum(curr.amount), 0)
  }, [data.transactions])

  const outflow = useMemo(() => {
    return (data.transactions || [])
      .filter((t) => t.type === "sender")
      .reduce((acc, curr) => acc + asNum(curr.amount), 0)
  }, [data.transactions])

  const headerSubtitle = `Account ${accountNumber} • Activity Log`

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-zinc-500 font-medium">{headerSubtitle}</p>

            {lastRefreshed && (
              <p className="mt-1 text-[10px] text-zinc-400 font-mono uppercase tracking-tighter">
                Last Refreshed:{" "}
                {lastRefreshed.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
                <span className="ml-1 opacity-60">(HH:MM:SS)</span>
              </p>
            )}

            {!!error && (
              <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>
            )}
          </div>

          <button
            onClick={() => fetchData(accountNumber)}
            disabled={loading}
            className="p-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition disabled:opacity-50"
            aria-label="Refresh"
            title="Refresh Data"
          >
            <RotateCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">
              Total Received
            </p>
            <p className="text-xl font-mono font-bold">
              +{formatCurrency(inflow)}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">
              Total Sent
            </p>
            <p className="text-xl font-mono font-bold">
              -{formatCurrency(outflow)}
            </p>
          </div>
        </div>

        {loading && data.transactions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-500">Loading…</p>
          </div>
        ) : (data.transactions || []).length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-500">
              No transactions found.
            </p>
          </div>
        ) : (
          <>
            <div
              className={`space-y-3 ${
                loading ? "opacity-50 pointer-events-none" : "opacity-100"
              } transition-opacity`}
            >
              {data.transactions.map((tx) => (
                <TransactionItem
                  key={
                    tx.transaction_id ||
                    `${tx.created}-${tx.counterparty_account_number}`
                  }
                  tx={tx}
                />
              ))}
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center px-2">
              <div className="flex items-center gap-2 text-zinc-500">
                <Wallet size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Net Cash Movement
                </span>
              </div>
              <span
                className={`text-lg font-mono font-black ${
                  inflow - outflow >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {(inflow - outflow).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                  signDisplay: "always",
                })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}