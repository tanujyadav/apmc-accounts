import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { brsStatements } from "@/db/schema";
import Letterhead from "@/components/Letterhead";
import PrintButton from "@/components/PrintButton";
import { financialYearForDate, fmtDate, inr } from "@/lib/format";

export const dynamic = "force-dynamic";

function displayMonth(month: string): string {
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default async function BrsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  if (!month) notFound();

  const [statement] = await db
    .select()
    .from(brsStatements)
    .where(
      and(
        isNull(brsStatements.bankAccountId),
        eq(brsStatements.statementMonth, month),
      ),
    )
    .limit(1);
  if (!statement) notFound();
  const statementStart = `${month}-01`;
  const financialYear = financialYearForDate(statementStart);
  const difference = Number(statement.differenceSnapshot);
  const differenceStatus =
    difference > 0.005
      ? "BANK SURPLUS (+)"
      : difference < -0.005
        ? "BANK NEGATIVE (-)"
        : "MATCHED / NO DIFFERENCE";
  const differenceAmount =
    Math.abs(difference) < 0.005
      ? inr(0)
      : `${difference > 0 ? "+" : "−"} ${inr(Math.abs(difference))}`;

  const rowNo = "w-12 border border-slate-500 px-2 py-2 text-center font-bold";
  const label = "border border-slate-500 px-3 py-2 text-sm";
  const amount = "w-48 border border-slate-500 px-3 py-2 text-right font-mono text-sm font-bold tabular-nums";

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
        <Link
          href={`/brs?month=${month}`}
          className="text-sm font-semibold text-emerald-700 underline"
        >
          ← Back to BRS
        </Link>
        <PrintButton label="🖨️ Print / Save as PDF" />
      </div>

      <div className="print-area aparajita-print mx-auto max-w-5xl rounded-xl border border-slate-300 bg-white p-6 shadow-md">
        <Letterhead badge="Bank Reconciliation Statement / बैंक समाधान विवरण" />

        <div className="my-4 grid grid-cols-2 border border-slate-500 bg-slate-50 text-sm">
          <p className="border-r border-slate-400 px-4 py-2 text-center">
            <span className="font-bold">Selected Month / चयनित माह:</span>{" "}
            {displayMonth(month)}
          </p>
          <p className="px-4 py-2 text-center">
            <span className="font-bold">Financial Year / वित्तीय वर्ष:</span>{" "}
            {financialYear}
          </p>
        </div>

        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={rowNo}>1</td>
              <td className={label + " font-semibold"}>
                रोकड़ बही के अनुसार बैंक में जमा अवशेष
                <span className="ml-2 text-xs text-slate-500">(Cashbook Closing Balance — Bank Column)</span>
              </td>
              <td className={amount}>{inr(statement.cashbookBalanceSnapshot)}</td>
            </tr>
            <tr className="bg-slate-50">
              <td className={rowNo}>2</td>
              <td colSpan={2} className={label + " font-bold"}>जोड़िये :-</td>
            </tr>
            <tr>
              <td className={rowNo}></td>
              <td className={label}>
                (अ) चालू माह में निर्गत चेक किन्तु मासान्त तक बैंक द्वारा भुगतान नहीं
                <span className="ml-2 text-xs text-blue-700">({statement.unpresentedCountSnapshot} pending cheques)</span>
              </td>
              <td className={amount}>{inr(statement.unpresentedChequesSnapshot)}</td>
            </tr>
            <tr>
              <td className={rowNo}></td>
              <td className={label}>(ब) बैंक से प्राप्त ब्याज जिसकी प्रविष्टि रोकड़ बही/लेजर में न की गयी हो</td>
              <td className={amount}>{inr(statement.bankInterest)}</td>
            </tr>
            <tr>
              <td className={rowNo}></td>
              <td className={label}>(स) अप्रत्यक्ष जमा (बैंक में जमा किन्तु रोकड़ बही में प्रविष्टि नहीं)</td>
              <td className={amount}>{inr(statement.indirectDeposits)}</td>
            </tr>
            <tr>
              <td className={rowNo}></td>
              <td className={label}>(द) अन्य प्राप्तियां</td>
              <td className={amount}>{inr(statement.otherReceipts)}</td>
            </tr>
            <tr className="bg-amber-200">
              <td className={rowNo}>3</td>
              <td className={label + " text-center font-bold"}>योग :- 2(अ) से 2(द) तक</td>
              <td className={amount}>{inr(statement.totalAdditionsSnapshot)}</td>
            </tr>
            <tr className="bg-emerald-100">
              <td className={rowNo}>4</td>
              <td className={label + " text-center text-base font-bold"}>योग (1+3) =</td>
              <td className={amount}>{inr(statement.balanceAfterAdditionsSnapshot)}</td>
            </tr>
            <tr className="bg-slate-50">
              <td className={rowNo}>5</td>
              <td colSpan={2} className={label + " font-bold"}>घटाइये :-</td>
            </tr>
            <tr>
              <td className={rowNo}></td>
              <td className={label}>
                (अ) बैंक में चेक/बैंक ड्राफ्ट जमा किन्तु मास के अन्त तक खाते में जमा न होना
                <span className="ml-2 text-xs text-amber-700">({statement.unclearedCountSnapshot} uncleared deposits)</span>
              </td>
              <td className={amount}>{inr(statement.unclearedDepositsSnapshot)}</td>
            </tr>
            <tr>
              <td className={rowNo}></td>
              <td className={label}>(ब) बैंक व्यय</td>
              <td className={amount}>{inr(statement.bankCharges)}</td>
            </tr>
            <tr>
              <td className={rowNo}></td>
              <td className={label}>(स) अन्य व्यय</td>
              <td className={amount}>{inr(statement.otherExpenses)}</td>
            </tr>
            <tr className="bg-amber-200">
              <td className={rowNo}>6</td>
              <td className={label + " text-center font-bold"}>योग :- 5(अ) से 5(स) तक</td>
              <td className={amount}>{inr(statement.totalDeductionsSnapshot)}</td>
            </tr>
            <tr className="bg-blue-100">
              <td className={rowNo}>7</td>
              <td className={label + " text-center text-base font-bold"}>अवशेष (4-6) =</td>
              <td className={amount}>{inr(statement.calculatedBalanceSnapshot)}</td>
            </tr>
            <tr className="bg-cyan-50">
              <td className={rowNo}>8</td>
              <td className={label + " text-center text-base font-bold"}>पासबुक का वास्तविक अवशेष</td>
              <td className={amount}>{inr(statement.passbookBalance)}</td>
            </tr>
            <tr
              className={
                difference > 0.005
                  ? "bg-emerald-50"
                  : difference < -0.005
                    ? "bg-red-50"
                    : "bg-blue-50"
              }
            >
              <td className={rowNo}>9</td>
              <td className={label + " text-center text-base font-bold"}>
                अन्तर (7-8) = {differenceStatus}
              </td>
              <td className={amount}>{differenceAmount}</td>
            </tr>
          </tbody>
        </table>

        {statement.remarks && (
          <p className="mt-4 rounded border border-slate-300 px-3 py-2 text-sm">
            <span className="font-semibold">Remarks:</span> {statement.remarks}
          </p>
        )}

        <div className="mt-14 grid grid-cols-3 gap-8 text-center text-sm">
          <div className="border-t border-slate-700 pt-2">Prepared By</div>
          <div className="border-t border-slate-700 pt-2">Accountant / लेखाकार</div>
          <div className="border-t border-slate-700 pt-2">Authorised Signatory</div>
        </div>

        <p className="mt-8 text-center text-[10px] text-slate-400">
          System generated saved BRS snapshot · Statement ID #{statement.id} · {fmtDate(statement.updatedAt)}
        </p>
      </div>
    </div>
  );
}
