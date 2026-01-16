"use client"

import React from "react"
import { Calendar, Hash, Download, CheckCircle2 } from "lucide-react"

const DATA = {
  account_number: "1001",
  entries: [
    {
      transaction_id: "85281fcb-073c-4a9b-adb4-c171292340b6",
      created_name: "Jan 16, 2026, 8:15 AM",
      description: "Egg tray purchase (30 pcs) - delivery to Ellorimo Farm",
      amount: 815.0,
      lines: [
        { type: "debit", account_number: "1002", account_name: "JEF Eggstore", amount: 815.0 },
        { type: "credit", account_number: "1001", account_name: "Ellorimo Farm", amount: 815.0 },
      ],
    },
    {
      transaction_id: "2e2646ba-c360-4f7b-bb58-8564935a8189",
      created_name: "Jan 16, 2026, 8:03 AM",
      description: "Farm supplies reimbursement - packing materials",
      amount: 803.0,
      lines: [
        { type: "debit", account_number: "1001", account_name: "Ellorimo Farm", amount: 803.0 },
        { type: "credit", account_number: "1002", account_name: "JEF Eggstore", amount: 803.0 },
      ],
    },

    {
      transaction_id: "1c4d0f3a-6a70-4b1f-b95a-9f8e0dcf4c1e",
      created_name: "Jan 15, 2026, 6:42 PM",
      description: "Eggstore settlement - daily sales remittance (cash pickup)",
      amount: 12500.0,
      lines: [
        { type: "debit", account_number: "1001", account_name: "Ellorimo Farm", amount: 12500.0 },
        { type: "credit", account_number: "1002", account_name: "JEF Eggstore", amount: 12500.0 },
      ],
    },
    {
      transaction_id: "9a72d9c6-0e1a-4e19-9f34-0fd9e9b35a24",
      created_name: "Jan 15, 2026, 2:10 PM",
      description: "Fuel for delivery motorcycle - 3.5L gasoline",
      amount: 320.0,
      lines: [
        { type: "debit", account_number: "1001", account_name: "Ellorimo Farm", amount: 320.0 },
        { type: "credit", account_number: "1003", account_name: "JEF Sari-Sari Store", amount: 320.0 },
      ],
    },
    {
      transaction_id: "5c6e2b3a-3d5a-4e6e-8f2e-0f8a4d17d2b9",
      created_name: "Jan 14, 2026, 9:18 AM",
      description: "Chicken feed purchase - 2 sacks (starter)",
      amount: 2980.0,
      lines: [
        { type: "debit", account_number: "1001", account_name: "Ellorimo Farm", amount: 2980.0 },
        { type: "credit", account_number: "1004", account_name: "Agri Supply Partner", amount: 2980.0 },
      ],
    },
    {
      transaction_id: "b7e3a1d2-1b2c-4f16-9d65-7f9c2d4b0c8a",
      created_name: "Jan 14, 2026, 4:55 PM",
      description: "Eggstore inventory top-up - 15 trays (for weekend sales)",
      amount: 4050.0,
      lines: [
        { type: "debit", account_number: "1002", account_name: "JEF Eggstore", amount: 4050.0 },
        { type: "credit", account_number: "1001", account_name: "Ellorimo Farm", amount: 4050.0 },
      ],
    },
    {
      transaction_id: "e2b9a6d1-5e7b-4b70-bc6b-1a33c0b77c2f",
      created_name: "Jan 13, 2026, 7:30 PM",
      description: "Employee cash advance - farm helper (partial)",
      amount: 1500.0,
      lines: [
        { type: "debit", account_number: "1005", account_name: "Payroll / Advances", amount: 1500.0 },
        { type: "credit", account_number: "1001", account_name: "Ellorimo Farm", amount: 1500.0 },
      ],
    },
    {
      transaction_id: "3f0a8c2d-7b9e-4b92-9c21-8d0f1f2e5a77",
      created_name: "Jan 13, 2026, 11:05 AM",
      description: "Packaging materials - 200 pcs plastic bags + tape",
      amount: 560.0,
      lines: [
        { type: "debit", account_number: "1001", account_name: "Ellorimo Farm", amount: 560.0 },
        { type: "credit", account_number: "1003", account_name: "JEF Sari-Sari Store", amount: 560.0 },
      ],
    },
    {
      transaction_id: "d8f2c1a4-2f1a-46b8-8c1d-4b2a6a9f0d11",
      created_name: "Jan 12, 2026, 5:12 PM",
      description: "Eggstore settlement - weekend sales remittance",
      amount: 9800.0,
      lines: [
        { type: "debit", account_number: "1001", account_name: "Ellorimo Farm", amount: 9800.0 },
        { type: "credit", account_number: "1002", account_name: "JEF Eggstore", amount: 9800.0 },
      ],
    },
    {
      transaction_id: "0f1d2c3b-4a5e-4d6f-9a0b-1c2d3e4f5a6b",
      created_name: "Jan 12, 2026, 8:20 AM",
      description: "Veterinary vitamins - poultry supplement (1 bottle)",
      amount: 450.0,
      lines: [
        { type: "debit", account_number: "1001", account_name: "Ellorimo Farm", amount: 450.0 },
        { type: "credit", account_number: "1006", account_name: "Vet / Pharmacy Partner", amount: 450.0 },
      ],
    },
  ],
}


