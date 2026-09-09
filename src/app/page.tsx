import Image from "next/image";
import { db } from "@/db";
import {
  cashbookEntries,
  bankAccounts,
  cashDeposits,
  cheques,
  bills,
  ledgerHeads,
  apmcProfile,
} from "@/db/schema";
import { desc } from "drizzle-orm";
import { inr, num, fmtDate, currentFY } from "@/lib/format";
import { StatCard, Card, Th, Td, Badge, EmptyRow } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [entries, banks, deposits, chq, billRows, heads, profiles] = await Promise.all([
    db.select().from(cashbookEntries).orderBy(desc(cashbookEntries.entryDate), desc(cashbookEntries.id)),
    db.select().from(bankAccounts),
    db.select().from(cashDeposits),
    db.select().from(cheques),
    db.select().from(bills),
    db.select().from(ledgerHeads),
    db.select().from(apmcProfile).limit(1),
  ]);
  const profile = profiles[0];

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
  const pendingBills = billRows.filter((b) => b.status === "pending" || b.status === "approved");
  const recent = entries.slice(0, 8);

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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Recent Cashbook Entries" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Voucher</Th>
                  <Th>Head</Th>
                  <Th>Type</Th>
                  <Th right>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <EmptyRow colSpan={5} message="No entries yet. Add receipts & payments from the Cashbook." />
                )}
                {recent.map((e) => (
                  <tr key={e.id}>
                    <Td>{fmtDate(e.entryDate)}</Td>
                    <Td>{e.voucherNo}</Td>
                    <Td>{headMap.get(e.ledgerHeadId)?.name ?? "-"}</Td>
                    <Td>
                      <Badge color={e.entryType === "receipt" ? "green" : "red"}>
                        {e.entryType === "receipt" ? "Receipt" : "Payment"}
                      </Badge>
                    </Td>
                    <Td right className="font-semibold">{inr(e.amount)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Bank Accounts">
          <ul className="space-y-3">
            {banks.length === 0 && (
              <li className="text-sm text-slate-400">No bank accounts added yet.</li>
            )}
            {banks.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{b.bankName}</p>
                  <p className="text-xs text-slate-500">A/c ····{b.accountNumber.slice(-4)} · {b.accountType}</p>
                </div>
                <Badge color={b.status === "active" ? "green" : "slate"}>{b.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
