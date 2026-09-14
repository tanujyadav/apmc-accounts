import Link from "next/link";
import { and, asc, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { cashbookEntries, ledgerHeads } from "@/db/schema";
import Letterhead from "@/components/Letterhead";
import PrintButton from "@/components/PrintButton";
import {
  financialYearRange,
  fmtDate,
  inr,
  monthYearLabel,
  num,
  todayISO,
} from "@/lib/format";

export const dynamic = "force-dynamic";

type ReportView = "combined" | "income" | "expense";

export default async function IncomeExpensePrintPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { view, from, to } = await searchParams;
  const reportView: ReportView =
    view === "income" || view === "expense" ? view : "combined";

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
  const regularIncomeHeads = incomeHeads.filter(
    (head) => !incomeAdditionCodes.has(head.code),
  );
  const specialIncomeHeads = incomeHeads.filter((head) =>
    incomeAdditionCodes.has(head.code),
  );
  const regularExpenseHeads = expenseHeads.filter(
    (head) => !expenseAdditionCodes.has(head.code),
  );
  const specialExpenseHeads = expenseHeads.filter((head) =>
    expenseAdditionCodes.has(head.code),
  );
  const netIncome = regularIncomeHeads.reduce(
    (sum, head) => sum + head.total,
    0,
  );
  const netExpense = regularExpenseHeads.reduce(
    (sum, head) => sum + head.total,
    0,
  );
  const incomeAdditions = specialIncomeHeads.reduce(
    (sum, head) => sum + head.total,
    0,
  );
  const expenseAdditions = specialExpenseHeads.reduce(
    (sum, head) => sum + head.total,
    0,
  );
  const totalIncome = netIncome + incomeAdditions;
  const totalExpense = netExpense + expenseAdditions;
  const surplus = totalIncome - totalExpense;
  const entryDates = entries.map((entry) => entry.entryDate).sort();
  const effectiveFrom = from || entryDates[0] || to || todayISO();
  const effectiveTo =
    to || entryDates[entryDates.length - 1] || from || todayISO();
  const periodLabel = `${fmtDate(effectiveFrom)} से ${fmtDate(effectiveTo)} तक`;
  const isSingleMonth =
    effectiveFrom.slice(0, 7) === effectiveTo.slice(0, 7);
  const selectedPeriodLabel = isSingleMonth
    ? monthYearLabel(effectiveFrom)
    : `${monthYearLabel(effectiveFrom)} से ${monthYearLabel(effectiveTo)}`;
  const financialYearLabel = financialYearRange(effectiveFrom, effectiveTo);
  const hasSelectedDatePeriod = Boolean(from || to);
  const badge =
    reportView === "income"
      ? "Income Report / आय विवरण"
      : reportView === "expense"
        ? "Expense Report / व्यय विवरण"
        : "Income & Expense Report / आय-व्यय विवरण";
  const backParams = new URLSearchParams();
  if (from) backParams.set("from", from);
  if (to) backParams.set("to", to);
  const backUrl = backParams.toString()
    ? `/reports?${backParams.toString()}`
    : "/reports";

  type ReportHead = {
    id: number;
    code: string;
    name: string;
    nameHindi: string | null;
    total: number;
  };

  function ReportTable({
    title,
    regularRows,
    specialRows,
    netTotal,
    grossTotal,
    tone,
  }: {
    title: string;
    regularRows: ReportHead[];
    specialRows: ReportHead[];
    netTotal: number;
    grossTotal: number;
    tone: "income" | "expense";
  }) {
    const isIncome = tone === "income";
    const allRowsCount = regularRows.length + specialRows.length;
    return (
      <section className="report-section mt-5">
        <div
          className={`border border-slate-600 px-4 py-2 text-center text-base font-bold ${
            isIncome ? "bg-emerald-100" : "bg-red-100"
          }`}
        >
          {title}
        </div>
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              <th className="w-20 border border-slate-600 bg-slate-100 px-3 py-2 text-left text-xs font-bold uppercase">
                Code
              </th>
              <th className="border border-slate-600 bg-slate-100 px-3 py-2 text-left text-xs font-bold uppercase">
                लेखा मद / Head
              </th>
              <th className="w-44 border border-slate-600 bg-slate-100 px-3 py-2 text-right text-xs font-bold uppercase">
                Amount (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {allRowsCount === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="border border-slate-500 px-3 py-6 text-center text-sm text-slate-500"
                >
                  चयनित अवधि में कोई राशि नहीं है।
                </td>
              </tr>
            )}
            {regularRows.map((head) => (
              <tr key={head.id} className="report-row">
                <td className="border border-slate-500 px-3 py-2 align-top font-mono text-sm font-semibold">
                  {head.code}
                </td>
                <td className="border border-slate-500 px-3 py-2 align-top">
                  <p className="break-words text-sm font-semibold">
                    {head.nameHindi || head.name}
                  </p>
                  {head.nameHindi && (
                    <p className="mt-0.5 break-words text-[10px] text-slate-500">
                      {head.name}
                    </p>
                  )}
                </td>
                <td
                  className={`border border-slate-500 px-3 py-2 text-right align-top font-mono text-sm font-bold tabular-nums ${
                    isIncome ? "text-emerald-900" : "text-red-900"
                  }`}
                >
                  {inr(head.total)}
                </td>
              </tr>
            ))}
            <tr className={isIncome ? "bg-emerald-50" : "bg-red-50"}>
              <td className="border border-slate-600 px-3 py-2 text-center font-bold">
                •
              </td>
              <td className="border border-slate-600 px-3 py-2 text-sm font-bold">
                {isIncome
                  ? "SUBTOTAL: NET INCOME / शुद्ध आय (अनुदान, योजना धनराशि एवं GST के बिना)"
                  : "SUBTOTAL: NET EXPENSE / शुद्ध व्यय (स्वतः कटौती एवं GST के बिना)"}
              </td>
              <td className="border border-slate-600 px-3 py-2 text-right font-mono text-sm font-bold tabular-nums">
                {inr(netTotal)}
              </td>
            </tr>
            {specialRows.map((head) => (
              <tr key={head.id} className="report-row bg-amber-50/50">
                <td className="border border-slate-500 px-3 py-2 align-top font-mono text-sm font-bold text-amber-800">
                  [{head.code}]
                </td>
                <td className="border border-slate-500 px-3 py-2 align-top">
                  <p className="break-words text-sm font-bold text-amber-900">
                    (+) {head.nameHindi || head.name}
                  </p>
                  {head.nameHindi && (
                    <p className="mt-0.5 break-words text-[10px] text-slate-500">
                      {head.name}
                    </p>
                  )}
                </td>
                <td className="border border-slate-500 px-3 py-2 text-right align-top font-mono text-sm font-bold tabular-nums text-amber-900">
                  {inr(head.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={isIncome ? "bg-emerald-100" : "bg-red-100"}>
              <td className="border border-slate-600 px-3 py-2 text-center text-sm font-bold">
                {isIncome ? "(A)" : "(B)"}
              </td>
              <td className="border border-slate-600 px-3 py-2 text-right text-sm font-bold">
                {isIncome
                  ? "TOTAL GROSS INCOME / सकल आय"
                  : "TOTAL GROSS EXPENDITURE / सकल व्यय"}
              </td>
              <td className="border border-slate-600 px-3 py-2 text-right font-mono text-sm font-bold tabular-nums">
                {inr(grossTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href={backUrl}
          className="text-sm font-semibold text-emerald-700 underline hover:text-emerald-900"
        >
          ← Back to Income & Expense Report
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Print dialog में “Save as PDF” चुनें
          </span>
          <PrintButton label="🖨️ Print / Save as PDF" />
        </div>
      </div>

      <div className="print-area aparajita-print mx-auto max-w-5xl rounded-xl border border-slate-300 bg-white p-6 shadow-md">
        <Letterhead badge={badge} />

        <div className="mt-4 grid grid-cols-1 border border-slate-500 bg-slate-50 text-sm sm:grid-cols-2">
          <p
            className={`px-4 py-2 sm:border-r ${
              hasSelectedDatePeriod ? "border-b border-slate-300" : ""
            }`}
          >
            <span className="font-bold">Financial Year / वित्तीय वर्ष:</span>{" "}
            {financialYearLabel}
          </p>
          <p
            className={`px-4 py-2 ${
              hasSelectedDatePeriod ? "border-b border-slate-300" : ""
            }`}
          >
            <span className="font-bold">
              {isSingleMonth
                ? "Selected Month / चयनित माह:"
                : "Selected Period / चयनित अवधि:"}
            </span>{" "}
            {selectedPeriodLabel}
          </p>
          {hasSelectedDatePeriod && (
            <p className="px-4 py-2 sm:col-span-2">
              <span className="font-bold">Exact Date Range / दिनांक अवधि:</span>{" "}
              {periodLabel}
            </p>
          )}
        </div>

        {(reportView === "combined" || reportView === "income") && (
          <ReportTable
            title="आय मद / INCOME HEADS"
            regularRows={regularIncomeHeads}
            specialRows={specialIncomeHeads}
            netTotal={netIncome}
            grossTotal={totalIncome}
            tone="income"
          />
        )}

        {(reportView === "combined" || reportView === "expense") && (
          <ReportTable
            title="व्यय मद / EXPENSE HEADS"
            regularRows={regularExpenseHeads}
            specialRows={specialExpenseHeads}
            netTotal={netExpense}
            grossTotal={totalExpense}
            tone="expense"
          />
        )}

        {reportView === "combined" && (
          <div
            className={`report-section mt-5 grid grid-cols-[1fr_180px] border-2 px-4 py-3 text-base font-bold ${
              surplus >= 0
                ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                : "border-red-600 bg-red-50 text-red-900"
            }`}
          >
            <span>
              {surplus >= 0 ? "अधिशेष / SURPLUS" : "घाटा / DEFICIT"}
            </span>
            <span className="text-right font-mono tabular-nums">
              {inr(Math.abs(surplus))}
            </span>
          </div>
        )}

        <div className="report-section mt-14 grid grid-cols-3 gap-10 text-center text-xs">
          <div className="border-t border-slate-700 pt-2">Prepared By</div>
          <div className="border-t border-slate-700 pt-2">Accountant / लेखाकार</div>
          <div className="border-t border-slate-700 pt-2">Authorised Signatory</div>
        </div>

        <p className="mt-8 text-center text-[9px] text-slate-400">
          System generated report · Zero amount heads are excluded
        </p>
      </div>
    </div>
  );
}
