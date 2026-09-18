import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bankAccounts, bills, ledgerHeads } from "@/db/schema";
import Letterhead from "@/components/Letterhead";
import PrintButton from "@/components/PrintButton";
import { fmtDate, inr, num } from "@/lib/format";
import { amountInWords } from "@/lib/words";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  draft: "मसौदा / DRAFT — NOT POSTED",
  pending: "मसौदा / DRAFT — NOT POSTED",
  approved: "भुगतान हेतु स्वीकृत",
  paid: "भुगतान किया गया / PAID",
  rejected: "अस्वीकृत / REJECTED",
};

export default async function ContingentBillPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const billId = Number(id);
  if (!Number.isInteger(billId) || billId <= 0) notFound();

  const [bill] = await db
    .select()
    .from(bills)
    .where(eq(bills.id, billId))
    .limit(1);
  if (!bill) notFound();

  const [[head], bankRows] = await Promise.all([
    db
      .select()
      .from(ledgerHeads)
      .where(eq(ledgerHeads.id, bill.ledgerHeadId))
      .limit(1),
    bill.bankAccountId
      ? db
          .select()
          .from(bankAccounts)
          .where(eq(bankAccounts.id, bill.bankAccountId))
          .limit(1)
      : Promise.resolve([]),
  ]);
  const paymentBank = bankRows[0];
  const grossAmount = num(bill.amount);
  const deductionAmount = num(bill.deductionAmount);
  const netAmount = bill.netAmount
    ? num(bill.netAmount)
    : Math.max(0, grossAmount - deductionAmount);

  const labelCell =
    "w-44 border border-slate-600 bg-slate-50 px-3 py-2 font-bold";
  const valueCell = "border border-slate-600 px-3 py-2";

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
        <Link
          href="/bills-budget"
          className="text-sm font-semibold text-emerald-700 underline hover:text-emerald-900"
        >
          ← Back to Bill & Budget
        </Link>
        <PrintButton label="🖨️ Print / Save as PDF" />
      </div>

      <div className="print-area aparajita-print mx-auto max-w-4xl rounded-xl border border-slate-300 bg-white p-7 shadow-md">
        <Letterhead badge="Bill / बिल" />

        <div className="mt-4 text-center">
          <p className="text-xl font-bold text-slate-950">
            मद का नाम :- {head?.nameHindi ?? head?.name ?? "-"}
          </p>
        </div>

        <div className="mt-4 flex items-end justify-between border-b-2 border-slate-800 pb-2 text-sm">
          <div>
            <p className="font-bold">प्रपत्र–4</p>
            <p>(उपविधि 22 के अधीन)</p>
          </div>
          <div className="text-right">
            <p>
              <span className="font-bold">संख्या:</span> {bill.billNo}
            </p>
            <p>
              <span className="font-bold">दिनांक:</span> {fmtDate(bill.billDate)}
            </p>
          </div>
        </div>

        <table className="mt-4 w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-700 px-3 py-3 text-center font-bold">
                मांग/वस्तु/कार्य, मात्रा एवं दर सहित विवरण
              </th>
              <th className="w-44 border border-slate-700 px-3 py-3 text-center font-bold">
                धनराशि (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-700 px-3 py-4 align-top">
                <p className="font-bold">Party / Payee: {bill.vendorName}</p>
                <p className="mt-2 whitespace-pre-wrap">{bill.description}</p>
              </td>
              <td className="border border-slate-700 px-3 py-4 text-right align-top font-mono font-bold tabular-nums">
                {inr(grossAmount)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-700 px-3 py-3">
                <p className="font-bold">चेक/भुगतान का विवरण</p>
                <p className="mt-1">
                  <span className="font-semibold">Bank:</span>{" "}
                  {paymentBank?.bankName ?? "SBI (APMC PAYMENT)"} · Account No. 30386343784
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Net Payment Cheque:</span>{" "}
                  {bill.chequeNo || "-"} · Date {fmtDate(bill.chequeDate)} · {inr(netAmount)}
                </p>
                {deductionAmount > 0 && (
                  <p className="mt-1">
                    <span className="font-semibold">Deduction Cheque:</span>{" "}
                    {bill.deductionChequeNo || "-"} · Date {fmtDate(
                      bill.deductionChequeDate,
                    )} · {inr(deductionAmount)}
                  </p>
                )}
              </td>
              <td className="border border-slate-700 px-3 py-3 text-right font-bold">
                {inr(grossAmount)}
              </td>
            </tr>
            <tr className="bg-slate-50">
              <td className="border border-slate-700 px-3 py-2 text-right font-bold">
                Total / सकल योग =
              </td>
              <td className="border border-slate-700 px-3 py-2 text-right font-mono font-bold tabular-nums">
                {inr(grossAmount)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-700 px-3 py-2 text-right font-bold">
                Deduction / कटौती =
              </td>
              <td className="border border-slate-700 px-3 py-2 text-right font-mono font-bold tabular-nums text-red-700">
                {inr(deductionAmount)}
              </td>
            </tr>
            <tr className="bg-emerald-50">
              <td className="border border-slate-700 px-3 py-2 text-right text-base font-bold">
                Net Payment / शुद्ध भुगतान =
              </td>
              <td className="border border-slate-700 px-3 py-2 text-right font-mono text-base font-bold tabular-nums text-emerald-900">
                {inr(netAmount)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="border-x border-b-2 border-slate-700 bg-emerald-50 px-4 py-3 text-center text-xl font-bold">
          {statusLabel[bill.status] ?? bill.status}
        </div>

        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className={labelCell}>कुल स्वीकृत धनराशि</td>
              <td className={valueCell + " text-base font-bold"}>
                {inr(grossAmount)}
              </td>
            </tr>
            <tr>
              <td className={labelCell}>स्वीकृत धनराशि शब्दों में</td>
              <td className={valueCell + " italic"}>
                {amountInWords(grossAmount)}
              </td>
            </tr>
            <tr>
              <td className={labelCell}>Financial Year</td>
              <td className={valueCell}>{bill.financialYear}</td>
            </tr>
            <tr>
              <td className={labelCell}>Posting Status</td>
              <td className={valueCell}>
                {bill.postedCashbookEntryId
                  ? `Cashbook & Ledger Posted · Entry #${bill.postedCashbookEntryId}`
                  : "Draft · Not Posted"}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-5 space-y-2 rounded-lg border border-slate-400 bg-slate-50 px-4 py-3 text-sm leading-6">
          <p>
            1. प्रमाणित करता हूँ कि इस बिल के समस्त व्यय मण्डी समिति के हित को देखते हुए टाले नहीं जा सकते हैं।
          </p>
          <p>
            2. प्रमाणित करता हूँ कि बिल में वर्णित वस्तु/कार्य सक्षम स्वीकृति के अनुसार प्राप्त/सम्पादित हुआ है।
          </p>
          <p>
            3. प्रमाणित करता हूँ कि मात्रा, गुणवत्ता तथा दर की जाँच कर ली गयी है और दर बाजार भाव के अनुरूप है।
          </p>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 text-center text-sm">
          <div className="border-t border-slate-700 pt-2">Prepared By</div>
          <div className="border-t border-slate-700 pt-2">Accountant / लेखाकार</div>
          <div className="border-t border-slate-700 pt-2">Sanctioning Authority</div>
        </div>
        <p className="mt-8 text-center text-[10px] text-slate-400">
          System generated Contingent Bill · Bill ID #{bill.id}
        </p>
      </div>
    </div>
  );
}
