import { db } from "@/db";
import { bills, ledgerHeads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { inr, fmtDate } from "@/lib/format";
import { amountInWords } from "@/lib/words";
import PrintButton from "@/components/PrintButton";
import Letterhead from "@/components/Letterhead";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  pending: "PENDING APPROVAL",
  approved: "APPROVED — PAYMENT DUE",
  paid: "PAID",
  rejected: "REJECTED",
};

export default async function BillVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const billId = parseInt(id, 10);
  if (isNaN(billId)) notFound();

  const [bill] = await db.select().from(bills).where(eq(bills.id, billId));
  if (!bill) notFound();

  const [head] = await db
    .select()
    .from(ledgerHeads)
    .where(eq(ledgerHeads.id, bill.ledgerHeadId));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/bills-budget"
          className="text-sm font-semibold text-emerald-700 underline hover:text-emerald-900"
        >
          ← Back to Bill & Budget
        </Link>
        <PrintButton label="🖨️ Print Bill Voucher" />
      </div>

      <div className="print-area mx-auto max-w-3xl rounded-xl border border-slate-300 bg-white p-8 shadow-md">
        <Letterhead badge="Bill Payment Voucher / बिल भुगतान वाउचर" />

        <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
          <p>
            <span className="font-semibold">Bill No.:</span> {bill.billNo}
          </p>
          <p>
            <span className="font-semibold">Bill Date:</span> {fmtDate(bill.billDate)}
          </p>
          <p>
            <span className="font-semibold">Financial Year:</span> {bill.financialYear}
          </p>
        </div>

        <table className="mt-5 w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="w-48 border border-slate-400 bg-slate-50 px-3 py-2.5 font-semibold">
                Vendor / Party
              </td>
              <td className="border border-slate-400 px-3 py-2.5">{bill.vendorName}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 bg-slate-50 px-3 py-2.5 font-semibold">
                Description / कार्य विवरण
              </td>
              <td className="border border-slate-400 px-3 py-2.5">{bill.description}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 bg-slate-50 px-3 py-2.5 font-semibold">
                Budget Head / बजट शीर्ष
              </td>
              <td className="border border-slate-400 px-3 py-2.5">
                {head ? `${head.name} (${head.code})` : "-"}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 bg-slate-50 px-3 py-2.5 font-semibold">
                Amount / धनराशि
              </td>
              <td className="border border-slate-400 px-3 py-2.5 text-lg font-bold">
                {inr(bill.amount)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 bg-slate-50 px-3 py-2.5 font-semibold">
                Amount in Words / शब्दों में
              </td>
              <td className="border border-slate-400 px-3 py-2.5 italic">
                {amountInWords(bill.amount)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 bg-slate-50 px-3 py-2.5 font-semibold">
                Status / स्थिति
              </td>
              <td className="border border-slate-400 px-3 py-2.5 font-bold uppercase">
                {statusLabel[bill.status] ?? bill.status}
                {bill.paymentDate ? ` · Payment Date: ${fmtDate(bill.paymentDate)}` : ""}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-16 grid grid-cols-3 gap-6 text-center text-sm">
          <div>
            <div className="border-t-2 border-slate-700 pt-2 font-semibold">
              Prepared By
              <br />
              <span className="font-normal text-slate-500">(लिपिक / Clerk)</span>
            </div>
          </div>
          <div>
            <div className="border-t-2 border-slate-700 pt-2 font-semibold">
              Verified By
              <br />
              <span className="font-normal text-slate-500">(लेखाकार / Accountant)</span>
            </div>
          </div>
          <div>
            <div className="border-t-2 border-slate-700 pt-2 font-semibold">
              Sanctioned By
              <br />
              <span className="font-normal text-slate-500">(सचिव / Secretary)</span>
            </div>
          </div>
        </div>

        <p className="mt-8 border-t border-slate-200 pt-3 text-center text-[11px] text-slate-400">
          This is a system generated voucher · APMC Accounts Module · Bill ID #{bill.id}
        </p>
      </div>
    </div>
  );
}
