"use client";

import React, { useState, useEffect } from "react";
import { Wallet, History, ArrowRight } from "lucide-react";

interface Ledger {
  ledger_id: string;
  type: "credit" | "debit";
  description: string;
  amount: number;
  balance_after: number;
  created_name: string;
  sender_account_name: string;
  receiver_account_name: string;
}

export default function LedgerPage() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wallets/get-all-ledgers-by-entity-number")
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) setLedgers(data.ledgers);
      })
      .finally(() => setLoading(false));
  }, []);

  const latestBalance = ledgers[0]?.balance_after ?? 0;

  return (
    // Background is pure black in dark mode for maximum contrast
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white">
      <main className="max-w-md mx-auto px-6 py-12">
        
        {/* CRITICAL DATA: Total Balance */}
        <section className="mb-10 p-5 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-slate-600 dark:text-slate-300" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Current Operating Capital
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-500 dark:text-slate-400">₱</span>
            <h2 className="text-4xl font-black tracking-tight tabular-nums">
              {loading ? "---" : latestBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </section>

        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={16} className="text-slate-900 dark:text-white" />
            <h3 className="text-sm font-bold uppercase text-slate-900 dark:text-white">
              Transaction History
            </h3>
          </div>
          {!loading && (
            <span className="text-[10px] font-black bg-slate-900 dark:bg-white text-white dark:text-black px-2 py-1 rounded">
              {ledgers.length} RECORDS
            </span>
          )}
        </header>

        {/* Ledger List */}
        <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="py-6 animate-pulse bg-slate-50 dark:bg-slate-900/50" />
            ))
          ) : (
            ledgers.map((item) => (
              <div key={item.ledger_id} className="py-5 flex justify-between items-start gap-4">
                
                {/* TRANSACTION DETAILS */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold leading-tight mb-1 text-slate-900 dark:text-white">
                    {item.description}
                  </p>
                  
                  {/* Account Flow: Increased brightness for dark mode labels */}
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {item.type === 'credit' ? item.sender_account_name : 'FROM: INTERNAL'}
                    </span>
                    <ArrowRight size={10} className="text-slate-400" />
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {item.type === 'debit' ? item.receiver_account_name : 'TO: FARM MAIN'}
                    </span>
                  </div>
                  
                  {/* Metadata: Creator */}
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                    Recorded by: {item.created_name}
                  </p>
                </div>

                {/* FINANCIAL TOTALS */}
                <div className="text-right shrink-0">
                  <div className={`text-lg font-black tabular-nums ${
                    item.type === 'credit' 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {item.type === 'credit' ? '+' : '-'}{item.amount.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                    <span className="opacity-70 mr-1">BAL:</span>
                    ₱{item.balance_after.toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="mt-12 py-10 text-center border-t border-slate-100 dark:border-slate-900">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em]">
            Verified Official Record
          </p>
        </footer>
      </main>
    </div>
  );
}