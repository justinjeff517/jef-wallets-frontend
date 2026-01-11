"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface Ledger {
  transaction_number: string;
  type: "credit" | "debit";
  description: string;
  amount: number;
  balance_after: number;
}

export default function LedgerPage() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wallets/get-all-ledgers-by-entity-number")
      .then(res => res.json())
      .then(data => { if (data.exists) setLedgers(data.ledgers); })
      .finally(() => setLoading(false));
  }, []);

  const latestBalance = ledgers[0]?.balance_after ?? 0;

  return (
    <div className="max-w-md mx-auto px-6 pb-32">
      {/* Minimalist Balance Header */}
      <header className="py-12 text-center">
        <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-1">
          Available Funds
        </p>
        <h2 className="text-5xl font-light tracking-tighter text-slate-900 dark:text-white">
          <span className="text-2xl mr-1 opacity-50">₱</span>
          {latestBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </h2>
      </header>

      {/* Ledger List */}
      <section className="space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
          Transaction History
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin opacity-20" /></div>
          ) : (
            ledgers.map((item) => (
              <div key={item.transaction_number} className="py-5 flex justify-between items-center group">
                {/* Left Side: Info */}
                <div className="min-w-0 pr-4">
                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight mb-1">
                    {item.description}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium tracking-wider">
                    REF: {item.transaction_number.slice(-8).toUpperCase()}
                  </p>
                </div>

                {/* Right Side: Values with Labels & Wider Space */}
                <div className="w-36 shrink-0 flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="text-[7px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-tighter leading-none mb-1">
                      Amount
                    </p>
                    <p className={`text-sm font-black tabular-nums leading-none ${
                      item.type === 'credit' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                    }`}>
                      {item.type === 'credit' ? '+' : '-'}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-[7px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-tighter leading-none mb-1">
                      Post Balance
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 tabular-nums leading-none">
                      {item.balance_after.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Floating Action */}
      <div className="fixed bottom-24 left-0 right-0 px-6 max-w-md mx-auto">
        <button className="w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl transition-all active:scale-95 shadow-2xl">
          Request Statement
        </button>
      </div>
    </div>
  );
}