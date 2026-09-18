"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const nav = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/cashbook", label: "Cashbook", icon: "📒" },
  { href: "/ledger", label: "Ledger", icon: "📚" },
  { href: "/brs", label: "BRS", icon: "🏦" },
  { href: "/reports", label: "Income & Expense", icon: "📈" },
  { href: "/bank-accounts", label: "Bank Accounts", icon: "💳" },
  { href: "/cheques", label: "Cheque Register", icon: "🧾" },
  { href: "/deposits", label: "Cash Deposits", icon: "💰" },
  { href: "/bills-budget", label: "Bill & Budget", icon: "📋" },
  { href: "/shop-rent", label: "Shop Rent & Premium", icon: "🏪" },
  { href: "/staff-payments", label: "Staff & Payments", icon: "👥" },
  { href: "/tds-returns", label: "TDS Returns", icon: "🏛️" },
  { href: "/revenue-progress", label: "Revenue Progress", icon: "🎯" },
  { href: "/settings", label: "Profile & Settings", icon: "⚙️" },
];

export default function Sidebar({ apmcName }: { apmcName: string }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-emerald-950 text-emerald-50">
      <div className="border-b border-emerald-900 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-sm ring-2 ring-emerald-700">
            <Image
              src="/images/apmc-seal.svg"
              alt="Uttar Pradesh Mandi Parishad seal"
              width={52}
              height={52}
              priority
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-sm font-bold leading-snug text-white">
              {apmcName}
            </h1>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-emerald-600 text-white shadow"
                  : "text-emerald-200 hover:bg-emerald-900 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action={logout} className="border-t border-emerald-900 px-3 py-3">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-900 hover:text-white"
        >
          <span className="text-lg">🚪</span>
          Logout
        </button>
      </form>
      <div className="border-t border-emerald-900 px-5 py-4 text-[11px] text-emerald-400">
        Accounting & Finance Module
      </div>
    </aside>
  );
}
