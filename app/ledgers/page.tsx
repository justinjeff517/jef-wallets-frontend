"use client"

import React from "react"
import { 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Download, 
  User, 
  Clock,
  Wallet
} from "lucide-react"

const DATA = {
  "exists": true,
  "message": "Transactions found.",
  "transactions": [
    {
      "counterparty_account_number": "1002",
      "counterparty_account_name": "JEF Eggstore",
      "date": "2026-01-16",
      "date_name": "January 16, 2026, Friday",
      "created": "2026-01-16T08:15:13+08:00",
      "created_name": "January 16, 2026, Friday, 8:15 AM",
      "created_by": "00031",
      "type": "sender",
      "description": "Payment for feeds delivery (Invoice #FEED-01923)",
      "amount": 815.0
    },
    {
      "counterparty_account_number": "1003",
      "counterparty_account_name": "JEF Sari-Sari Store",
      "date": "2026-01-16",
      "date_name": "January 16, 2026, Friday",
      "created": "2026-01-16T08:03:13+08:00",
      "created_name": "January 16, 2026, Friday, 8:03 AM",
      "created_by": "00031",
      "type": "receiver",
      "description": "Received payment for grocery supply (Ref: SS-7782)",
      "amount": 803.0
    },
    {
      "counterparty_account_number": "1005",
      "counterparty_account_name": "JEF Water Station",
      "date": "2026-01-15",
      "date_name": "January 15, 2026, Thursday",
      "created": "2026-01-15T17:42:09+08:00",
      "created_name": "January 15, 2026, Thursday, 5:42 PM",
      "created_by": "00031",
      "type": "sender",
      "description": "Utility payment: water refill service (Jan 2026)",
      "amount": 450.0
    },
    {
      "counterparty_account_number": "1006",
      "counterparty_account_name": "JEF Logistics",
      "date": "2026-01-14",
      "date_name": "January 14, 2026, Wednesday",
      "created": "2026-01-14T10:28:45+08:00",
      "created_name": "January 14, 2026, Wednesday, 10:28 AM",
      "created_by": "00017",
      "type": "receiver",
      "description": "Received reimbursement: transport expenses (Trip #TR-5521)",
      "amount": 1200.0
    },
    {
      "counterparty_account_number": "1010",
      "counterparty_account_name": "JEF Vet Services",
      "date": "2026-01-13",
      "date_name": "January 13, 2026, Tuesday",
      "created": "2026-01-13T15:06:31+08:00",
      "created_name": "January 13, 2026, Tuesday, 3:06 PM",
      "created_by": "00031",
      "type": "sender",
      "description": "Consultation and medication (Case #VET-1044)",
      "amount": 2350.0
    }
  ]
}

export default function TransactionList() {
  const inflow = DATA.transactions
    .filter(t => t.type === 'receiver')
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const outflow = DATA.transactions
    .filter(t => t.type === 'sender')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Simple Header */}
        <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-zinc-500 font-medium">Ellorimo Farm • Activity Log</p>
          </div>
          <button className="p-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
            <Download size={20} />
          </button>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Total Received</p>
            <p className="text-xl font-mono font-bold">+{inflow.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Total Sent</p>
            <p className="text-xl font-mono font-bold">-{outflow.toFixed(2)}</p>
          </div>
        </div>

        {/* Transaction Items */}
        <div className="space-y-3">
          {DATA.transactions.map((tx, idx) => {
            const isSent = tx.type === "sender";
            
            return (
              <div 
                key={idx} 
                className="group bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Icon Indicator */}
                  <div className={`p-3 rounded-xl ${isSent ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'}`}>
                    {isSent ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                  </div>

                  {/* Main Info */}
                  <div className="flex flex-col">
                    <span className="font-bold text-sm sm:text-base leading-tight">
                      {tx.counterparty_account_name}
                    </span>
                    <span className="text-xs text-zinc-500 line-clamp-1">
                      {tx.description}
                    </span>
                    <div className="flex items-center gap-3 mt-1 text-[10px] font-medium text-zinc-400">
                      <span className="flex items-center gap-1"><Clock size={10} /> {tx.created_name.split(',').pop()}</span>
                      <span className="flex items-center gap-1"><User size={10} /> {tx.created_by}</span>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right flex flex-col items-end">
                  <span className={`text-base sm:text-lg font-mono font-bold ${isSent ? 'text-zinc-900 dark:text-zinc-100' : 'text-emerald-600'}`}>
                    {isSent ? '-' : '+'}{tx.amount.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
                    {tx.date_name.split(',')[0]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Net Balance */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center px-2">
          <div className="flex items-center gap-2 text-zinc-500">
            <Wallet size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Net Cash Movement</span>
          </div>
          <span className={`text-lg font-mono font-black ${(inflow - outflow) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {(inflow - outflow).toLocaleString(undefined, { minimumFractionDigits: 2, signDisplay: 'always' })}
          </span>
        </div>

      </div>
    </div>
  )
}