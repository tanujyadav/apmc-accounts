import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  bankAccounts,
  cashbookEntries,
  cashbookOpeningBalances,
  cashDepositAllocations,
  cashDeposits,
  ledgerHeads,
} from "@/db/schema";
import Letterhead from "@/components/Letterhead";
import PrintButton from "@/components/PrintButton";
import { fmtDate, inr } from "@/lib/format";
import { amountInWords } from "@/lib/words";

export const dynamic = "force-dynamic";

export default async function DepositSlipPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [deposit] = await db
    .select()
    .from(cashDeposits)
    .where(eq(cashDeposits.id, id))
    .limit(1);
  if (!deposit) notFound();

  const [bankRows, allocations, entries, openings, heads] = await Promise.all([
    db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, deposit.bankAccountId))
      .limit(1),
    db
      .select()
      .from(cashDepositAllocations)
      .where(eq(cashDepositAllocations.cashDepositId, id)),
    db.select().from(cashbookEntries),
    db.select().from(cashbookOpeningBalances),
    db.select().from(ledgerHeads),
  ]);
  const bank = bankRows[0];
  if (!bank) notFound();

  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  const openingMap = new Map(openings.map((opening) => [opening.id, opening]));
  const headMap = new Map(heads.map((head) => [head.id, head]));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
        <Link
          href="/deposits"
          className="text-sm font-semibold text-emerald-700 underline hover:text-emerald-900"
        >
          ← Back to Cash Deposits
        </Link>
        <PrintButton label="🖨️ Print / Save as PDF" />
      </div>

      <div className="print-area aparajita-print mx-auto max-w-3xl rounded-xl border border-slate-300 bg-white p-7 shadow-md">
        <Letterhead badge="Cash Deposit Slip / नकद जमा पर्ची" />

        <div className="mt-5 grid grid-cols-2 border border-slate-500 text-sm">
          <p className="border-b border-r border-slate-400 px-3 py-2">
            <span className="font-bold">Slip No. / पर्ची संख्या:</span>{" "}
            {deposit.slipNo}
          </p>
          <p className="border-b border-slate-400 px-3 py-2 text-right">
            <span className="font-bold">Deposit Date / जमा दिनांक:</span>{" "}
            {fmtDate(deposit.depositDate)}
          </p>
          <p className="border-b border-r border-slate-400 px-3 py-2">
            <span className="font-bold">Bank / बैंक:</span> {bank.bankName}
          </p>
          <p className="border-b border-slate-400 px-3 py-2 text-right">
            <span className="font-bold">Account No.:</span> {bank.accountNumber}
          </p>
          <p className="border-r border-slate-400 px-3 py-2">
            <span className="font-bold">Branch / IFSC:</span> {bank.branch} · {bank.ifscCode}
          </p>
          <p className="px-3 py-2 text-right">
            <span className="font-bold">Deposited By:</span> {deposit.depositedBy}
          </p>
        </div>

        <table className="mt-5 w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="w-14 border border-slate-500 px-2 py-2 text-center">S.No.</th>
              <th className="w-32 border border-slate-500 px-2 py-2 text-left">Source Date</th>
              <th className="border border-slate-500 px-2 py-2 text-left">Cash Source / विवरण</th>
              <th className="w-40 border border-slate-500 px-2 py-2 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((allocation, index) => {
              const entry =
                allocation.cashbookEntryId !== null
                  ? entryMap.get(allocation.cashbookEntryId)
                  : undefined;
              const opening =
                allocation.cashbookOpeningBalanceId !== null
                  ? openingMap.get(allocation.cashbookOpeningBalanceId)
                  : undefined;
              const head = entry ? headMap.get(entry.ledgerHeadId) : undefined;
              const startYear = opening
                ? Number(opening.financialYear.slice(0, 4))
                : 0;
              const sourceDate =
                entry?.entryDate ??
                opening?.openingDate ??
                (opening ? `${startYear}-04-01` : null);
              return (
                <tr key={allocation.id}>
                  <td className="border border-slate-500 px-2 py-2 text-center">
                    {index + 1}
                  </td>
                  <td className="border border-slate-500 px-2 py-2">
                    {fmtDate(sourceDate)}
                  </td>
                  <td className="border border-slate-500 px-2 py-2">
                    {opening ? (
                      <>
                        <span className="font-bold">OB · FY {opening.financialYear}</span>
                        <br />प्रारम्भिक रोकड़ / Opening Cash in Hand
                      </>
                    ) : (
                      <>
                        <span className="font-bold">
                          {entry?.voucherNo ?? "Receipt"} · [{head?.code ?? "-"}] {head?.nameHindi ?? head?.name ?? "-"}
                        </span>
                        <br />
                        <span className="text-xs text-slate-600">
                          {entry?.partyName || "-"} · {entry?.particulars || "-"}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="border border-slate-500 px-2 py-2 text-right font-mono font-bold tabular-nums">
                    {inr(allocation.allocatedAmount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-emerald-100">
              <td colSpan={3} className="border border-slate-600 px-3 py-2 text-right font-bold">
                Total Cash Deposited / कुल नकद जमा
              </td>
              <td className="border border-slate-600 px-3 py-2 text-right font-mono text-base font-bold tabular-nums">
                {inr(deposit.amount)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-4 border border-slate-500 px-3 py-2 text-sm">
          <span className="font-bold">Amount in Words / शब्दों में:</span>{" "}
          {amountInWords(deposit.amount)}
        </div>
        {deposit.remarks && (
          <div className="border-x border-b border-slate-500 px-3 py-2 text-sm">
            <span className="font-bold">Remarks / टिप्पणी:</span> {deposit.remarks}
          </div>
        )}

        <div className="mt-16 grid grid-cols-3 gap-8 text-center text-sm">
          <div className="border-t border-slate-700 pt-2">Deposited By</div>
          <div className="border-t border-slate-700 pt-2">Cashier / रोकड़िया</div>
          <div className="border-t border-slate-700 pt-2">Accountant / लेखाकार</div>
        </div>
        <p className="mt-8 text-center text-[10px] text-slate-400">
          System generated cash deposit slip · Deposit ID #{deposit.id}
        </p>
      </div>
    </div>
  );
}
