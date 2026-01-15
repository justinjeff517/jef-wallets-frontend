"use client";

import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  History, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar
} from "lucide-react";

interface Ledger {
  ledger_id: string;
  type: "credit" | "debit";
  description: string;
  amount: number;
  balance_after: number;
  created_name: string;
  sender_account_name: string;
  receiver_account_name: string;
  date_name: string;
}

export default function LedgerPage() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // UPDATED API ENDPOINT
    fetch("/api/ledgers/get-all-by-account-number")
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) setLedgers(data.ledgers);
      })
      .catch(err => console.error("Fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const latestBalance = ledgers[0]?.balance_after ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* STICKY HEADER FOR BALANCE */}
      <nav className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="font-bold text-sm tracking-tight">Farm Ledger</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Current Balance</p>
            <p className="font-black text-lg tabular-nums">
              ₱{loading ? "---" : latestBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-6 py-8 pb-24">
        
        {/* QUICK STATS CARDS */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <TrendingUp size={14} className="text-emerald-500 mb-2" />
            <p className="text-[10px] font-bold text-slate-500 uppercase">Inflow</p>
            <p className="text-sm font-bold">Verified</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <TrendingDown size={14} className="text-red-500 mb-2" />
            <p className="text-[10px] font-bold text-slate-500 uppercase">Outflow</p>
            <p className="text-sm font-bold">Operating</p>
          </div>
        </div>

        {/* SECTION HEADER */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <History size={16} className="text-slate-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
              Activity Log
            </h3>
          </div>
          <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {ledgers.length} Records
          </span>
        </header>

        {/* LEDGER LIST */}
        <div className="space-y-3">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-24 w-full rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-900" />
            ))
          ) : (
            ledgers.map((item) => (
              <div 
                key={item.ledger_id} 
                className="group relative p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      item.type === 'credit' 
                        ? 'bg-emerald-500/10 text-emerald-600' 
                        : 'bg-red-500/10 text-red-600'
                    }`}>
                      {item.type === 'credit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold leading-tight line-clamp-1">
                        {item.description}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
                        <Calendar size={10} />
                        {item.date_name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-[15px] font-black tabular-nums ${
                      item.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {item.type === 'credit' ? '+' : '-'}{item.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 tabular-nums">
                      ₱{item.balance_after.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* TRANSFER PATHWAY */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                  <div className="flex-1 truncate">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-tighter">Origin</p>
                    <p className="text-[11px] font-bold truncate">
                      {item.type === 'credit' ? item.sender_account_name : 'Ellorimo Farm'}
                    </p>
                  </div>
                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="flex-1 truncate text-right">
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-tighter">Destination</p>
                    <p className="text-[11px] font-bold truncate">
                      {item.type === 'debit' ? item.receiver_account_name : 'Ellorimo Farm'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="mt-16 text-center opacity-30">
          <p className="text-[9px] font-black uppercase tracking-[0.5em]">
            End of Transaction Records
          </p>
        </footer>
      </main>
    </div>
  );
}