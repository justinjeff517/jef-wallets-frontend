"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownLeft, Wallet, History, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-white dark:bg-[#050505] text-slate-900 dark:text-slate-100">
      <main className="max-w-md mx-auto px-6 py-12">
        
        {/* Simplified Non-Sticky Balance */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-3 opacity-30">
            <Wallet size={14} strokeWidth={2.5} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operating Capital</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-medium text-slate-400">₱</span>
            <h2 className="text-3xl font-bold tracking-tight tabular-nums">
              {loading ? "---" : latestBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </section>

        {/* Header Label */}
        <header className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-900 pb-4">
          <div className="flex items-center gap-2">
            <History size={12} className="text-slate-400" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Transaction Ledger
            </h3>
          </div>
          {!loading && (
            <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {ledgers.length} ENTRIES
            </span>
          )}
        </header>

        {/* Scrollable List */}
        <div className="space-y-1">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="h-16 w-full animate-pulse bg-slate-50 dark:bg-slate-900/50 rounded-lg mb-2" />
            ))
          ) : (
            ledgers.map((item) => (
              <div 
                key={item.ledger_id} 
                className="group flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-900 last:border-0"
              >
                {/* Information Block */}
                <div className="min-w-0 flex flex-col gap-1">
                  <p className="text-[13px] font-bold leading-none tracking-tight">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                    <span className="truncate max-w-[100px]">
                      {item.type === 'credit' ? item.sender_account_name : 'To Branch'}
                    </span>
                    <ArrowRight size={8} className="opacity-30" />
                    <span className="truncate max-w-[100px]">
                      {item.type === 'debit' ? item.receiver_account_name : 'Farm Main'}
                    </span>
                  </div>
                  
                  <p className="text-[9px] text-slate-300 dark:text-slate-700 font-mono uppercase tracking-tighter">
                    {item.created_name}
                  </p>
                </div>

                {/* Amount Block */}
                <div className="text-right flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1">
                    <span className={`text-[13px] font-black tabular-nums ${
                      item.type === 'credit' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                    }`}>
                      {item.type === 'credit' ? '+' : '-'}{item.amount.toLocaleString()}
                    </span>
                    <div className={`w-1 h-1 rounded-full ${
                      item.type === 'credit' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 tabular-nums">
                    {item.balance_after.toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info for 'Durable' feel */}
        <footer className="mt-20 pt-8 border-t border-slate-50 dark:border-slate-900 text-center">
          <p className="text-[9px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em]">
            End of Ledger Record
          </p>
        </footer>
      </main>
    </div>
  );
}