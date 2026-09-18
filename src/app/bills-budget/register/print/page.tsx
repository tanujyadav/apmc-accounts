import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bills, ledgerHeads } from "@/db/schema";
import Letterhead from "@/components/Letterhead";
import PrintButton from "@/components/PrintButton";
import { currentFY, fmtDate, inr, num } from "@/lib/format";

export const dynamic = "force-dynamic";

function billSerialNumber(billNo: string, fallbackId: number): number {
  const parsed = Number(billNo.split("/").at(-1));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackId;
}

export default async function BillRegisterPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; sort?: string; dir?: string }>;
}) {
  const { fy, sort = "date", dir = "desc" } = await searchParams;
  const selectedFY = /^\d{4}-\d{2}$/.test(fy ?? "") ? fy! : currentFY();
  const [rows, heads] = await Promise.all([
    db
      .select()
      .from(bills)
      .where(eq(bills.financialYear, selectedFY))
      .orderBy(desc(bills.billDate), desc(bills.id)),
    db.select().from(ledgerHeads).orderBy(asc(ledgerHeads.code)),
  ]);
  const headMap = new Map(heads.map((head) => [head.id, head]));
  const direction = dir === "asc" ? 1 : -1;
  const sortedRows = [...rows].sort((a, b) => {
    const aHead = headMap.get(a.ledgerHeadId);
    const bHead = headMap.get(b.ledgerHeadId);
    const aValue =
      sort === "serial"
        ? billSerialNumber(a.billNo, a.id)
        : sort === "bill"
          ? a.billNo
          : sort === "cheque"
            ? a.chequeNo ?? ""
            : sort === "vendor"
              ? a.vendorName
              : sort === "head"
                ? aHead?.nameHindi ?? aHead?.name ?? ""
                : sort === "gross"
                  ? num(a.amount)
                  : sort === "deduction"
                    ? num(a.deductionAmount)
                    : sort === "net"
                      ? num(a.netAmount)
                      : sort === "status"
                        ? a.status
                        : a.billDate;
    const bValue =
      sort === "serial"
        ? billSerialNumber(b.billNo, b.id)
        : sort === "bill"
          ? b.billNo
          : sort === "cheque"
            ? b.chequeNo ?? ""
            : sort === "vendor"
              ? b.vendorName
              : sort === "head"
                ? bHead?.nameHindi ?? bHead?.name ?? ""
                : sort === "gross"
                  ? num(b.amount)
                  : sort === "deduction"
                    ? num(b.deductionAmount)
                    : sort === "net"
                      ? num(b.netAmount)
                      : sort === "status"
                        ? b.status
                        : b.billDate;
    return (
      (typeof aValue === "number"
        ? aValue - (bValue as number)
        : aValue.localeCompare(String(bValue), "en-IN")) * direction
    );
  });
  const grossTotal = rows.reduce((sum, bill) => sum + num(bill.amount), 0);
  const deductionTotal = rows.reduce(
    (sum, bill) => sum + num(bill.deductionAmount),
    0,
  );
  const netTotal = rows.reduce((sum, bill) => sum + num(bill.netAmount), 0);
  const cell = "border border-slate-500 px-2 py-1.5 align-top text-[10px]";
  const numberCell = `${cell} text-right font-mono font-semibold tabular-nums`;

  return (
    <div>
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>
      <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
        <Link
          href={`/bills-budget?fy=${selectedFY}&billSort=${sort}&billDir=${dir}`}
          className="text-sm font-semibold text-emerald-700 underline"
        >
          ← Back to Bill Register
        </Link>
        <PrintButton label="🖨️ Print / Save as PDF" />
      </div>

      <div className="print-area aparajita-print mx-auto max-w-7xl rounded-xl border border-slate-300 bg-white p-5 shadow-md">
        <Letterhead badge="Bill Register / बिल पंजिका" />
        <div className="my-3 flex items-center justify-between border border-slate-500 bg-slate-50 px-3 py-1.5 text-xs">
          <p><strong>Financial Year:</strong> {selectedFY}</p>
          <p><strong>Total Bills:</strong> {rows.length}</p>
        </div>

        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="w-10 border border-slate-600 px-1 py-2 text-center text-[9px] font-bold">S.No.</th>
              <th className="w-36 border border-slate-600 px-2 py-2 text-left text-[9px] font-bold">Bill No.</th>
              <th className="w-20 border border-slate-600 px-2 py-2 text-left text-[9px] font-bold">Date</th>
              <th className="w-32 border border-slate-600 px-2 py-2 text-left text-[9px] font-bold">Cheque Details</th>
              <th className="border border-slate-600 px-2 py-2 text-left text-[9px] font-bold">Vendor / Party</th>
              <th className="border border-slate-600 px-2 py-2 text-left text-[9px] font-bold">Expense Head</th>
              <th className="w-24 border border-slate-600 px-2 py-2 text-right text-[9px] font-bold">Gross</th>
              <th className="w-24 border border-slate-600 px-2 py-2 text-right text-[9px] font-bold">Deduction</th>
              <th className="w-24 border border-slate-600 px-2 py-2 text-right text-[9px] font-bold">Net Payment</th>
              <th className="w-20 border border-slate-600 px-2 py-2 text-left text-[9px] font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((bill) => {
              const head = headMap.get(bill.ledgerHeadId);
              return (
                <tr key={bill.id} className="report-row">
                  <td className={`${cell} text-center font-bold`}>
                    {billSerialNumber(bill.billNo, bill.id)}
                  </td>
                  <td className={`${cell} break-words font-mono font-semibold`}>
                    {bill.billNo}
                  </td>
                  <td className={cell}>{fmtDate(bill.billDate)}</td>
                  <td className={`${cell} break-words`}>
                    Net: {bill.chequeNo || "-"} · {fmtDate(bill.chequeDate)}
                    {num(bill.deductionAmount) > 0 && (
                      <span className="block">
                        Ded.: {bill.deductionChequeNo || "-"} · {fmtDate(
                          bill.deductionChequeDate,
                        )}
                      </span>
                    )}
                  </td>
                  <td className={`${cell} break-words`}>{bill.vendorName}</td>
                  <td className={`${cell} break-words font-semibold`}>
                    {head?.nameHindi ?? head?.name ?? "-"}
                  </td>
                  <td className={numberCell}>{inr(bill.amount)}</td>
                  <td className={numberCell}>{inr(bill.deductionAmount)}</td>
                  <td className={numberCell}>{inr(bill.netAmount)}</td>
                  <td className={`${cell} uppercase`}>{bill.status}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-blue-100">
              <td colSpan={6} className="border border-slate-600 px-2 py-2 text-right text-xs font-bold">
                TOTAL / कुल योग
              </td>
              <td className={numberCell}>{inr(grossTotal)}</td>
              <td className={numberCell}>{inr(deductionTotal)}</td>
              <td className={numberCell}>{inr(netTotal)}</td>
              <td className={cell}></td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-12 grid grid-cols-3 gap-10 text-center text-xs">
          <div className="border-t border-slate-700 pt-2">Prepared By</div>
          <div className="border-t border-slate-700 pt-2">Accountant / लेखाकार</div>
          <div className="border-t border-slate-700 pt-2">Authorised Signatory</div>
        </div>
      </div>
    </div>
  );
}