export default function MobileFriendlyLedger() {
  const activeAcc = DATA.account_number;
  const totals = DATA.entries.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-3 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Header - Stacks on tiny screens */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Ellorimo Farm</h1>
            <p className="text-sm sm:text-base text-zinc-500 font-medium">Acc {activeAcc} • Ledger</p>
          </div>
          <button className="flex items-center justify-center gap-2 text-sm font-bold border-2 border-zinc-200 dark:border-zinc-800 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 shadow-sm active:scale-95 transition">
            <Download size={18} /> <span className="sm:inline">Export CSV</span>
          </button>
        </header>

        {/* Transaction Cards */}
        {DATA.entries.map((entry) => (
          <div key={entry.transaction_id} className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Header: Wrapped for Mobile */}
            <div className="px-4 py-3 sm:px-6 bg-zinc-50/50 dark:bg-zinc-800/30 border-b-2 border-zinc-100 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-2 text-xs sm:text-sm font-bold text-zinc-500">
              <div className="flex gap-3 sm:gap-6">
                <span className="flex items-center gap-1.5"><Calendar size={14} /> {entry.created_name.split(',')[0]}</span>
                <span className="flex items-center gap-1.5 font-mono"><Hash size={14} /> {entry.transaction_id.slice(0, 8)}</span>
              </div>
              <span className="uppercase tracking-wide text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">Memo: {entry.description}</span>
            </div>

            {/* Body */}
            <div className="divide-y-2 divide-zinc-50 dark:divide-zinc-800/50">
              {entry.lines.map((line, idx) => (
                <div key={idx} className={`flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-0 px-4 py-4 sm:px-6 sm:py-5 ${line.account_number === activeAcc ? 'bg-emerald-50/30 dark:bg-emerald-500/[0.03]' : ''}`}>
                  
                  {/* Account Column */}
                  <div className={`sm:col-span-7 flex flex-col ${line.type === 'credit' ? 'pl-4 border-l-4 border-zinc-200 dark:border-zinc-700 sm:border-zinc-100' : ''}`}>
                    <span className={`text-base sm:text-lg ${line.type === 'credit' ? 'text-zinc-500' : 'font-bold'}`}>
                      {line.account_name}
                    </span>
                    <span className="text-xs sm:text-sm font-mono text-zinc-400">ID: {line.account_number}</span>
                  </div>

                  {/* Amounts Column - Side by side on mobile */}
                  <div className="sm:col-span-5 flex justify-between sm:justify-end gap-4 sm:gap-10 text-base sm:text-lg font-mono">
                    <div className="flex flex-col sm:block">
                      <span className="sm:hidden text-[10px] uppercase font-sans font-bold text-zinc-400">Debit</span>
                      <div className="w-full sm:w-24 text-left sm:text-right">
                        {line.type === 'debit' ? line.amount.toFixed(2) : <span className="text-zinc-200 dark:text-zinc-800">—</span>}
                      </div>
                    </div>
                    <div className="flex flex-col sm:block">
                      <span className="sm:hidden text-[10px] uppercase font-sans font-bold text-zinc-400">Credit</span>
                      <div className={`w-full sm:w-24 text-right ${line.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-zinc-200 dark:text-zinc-800'}`}>
                        {line.type === 'credit' ? line.amount.toFixed(2) : '—'}
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Total Summary - Stacks on Mobile */}
        <footer className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] self-start sm:self-auto">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <span className="hidden xs:inline">Balanced</span>
          </div>
          <div className="flex w-full md:w-auto justify-between sm:justify-end gap-8 sm:gap-12">
            <div>
              <p className="text-[10px] sm:text-xs uppercase opacity-60 font-bold mb-1">Total DR</p>
              <p className="text-xl sm:text-2xl font-mono font-bold tracking-tighter">{totals.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div className="sm:border-l border-zinc-700 dark:border-zinc-300 sm:pl-12 text-right">
              <p className="text-[10px] sm:text-xs uppercase opacity-60 font-bold mb-1 text-emerald-400 dark:text-emerald-600">Total CR</p>
              <p className="text-xl sm:text-2xl font-mono font-bold tracking-tighter text-emerald-400 dark:text-emerald-600">
                {totals.toLocaleString(undefined, {minimumFractionDigits: 2})}
              </p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}