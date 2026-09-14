import { db } from "@/db";
import { cashbookEntries, ledgerHeads } from "@/db/schema";
import { and, asc, gte, lte } from "drizzle-orm";
import { fmtDate, inr, num } from "@/lib/format";
import {
  Card,
  EmptyRow,
  PageHeader,
  StatCard,
  btnCls,
  inputCls,
  labelCls,
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

  const headMap = new Map(heads.map((head) => [head.id, head]));
  const incomeTotals = new Map<number, number>();
  const expenseTotals = new Map<number, number>();

  for (const entry of entries) {
    const head = headMap.get(entry.ledgerHeadId);
    const amount = num(entry.amount);
    if (
      head?.type === "income" &&
      entry.entryType === "receipt" &&
      amount !== 0
    ) {
      incomeTotals.set(
        entry.ledgerHeadId,
        (incomeTotals.get(entry.ledgerHeadId) ?? 0) + amount,
      );
    }
    if (
      head?.type === "expense" &&
      entry.entryType === "payment" &&
      amount !== 0
    ) {
      expenseTotals.set(
        entry.ledgerHeadId,
        (expenseTotals.get(entry.ledgerHeadId) ?? 0) + amount,
      );
    }
  }

  const incomeHeads = heads
    .filter((head) => head.type === "income")
    .map((head) => ({ ...head, total: incomeTotals.get(head.id) ?? 0 }))
    .filter((head) => Math.abs(head.total) > 0.005);
  const expenseHeads = heads
    .filter((head) => head.type === "expense")
    .map((head) => ({ ...head, total: expenseTotals.get(head.id) ?? 0 }))
    .filter((head) => Math.abs(head.total) > 0.005);

  const incomeAdditionCodes = new Set(["7", "5-G", "5-E"]);
  const expenseAdditionCodes = new Set(["EXP-35", "EXP-36", "EXP-08"]);
  const specialIncomeHeads = incomeHeads.filter((head) =>
    incomeAdditionCodes.has(head.code),
  );
  const specialExpenseHeads = expenseHeads.filter((head) =>
    expenseAdditionCodes.has(head.code),
  );
  const netIncome = incomeHeads
    .filter((head) => !incomeAdditionCodes.has(head.code))
    .reduce((sum, head) => sum + head.total, 0);
  const incomeAdditions = specialIncomeHeads.reduce(
    (sum, head) => sum + head.total,
    0,
  );
  const netExpense = expenseHeads
    .filter((head) => !expenseAdditionCodes.has(head.code))
    .reduce((sum, head) => sum + head.total, 0);
  const expenseAdditions = specialExpenseHeads.reduce(
    (sum, head) => sum + head.total,
    0,
  );
  const totalIncome = netIncome + incomeAdditions;
  const totalExpense = netExpense + expenseAdditions;
  const surplus = totalIncome - totalExpense;
  const periodLabel =
    from || to
      ? `${from ? fmtDate(from) : "Beginning"} to ${to ? fmtDate(to) : "Today"}`
      : "All available dates";
  const printQuery = new URLSearchParams();
  if (from) printQuery.set("from", from);
  if (to) printQuery.set("to", to);
  const querySuffix = printQuery.toString()
    ? `&${printQuery.toString()}`
    : "";

  const tableHead = (
    <thead>
      <tr>
        <th className="w-24 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          Code
        </th>
        <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          Head / लेखा मद
        </th>
        <th className="w-48 border-b border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
          Amount (₹)
        </th>
      </tr>
    </thead>
  );

  return (
    <div>
      <PageHeader
        title="Income & Expense Report"
        hindi="आय-व्यय विवरण"
        subtitle="Hindi head-wise summary; only heads with actual receipts or payments are shown"
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <form method="get" className="flex flex-wrap items-end gap-4">
            <div>
              <label className={labelCls}>From Date / दिनांक से</label>
              <input
                type="date"
                name="from"
                defaultValue={from ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>To Date / दिनांक तक</label>
              <input
                type="date"
                name="to"
                defaultValue={to ?? ""}
                className={inputCls}
              />
            </div>
            <button className={btnCls}>Apply Filter</button>
            {(from || to) && (
              <a
                href="/reports"
                className="pb-2 text-sm font-semibold text-slate-500 underline hover:text-slate-700"
              >
                Clear
              </a>
            )}
          </form>

          <div className="flex flex-wrap gap-2">
            <a
              href={`/reports/print?view=combined${querySuffix}`}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
            >
              🖨️ Combined Print / PDF
            </a>
            <a
              href={`/reports/print?view=income${querySuffix}`}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              📈 Income Only Print / PDF
            </a>
            <a
              href={`/reports/print?view=expense${querySuffix}`}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              📉 Expense Only Print / PDF
            </a>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Report period: <span className="font-semibold text-slate-700">{periodLabel}</span>
          {" · "}Zero amount heads are hidden automatically.
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Gross Income / सकल आय"
          value={inr(totalIncome)}
          icon="📈"
          accent="emerald"
        />
        <StatCard
          label="Gross Expenditure / सकल व्यय"
          value={inr(totalExpense)}
          icon="📉"
          accent="red"
        />
        <StatCard
          label={surplus >= 0 ? "Surplus / अधिशेष" : "Deficit / घाटा"}
          value={inr(Math.abs(surplus))}
          icon={surplus >= 0 ? "✅" : "⚠️"}
          accent={surplus >= 0 ? "emerald" : "red"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Income Calculation / आय गणना">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex items-center justify-between gap-4 border-b border-emerald-200 bg-emerald-50 px-4 py-3">
              <div>
                <p className="font-bold text-emerald-900">
                  शुद्ध आय / NET INCOME
                </p>
                <p className="text-xs text-emerald-700">
                  अनुदान, योजना धनराशि एवं GST को छोड़कर
                </p>
              </div>
              <p className="whitespace-nowrap text-lg font-bold tabular-nums text-emerald-900">
                {inr(netIncome)}
              </p>
            </div>
            {specialIncomeHeads.map((head) => (
              <div
                key={head.id}
                className="grid grid-cols-[80px_1fr_150px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
              >
                <span className="font-mono font-semibold text-amber-700">
                  [{head.code}]
                </span>
                <span className="font-semibold text-slate-700">
                  (+) {head.nameHindi || head.name}
                </span>
                <span className="text-right font-bold tabular-nums text-amber-700">
                  {inr(head.total)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 border-t-2 border-emerald-300 bg-emerald-100 px-4 py-3">
              <span className="font-bold text-emerald-950">
                TOTAL GROSS INCOME / सकल आय
              </span>
              <span className="text-lg font-bold tabular-nums text-emerald-950">
                {inr(totalIncome)}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Expense Calculation / व्यय गणना">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex items-center justify-between gap-4 border-b border-red-200 bg-red-50 px-4 py-3">
              <div>
                <p className="font-bold text-red-900">
                  शुद्ध व्यय / NET EXPENSE
                </p>
                <p className="text-xs text-red-700">
                  स्वतः कटौती एवं GST को छोड़कर
                </p>
              </div>
              <p className="whitespace-nowrap text-lg font-bold tabular-nums text-red-900">
                {inr(netExpense)}
              </p>
            </div>
            {specialExpenseHeads.map((head) => (
              <div
                key={head.id}
                className="grid grid-cols-[80px_1fr_150px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
              >
                <span className="font-mono font-semibold text-amber-700">
                  [{head.code}]
                </span>
                <span className="font-semibold text-slate-700">
                  (+) {head.nameHindi || head.name}
                </span>
                <span className="text-right font-bold tabular-nums text-amber-700">
                  {inr(head.total)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 border-t-2 border-red-300 bg-red-100 px-4 py-3">
              <span className="font-bold text-red-950">
                TOTAL GROSS EXPENDITURE / सकल व्यय
              </span>
              <span className="text-lg font-bold tabular-nums text-red-950">
                {inr(totalExpense)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title={`Income Heads / आय मद (${incomeHeads.length})`}>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full table-fixed">
              {tableHead}
              <tbody>
                {incomeHeads.length === 0 && (
                  <EmptyRow
                    colSpan={3}
                    message="Selected period में कोई Income Receipt नहीं है।"
                  />
                )}
                {incomeHeads.map((head) => (
                  <tr key={head.id} className="hover:bg-emerald-50/40">
                    <td className="border-b border-slate-100 px-4 py-3 align-top font-mono text-sm font-semibold text-slate-600">
                      {head.code}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 align-top">
                      <p className="break-words text-base font-semibold text-slate-900">
                        {head.nameHindi || head.name}
                      </p>
                      {head.nameHindi && (
                        <p className="mt-0.5 break-words text-xs text-slate-500">
                          {head.name}
                        </p>
                      )}
                    </td>
                    <td className="border-b border-emerald-100 bg-emerald-50/40 px-4 py-3 text-right align-top text-base font-bold tabular-nums text-emerald-800">
                      {inr(head.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {incomeHeads.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-emerald-300 bg-emerald-100">
                    <td colSpan={2} className="px-4 py-3 text-right font-bold text-emerald-900">
                      सकल आय / TOTAL GROSS INCOME
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-emerald-900">
                      {inr(totalIncome)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        <Card title={`Expense Heads / व्यय मद (${expenseHeads.length})`}>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full table-fixed">
              {tableHead}
              <tbody>
                {expenseHeads.length === 0 && (
                  <EmptyRow
                    colSpan={3}
                    message="Selected period में कोई Expense Payment नहीं है।"
                  />
                )}
                {expenseHeads.map((head) => (
                  <tr key={head.id} className="hover:bg-red-50/40">
                    <td className="border-b border-slate-100 px-4 py-3 align-top font-mono text-sm font-semibold text-slate-600">
                      {head.code}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 align-top">
                      <p className="break-words text-base font-semibold text-slate-900">
                        {head.nameHindi || head.name}
                      </p>
                      {head.nameHindi && (
                        <p className="mt-0.5 break-words text-xs text-slate-500">
                          {head.name}
                        </p>
                      )}
                    </td>
                    <td className="border-b border-red-100 bg-red-50/40 px-4 py-3 text-right align-top text-base font-bold tabular-nums text-red-700">
                      {inr(head.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {expenseHeads.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-red-300 bg-red-100">
                    <td colSpan={2} className="px-4 py-3 text-right font-bold text-red-900">
                      सकल व्यय / TOTAL GROSS EXPENDITURE
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-red-900">
                      {inr(totalExpense)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
