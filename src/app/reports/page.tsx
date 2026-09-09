import { db } from "@/db";
import { cashbookEntries, ledgerHeads } from "@/db/schema";
import { and, asc, gte, lte } from "drizzle-orm";
import { inr, num } from "@/lib/format";
import {
  PageHeader, Card, StatCard, Th, Td, EmptyRow, inputCls, labelCls, btnCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  const conditions = [];
  if (from) conditions.push(gte(cashbookEntries.entryDate, from));
  if (to) conditions.push(lte(cashbookEntries.entryDate, to));

  const [entries, heads] = await Promise.all([
    conditions.length
      ? db.select().from(cashbookEntries).where(and(...conditions))
      : db.select().from(cashbookEntries),
    db.select().from(ledgerHeads).orderBy(asc(ledgerHeads.code)),
  ]);

  const totals = new Map<number, number>();
  for (const e of entries) {
    const amt = num(e.amount);
    totals.set(e.ledgerHeadId, (totals.get(e.ledgerHeadId) ?? 0) + amt);
  }

  const incomeHeads = heads
    .filter((h) => h.type === "income")
    .map((h) => ({ ...h, total: totals.get(h.id) ?? 0 }));
  const expenseHeads = heads
    .filter((h) => h.type === "expense")
    .map((h) => ({ ...h, total: totals.get(h.id) ?? 0 }));

  const totalIncome = incomeHeads.reduce((s, h) => s + h.total, 0);
  const totalExpense = expenseHeads.reduce((s, h) => s + h.total, 0);
  const surplus = totalIncome - totalExpense;

  return (
    <div>
      <PageHeader
        title="Income & Expense Report"
        hindi="आय-व्यय विवरण"
        subtitle="Head-wise summary of income and expenditure for the selected period"
      />

      <Card className="mb-6">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <div>
            <label className={labelCls}>From Date</label>
            <input type="date" name="from" defaultValue={from ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>To Date</label>
            <input type="date" name="to" defaultValue={to ?? ""} className={inputCls} />
          </div>
          <button className={btnCls}>Apply Filter</button>
          {(from || to) && (
            <a href="/reports" className="text-sm font-semibold text-slate-500 underline hover:text-slate-700">
              Clear
            </a>
          )}
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Income" value={inr(totalIncome)} icon="📈" accent="emerald" />
        <StatCard label="Total Expense" value={inr(totalExpense)} icon="📉" accent="red" />
        <StatCard
          label={surplus >= 0 ? "Surplus" : "Deficit"}
          value={inr(Math.abs(surplus))}
          icon={surplus >= 0 ? "✅" : "⚠️"}
          accent={surplus >= 0 ? "emerald" : "red"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Income Heads / आय मद">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Head</Th>
                <Th right>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {incomeHeads.length === 0 && <EmptyRow colSpan={3} message="No income heads defined." />}
              {incomeHeads.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <Td>{h.code}</Td>
                  <Td>{h.name}</Td>
                  <Td right className="font-semibold text-emerald-700">{inr(h.total)}</Td>
                </tr>
              ))}
              {incomeHeads.length > 0 && (
                <tr className="bg-emerald-50">
                  <Td className="font-bold">{""}</Td>
                  <Td className="font-bold">TOTAL</Td>
                  <Td right className="font-bold text-emerald-800">{inr(totalIncome)}</Td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card title="Expense Heads / व्यय मद">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Head</Th>
                <Th right>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {expenseHeads.length === 0 && <EmptyRow colSpan={3} message="No expense heads defined." />}
              {expenseHeads.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <Td>{h.code}</Td>
                  <Td>{h.name}</Td>
                  <Td right className="font-semibold text-red-600">{inr(h.total)}</Td>
                </tr>
              ))}
              {expenseHeads.length > 0 && (
                <tr className="bg-red-50">
                  <Td className="font-bold">{""}</Td>
                  <Td className="font-bold">TOTAL</Td>
                  <Td right className="font-bold text-red-700">{inr(totalExpense)}</Td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
