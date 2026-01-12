import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRightLeft, ReceiptText, ScanLine, WalletCards, ChevronRight } from "lucide-react"

export default function Page() {
  return (
    // Added dark:bg-zinc-950
    <main className="mx-auto w-full max-w-md min-h-screen p-4 bg-zinc-50/50 dark:bg-zinc-950 space-y-4 transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          {/* Logo: Inverted colors for dark mode */}
          <div className="h-8 w-8 bg-black dark:bg-white rounded-full flex items-center justify-center">
            <span className="text-white dark:text-black text-[10px] font-bold">JEF</span>
          </div>
          <h1 className="text-sm font-bold tracking-tight">Vault</h1>
        </div>

        <Badge
          variant="secondary"
          className="rounded-full font-medium text-[10px] bg-zinc-200/60 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        >
          SECURE
        </Badge>
      </header>

      {/* Balance Card - Stays dark in both modes for a premium feel, 
          but slightly adjusted border/glow for dark mode visibility */}
      <section className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-500 to-zinc-900 dark:from-zinc-400 dark:to-zinc-100 rounded-[28px] blur opacity-10 group-hover:opacity-20 transition duration-700" />
        <div className="relative bg-zinc-950 dark:bg-zinc-900 border border-white/5 rounded-[26px] p-5 text-white shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 opacity-10">
            <WalletCards size={140} />
          </div>

          <div className="space-y-1 relative z-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">
              Available PHP Balance
            </p>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">₱ 0.00</span>
              <span className="text-zinc-500 text-xs font-medium">Credits</span>
            </div>
          </div>

          <div className="mt-4 relative z-10">
            <Button
              asChild
              className="w-full bg-white text-black hover:bg-zinc-200 dark:bg-zinc-100 dark:hover:bg-zinc-300 rounded-2xl h-11 font-semibold shadow-lg"
            >
              <Link href="/create-payment" className="flex items-center justify-center">
                <ScanLine className="mr-2 h-4 w-4" />
                Pay Now
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Management */}
      <section className="space-y-2">
        <p className="px-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          Management
        </p>

        <div className="grid grid-cols-1 gap-2">
          <Button
            asChild
            variant="ghost"
            // Adjusted background and borders for dark mode
            className="h-auto w-full rounded-[20px] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-200 transition-all shadow-sm"
          >
            <Link href="/create-payment" className="flex items-center w-full">
              {/* Icon container adjustment */}
              <div className="h-10 w-10 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center text-white dark:text-zinc-900 mr-3 shrink-0">
                <ArrowRightLeft className="h-5 w-5" />
              </div>

              <div className="flex-1 text-left leading-tight">
                <div className="text-sm font-semibold">Create Payment</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Scan QR or enter code</div>
              </div>

              <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 ml-2 shrink-0" />
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            className="h-auto w-full rounded-[20px] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-200 transition-all shadow-sm"
          >
            <Link href="/ledgers" className="flex items-center w-full">
              <div className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-900 dark:text-zinc-100 mr-3 shrink-0">
                <ReceiptText className="h-5 w-5" />
              </div>

              <div className="flex-1 text-left leading-tight">
                <div className="text-sm font-semibold">View Ledgers</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Activity and audit logs</div>
              </div>

              <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 ml-2 shrink-0" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Status Card */}
      <Card className="rounded-[20px] border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardContent className="p-3 text-center">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            Next settlement scheduled for 12:00 AM (PHT)
          </p>
        </CardContent>
      </Card>
    </main>
  )
}