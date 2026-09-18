import Image from "next/image";
import { db } from "@/db";
import {
  cashbookEntries,
  bankAccounts,
  cashDeposits,
  cheques,
  bills,
  ledgerHeads,
} from "@/db/schema";
import { inr, num, currentFY } from "@/lib/format";
import { getApmcProfile } from "@/lib/profile";
import { StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [currentYear, currentMonthNumber] = currentMonth.split("-").map(Number);
  const currentFinancialYearStart =
    currentMonthNumber >= 4 ? currentYear : currentYear - 1;
  const monthGroups = [currentFinancialYearStart, currentFinancialYearStart - 1].map(
    (financialYearStart) => ({
      financialYear: `${financialYearStart}-${String(financialYearStart + 1).slice(-2)}`,
      options: Array.from({ length: 12 }, (_, index) => {
        const date = new Date(Date.UTC(financialYearStart, 3 + index, 1));
        return {
          value: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
          label: date.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }),
        };
      }),
    }),
  );
  const allowedMonths = new Set(
    monthGroups.flatMap((group) => group.options.map((option) => option.value)),
  );
  const requestedMonth = /^\d{4}-\d{2}$/.test(month ?? "")
    ? month!
    : currentMonth;
  const selectedMonth = allowedMonths.has(requestedMonth)
    ? requestedMonth
    : currentMonth;

  const [entries, banks, deposits, chq, billRows, heads, profile] = await Promise.all([
    db.select().from(cashbookEntries),
    db.select().from(bankAccounts),
    db.select().from(cashDeposits),
    db.select().from(cheques),
    db.select().from(bills),
    db.select().from(ledgerHeads),
    getApmcProfile(),
  ]);

  const headMap = new Map(heads.map((h) => [h.id, h]));

  let cashBal = 0;
  let bankBal = banks.reduce((sum, b) => sum + num(b.openingBalance), 0);
  let totalIncome = 0;
  let totalExpense = 0;

  for (const deposit of deposits) {
    const amount = num(deposit.amount);
    cashBal -= amount;
    const bank = banks.find((item) => item.id === deposit.bankAccountId);
    if (!bank?.openingBalanceDate || deposit.depositDate >= bank.openingBalanceDate) {
      bankBal += amount;
    }
  }

  for (const e of entries) {
    const amt = num(e.amount);
    const sign = e.entryType === "receipt" ? 1 : -1;
    if (e.mode === "cash") {
      cashBal += sign * amt;
    } else {
      const bank = e.bankAccountId
        ? banks.find((item) => item.id === e.bankAccountId)
        : null;
      if (!bank?.openingBalanceDate || e.entryDate >= bank.openingBalanceDate) {
        bankBal += sign * amt;
      }
    }
    const head = headMap.get(e.ledgerHeadId);
    if (e.entryType === "receipt" && head?.type === "income") totalIncome += amt;
    if (e.entryType === "payment" && head?.type === "expense") totalExpense += amt;
  }

  const pendingCheques = chq.filter((c) => c.status === "pending");
  const pendingBills = billRows.filter(
    (bill) =>
      (bill.status === "draft" || bill.status === "pending") &&
      !bill.postedCashbookEntryId,
  );
  const monthlyIncomeByCode = new Map<string, number>();
  for (const entry of entries) {
    const head = headMap.get(entry.ledgerHeadId);
    if (
      entry.entryType !== "receipt" ||
      head?.type !== "income" ||
      entry.entryDate.slice(0, 7) !== selectedMonth
    ) {
      continue;
    }
    monthlyIncomeByCode.set(
      head.code,
      (monthlyIncomeByCode.get(head.code) ?? 0) + num(entry.amount),
    );
  }
  const mandiFeeThisMonth = monthlyIncomeByCode.get("1-A") ?? 0;
  const vikasCessThisMonth = monthlyIncomeByCode.get("1-B") ?? 0;
  const shamanFeeThisMonth = monthlyIncomeByCode.get("6-D") ?? 0;
  const highlightedCodes = new Set(["1-A", "1-B", "6-D"]);
  const otherIncomeThisMonth = [...monthlyIncomeByCode.entries()].reduce(
    (sum, [code, amount]) =>
      highlightedCodes.has(code) ? sum : sum + amount,
    0,
  );
  const selectedMonthDate = new Date(`${selectedMonth}-01T00:00:00`);
  const selectedMonthLabel = selectedMonthDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-700 px-6 py-5 text-white shadow-lg">
        <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full border-[36px] border-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white p-2 shadow-lg ring-4 ring-white/20">
              <Image
                src="/images/apmc-seal.svg"
                alt="Uttar Pradesh Mandi Parishad seal"
                width={88}
                height={88}
                priority
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              {profile?.mandiNameHindi && (
                <p className="text-sm font-semibold text-emerald-200">
                  {profile.mandiNameHindi}
                </p>
              )}
              <h1 className={`${profile?.mandiNameHindi ? "mt-1" : ""} text-2xl font-bold tracking-tight sm:text-3xl`}>
                {profile?.mandiName ?? "APMC Accounts Dashboard"}
              </h1>
              <p className="mt-1 text-sm text-emerald-100">
                {[profile?.address, profile?.district, profile?.state ?? "Uttar Pradesh"]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-right backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">
              Accounts Dashboard · लेखा डैशबोर्ड
            </p>
            <p className="mt-1 text-lg font-bold">Financial Year {currentFY()}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cash in Hand" value={inr(cashBal)} icon="💵" accent="emerald" />
        <StatCard label="Bank Balance" value={inr(bankBal)} icon="🏦" accent="blue" />
        <StatCard label="Total Income (Receipts)" value={inr(totalIncome)} icon="📈" accent="emerald" />
        <StatCard label="Total Expense (Payments)" value={inr(totalExpense)} icon="📉" accent="red" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Bank Accounts" value={String(banks.length)} icon="💳" accent="blue" />
        <StatCard label="Pending Cheques" value={String(pendingCheques.length)} icon="🧾" accent="amber" />
        <StatCard label="Bills Awaiting Payment" value={String(pendingBills.length)} icon="📋" accent="amber" />
      </div>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Month-wise Revenue / माहवार आय
            </h2>
            <p className="text-sm text-slate-500">
              Selected month: {selectedMonthLabel}
            </p>
          </div>
          <form
            method="get"
            className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="min-w-56">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Month / माह चुनें
              </label>
              <select
                name="month"
                defaultValue={selectedMonth}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                {monthGroups.map((group) => (
                  <optgroup
                    key={group.financialYear}
                    label={`Financial Year ${group.financialYear}`}
                  >
                    {group.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                        {option.value === currentMonth ? " (Current)" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
              View Month
            </button>
          </form>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Cashbook receipt entries से real-time calculation
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="मण्डी शुल्क / Mandi Fee"
            value={inr(mandiFeeThisMonth)}
            icon="🌾"
            accent="emerald"
          />
          <StatCard
            label="विकास सेस / Development Cess"
            value={inr(vikasCessThisMonth)}
            icon="🏗️"
            accent="blue"
          />
          <StatCard
            label="शमन शुल्क / Compounding Fee"
            value={inr(shamanFeeThisMonth)}
            icon="🧾"
            accent="amber"
          />
          <StatCard
            label="अन्य समस्त आय / Other Income"
            value={inr(otherIncomeThisMonth)}
            icon="📊"
            accent="emerald"
          />
        </div>
      </section>
    </div>
  );
}
