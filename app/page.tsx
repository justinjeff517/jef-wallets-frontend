"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRightLeft, ReceiptText, ScanLine, WalletCards, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react"

export default function Page() {
  const [balance, setBalance] = useState<number | null>(null)
  const [refDate, setRefDate] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch("/api/ledgers/get-latest-balance-by-account-number")
        const data = await res.json()
        if (data.exists) {
          setBalance(data.latest_balance)
          setRefDate(data.reference_date_name)
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBalance()
  }, [])

  // Auto-close logic: Re-masks balance after 10 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setIsVisible(false), 10000)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  return (
    <main className="mx-auto w-full max-w-md min-h-screen p-4 bg-zinc-50/50 dark:bg-zinc-950 space-y-4 transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-black dark:bg-white rounded-full flex items-center justify-center">
            <span className="text-white dark:text-black text-[10px] font-bold">JEF</span>
          </div>
          <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">Vault</h1>
        </div>
        <Badge variant="secondary" className="rounded-full font-medium text-[10px] bg-zinc-200/60 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          SECURE
        </Badge>
      </header>

      {/* Balance Card - Dark Mode Compatible */}
      <section className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-500 to-zinc-900 dark:from-zinc-400 dark:to-zinc-100 rounded-[28px] blur opacity-10 group-hover:opacity-20 transition duration-700" />
        <div className="relative bg-zinc-950 dark:bg-zinc-900 border border-white/10 rounded-[26px] p-5 text-white shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 opacity-10 text-white">
            <WalletCards size={140} />
          </div>

          <div className="space-y-1 relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">
                {isLoading ? "Fetching Balance..." : `Balance as of ${refDate}`}
              </p>
              {!isLoading && (
                <button 
                  onClick={() => setIsVisible(!isVisible)}
                  className="text-zinc-500 hover:text-white transition-colors p-1"
                  aria-label={isVisible ? "Hide balance" : "Show balance"}
                >
                  {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums">
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
                ) : (
                  isVisible ? formatCurrency(balance ?? 0) : "₱ ••••••"
                )}
              </span>
              {!isLoading && <span className="text-zinc-500 text-xs font-medium">Credits</span>}
            </div>
          </div>

          <div className="mt-4 relative z-10">
            <Button asChild disabled={isLoading} className="w-full bg-white text-black hover:bg-zinc-200 dark:bg-zinc-100 dark:hover:bg-zinc-300 rounded-2xl h-11 font-semibold shadow-lg transition-transform active:scale-[0.98]">
              <Link href="/create-payment" className="flex items-center justify-center">
                <ScanLine className="mr-2 h-4 w-4" />
                Pay Now
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Management Section */}
      <section className="space-y-2">
        <p className="px-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Management</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { href: "/create-payment", title: "Create Payment", desc: "Scan QR or enter code", icon: ArrowRightLeft, iconBg: "bg-zinc-900 dark:bg-zinc-100", iconCol: "text-white dark:text-zinc-900" },
            { href: "/ledgers", title: "View Ledgers", desc: "Activity and audit logs", icon: ReceiptText, iconBg: "bg-zinc-100 dark:bg-zinc-800", iconCol: "text-zinc-900 dark:text-zinc-100" }
          ].map((item, i) => (
            <Button key={i} asChild variant="ghost" className="h-auto w-full rounded-[20px] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-200 transition-all shadow-sm">
              <Link href={item.href} className="flex items-center w-full">
                <div className={`h-10 w-10 ${item.iconBg} ${item.iconCol} rounded-2xl flex items-center justify-center mr-3 shrink-0`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left leading-tight">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{item.desc}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 ml-2 shrink-0" />
              </Link>
            </Button>
          ))}
        </div>
      </section>

      {/* Status Card */}
      <Card className="rounded-[20px] border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardContent className="p-3 text-center">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Next settlement scheduled for 12:00 AM (PHT)</p>
        </CardContent>
      </Card>
    </main>
  )
}