import { db } from "@/db";
import { cashbookEntries, ledgerHeads, bankAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { inr, fmtDate, currentFY } from "@/lib/format";
import { amountInWords } from "@/lib/words";
import PrintButton from "@/components/PrintButton";
import Letterhead from "@/components/Letterhead";

export const dynamic = "force-dynamic";

export default async function VoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entryId = parseInt(id, 10);
  if (isNaN(entryId)) notFound();

  const [entry] = await db
    .select()
    .from(cashbookEntries)
    .where(eq(cashbookEntries.id, entryId));
  if (!entry) notFound();

  const [head] = await db
    .select()
    .from(ledgerHeads)
    .where(eq(ledgerHeads.id, entry.ledgerHeadId));

  const bank = entry.bankAccountId
    ? (
        await db
          .select()
          .from(bankAccounts)
          .where(eq(bankAccounts.id, entry.bankAccountId))
      )[0]
    : null;

  const isReceipt = entry.entryType === "receipt";

  return (
    <div>
      {/* Toolbar — hidden on print */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/cashbook"
          className="text-sm font-semibold text-emerald-700 underline hover:text-emerald-900"
        >
          ← Back to Cashbook
        </Link>
        <PrintButton />
      </div>

      {/* Voucher */}
      <div className="print-area mx-auto max-w-3xl rounded-xl border border-slate-300 bg-white p-8 shadow-md">
        {/* Letterhead */}
        <Letterhead
          badge={isReceipt ? "Receipt Voucher / प्राप्ति वाउचर" : "Payment Voucher / भुगतान वाउचर"}
        />

        {/* Meta row */}
        <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
          <p>
            <span className="font-semibold">Voucher No.:</span> {entry.voucherNo}
          </p>
          <p>
            <span className="font-semibold">Date:</span> {fmtDate(entry.entryDate)}
          </p>
          <p>
            <span className="font-semibold">Financial Year:</span> {currentFY()}
          </p>
        </div>

        {/* Details table */}
        <table className="mt-5 w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="w-48 border border-slate-400 bg-slate-50 px-3 py-2.5 font-semibold">
                Head of Account / लेखा शीर्ष
              </td>
              <td className="border border-slate-400 px-3 py-2.5">
                {head ? `${head.name} (${head.code})` : "-"}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 bg-slate-50 px-3 py-2.5 font-semibold">
                {isReceipt ? "Depositor / जमाकर्ता" : "Payee / भुगतान प्राप्तकर्ता"}
              </td>
              <td className="border border-slate-400 px-3 py-2.5">{entry.partyName ?? "-"}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 bg-slate-50 px-3 py-2.5 font-semibold">
                Particulars / विवरण
              </td>
              <td className="border border-slate-400 px-3 py-2.5">{entry.particulars}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 bg-slate-50 px-3 py-2.5 font-semibold">
                Mode of {isReceipt ? "Receipt" : "Payment"}
              </td>
              <td className="border border-slate-400 px-3 py-2.5 capitalize">
                {entry.mode}
                {bank ? ` — ${bank.bankName}, ${bank.branch} (A/c ····${bank.accountNumber.slice(-4)})` : ""}
                {entry.chequeNo ? ` · Cheque No. ${entry.chequeNo}` : ""}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 bg-slate-50 px-3 py-2.5 font-semibold">
                Amount / धनराशि
              </td>
              <td className="border border-slate-400 px-3 py-2.5 text-lg font-bold">
                {inr(entry.amount)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 bg-slate-50 px-3 py-2.5 font-semibold">
                Amount in Words / शब्दों में
              </td>
              <td className="border border-slate-400 px-3 py-2.5 italic">
                {amountInWords(entry.amount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signature blocks */}
        <div className="mt-16 grid grid-cols-3 gap-6 text-center text-sm">
          <div>
            <div className="border-t-2 border-slate-700 pt-2 font-semibold">
              Prepared By
              <br />
              <span className="font-normal text-slate-500">(लिपिक / Cashier)</span>
            </div>
          </div>
          <div>
            <div className="border-t-2 border-slate-700 pt-2 font-semibold">
              Checked By
              <br />
              <span className="font-normal text-slate-500">(लेखाकार / Accountant)</span>
            </div>
          </div>
          <div>
            <div className="border-t-2 border-slate-700 pt-2 font-semibold">
              Approved By
              <br />
              <span className="font-normal text-slate-500">(सचिव / Secretary)</span>
            </div>
          </div>
        </div>

        <p className="mt-8 border-t border-slate-200 pt-3 text-center text-[11px] text-slate-400">
          This is a system generated voucher · APMC Accounts Module · Voucher ID #{entry.id}
        </p>
      </div>
    </div>
  );
}
