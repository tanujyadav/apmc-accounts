import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bills, budgets, ledgerHeads } from "@/db/schema";
import Letterhead from "@/components/Letterhead";
import PrintButton from "@/components/PrintButton";
import { currentFY, inr, num } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BudgetPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; showZero?: string }>;
}) {
  const { fy, showZero } = await searchParams;
  const selectedFY = /^\d{4}-\d{2}$/.test(fy ?? "") ? fy! : currentFY();
  const showZeroHeads = showZero === "1";

  const [heads, budgetRows, approvedBills] = await Promise.all([
    db
      .select()
      .from(ledgerHeads)
      .where(eq(ledgerHeads.type, "expense"))
      .orderBy(asc(ledgerHeads.code)),
    db
      .select()
      .from(budgets)
      .where(eq(budgets.financialYear, selectedFY)),
    db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.financialYear, selectedFY),
          inArray(bills.status, ["approved", "paid"]),
        ),
      ),
  ]);
  const budgetMap = new Map(
    budgetRows.map((budget) => [budget.ledgerHeadId, budget]),
  );
  const expenseMap = new Map<number, number>();
  for (const bill of approvedBills) {
    expenseMap.set(
      bill.ledgerHeadId,
      (expenseMap.get(bill.ledgerHeadId) ?? 0) + num(bill.amount),
    );
  }

  const allRows = heads.map((head) => {
    const budget = budgetMap.get(head.id);
    const main = num(budget?.mainBudget);
    const supplementary = num(budget?.supplementaryBudget);
    const sanctioned = main + supplementary;
    const expense = expenseMap.get(head.id) ?? 0;
    return {
      head,
      main,
      supplementary,
      sanctioned,
      expense,
      balance: sanctioned - expense,
    };
  });
  const rows = showZeroHeads
    ? allRows
    : allRows.filter(
        (row) =>
          Math.abs(row.main) > 0.005 ||
          Math.abs(row.supplementary) > 0.005 ||
          Math.abs(row.expense) > 0.005,
      );
  const totals = rows.reduce(
    (result, row) => ({
      main: result.main + row.main,
      supplementary: result.supplementary + row.supplementary,
      sanctioned: result.sanctioned + row.sanctioned,
      expense: result.expense + row.expense,
      balance: result.balance + row.balance,
    }),
    { main: 0, supplementary: 0, sanctioned: 0, expense: 0, balance: 0 },
  );

  const numberCell =
    "border border-slate-600 px-2 py-2 text-right font-mono text-xs font-semibold tabular-nums";

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
        <Link
          href={`/bills-budget?fy=${selectedFY}&showZero=${showZeroHeads ? "1" : "0"}`}
          className="text-sm font-semibold text-emerald-700 underline"
        >
          ← Back to Bill & Budget
        </Link>
        <PrintButton label="🖨️ Print / Save as PDF" />
      </div>

      <div className="print-area aparajita-print mx-auto max-w-6xl rounded-xl border border-slate-300 bg-white p-6 shadow-md">
        <Letterhead badge="Expense Head-wise Budget / व्यय मदवार बजट" />
        <div className="my-4 flex items-center justify-between border border-slate-500 bg-slate-50 px-4 py-2 text-sm">
          <p><strong>Financial Year / वित्तीय वर्ष:</strong> {selectedFY}</p>
          <p><strong>Heads:</strong> {rows.length}</p>
        </div>

        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="w-64 border border-slate-600 px-2 py-2 text-left text-xs font-bold">
                Expense Head / व्यय मद
              </th>
              <th className="border border-slate-600 px-2 py-2 text-right text-xs font-bold">Main Budget</th>
              <th className="border border-slate-600 px-2 py-2 text-right text-xs font-bold">Supplementary</th>
              <th className="border border-slate-600 px-2 py-2 text-right text-xs font-bold">Total Sanctioned</th>
              <th className="border border-slate-600 px-2 py-2 text-right text-xs font-bold">Total Expense</th>
              <th className="border border-slate-600 px-2 py-2 text-right text-xs font-bold">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="border border-slate-600 px-3 py-8 text-center text-sm text-slate-500">
                  No non-zero budget rows for this Financial Year.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.head.id} className="report-row">
                <td className="border border-slate-600 px-2 py-2 align-top text-xs leading-5">
                  <strong>[{row.head.code}] {row.head.nameHindi ?? row.head.name}</strong>
                  {row.head.nameHindi && (
                    <span className="block text-[9px] text-slate-500">{row.head.name}</span>
                  )}
                </td>
                <td className={numberCell}>{inr(row.main)}</td>
                <td className={numberCell}>{inr(row.supplementary)}</td>
                <td className={numberCell}>{inr(row.sanctioned)}</td>
                <td className={numberCell}>{inr(row.expense)}</td>
                <td className={numberCell}>{inr(row.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-100">
              <td className="border border-slate-700 px-2 py-2 text-right text-sm font-bold">TOTAL / कुल योग</td>
              <td className={numberCell}>{inr(totals.main)}</td>
              <td className={numberCell}>{inr(totals.supplementary)}</td>
              <td className={numberCell}>{inr(totals.sanctioned)}</td>
              <td className={numberCell}>{inr(totals.expense)}</td>
              <td className={numberCell}>{inr(totals.balance)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-16 grid grid-cols-3 gap-10 text-center text-sm">
          <div className="border-t border-slate-700 pt-2">Prepared By</div>
          <div className="border-t border-slate-700 pt-2">Accountant / लेखाकार</div>
          <div className="border-t border-slate-700 pt-2">Authorised Signatory</div>
        </div>
      </div>
    </div>
  );
}
