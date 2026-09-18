"use client";

import PinProtectedForm from "@/components/PinProtectedForm";
import { useMemo, useState } from "react";
import { saveBrsStatement } from "@/lib/actions";
import { inr } from "@/lib/format";

type ManualValues = {
  bankInterest: string;
  indirectDeposits: string;
  otherReceipts: string;
  bankCharges: string;
  otherExpenses: string;
  passbookBalance: string;
  remarks: string;
};

const numberInputClass =
  "w-full max-w-40 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-right font-mono text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

type AmountField = Exclude<keyof ManualValues, "remarks">;

function ManualAmount({
  field,
  hint,
  current,
  onChange,
}: {
  field: AmountField;
  hint?: string;
  current: string;
  onChange: (field: AmountField, amount: string) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      {hint && <span className="text-[10px] italic text-slate-400">{hint}</span>}
      <input
        type="number"
        min="0"
        step="0.01"
        name={field}
        value={current}
        onChange={(event) => onChange(field, event.target.value)}
        className={numberInputClass}
        aria-label={field}
      />
    </div>
  );
}

export default function BrsStatementForm({
  statementMonth,
  monthLabel,
  cashbookBalance,
  unpresentedCheques,
  unpresentedCount,
  unclearedDeposits,
  unclearedCount,
  initialValues,
}: {
  statementMonth: string;
  monthLabel: string;
  cashbookBalance: number;
  unpresentedCheques: number;
  unpresentedCount: number;
  unclearedDeposits: number;
  unclearedCount: number;
  initialValues: ManualValues;
}) {
  const [values, setValues] = useState(initialValues);

  function value(key: keyof ManualValues): number {
    if (key === "remarks") return 0;
    const parsed = Number(values[key]);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function setAmount(key: AmountField, amount: string) {
    setValues((current) => ({ ...current, [key]: amount }));
  }

  const totals = useMemo(() => {
    const totalAdditions =
      unpresentedCheques +
      value("bankInterest") +
      value("indirectDeposits") +
      value("otherReceipts");
    const balanceAfterAdditions = cashbookBalance + totalAdditions;
    const totalDeductions =
      unclearedDeposits + value("bankCharges") + value("otherExpenses");
    const calculatedBalance = balanceAfterAdditions - totalDeductions;
    // Bank variance is Passbook (Row 8) minus calculated BRS balance (Row 7).
    // Positive = Bank Surplus; Negative = Bank Negative.
    const difference = value("passbookBalance") - calculatedBalance;
    return {
      totalAdditions,
      balanceAfterAdditions,
      totalDeductions,
      calculatedBalance,
      difference,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, cashbookBalance, unpresentedCheques, unclearedDeposits]);

  const differenceStatus =
    totals.difference > 0.005
      ? "BANK SURPLUS (+)"
      : totals.difference < -0.005
        ? "BANK NEGATIVE (-)"
        : "MATCHED / NO DIFFERENCE";
  const differenceAmount =
    Math.abs(totals.difference) < 0.005
      ? inr(0)
      : `${totals.difference > 0 ? "+" : "−"} ${inr(
          Math.abs(totals.difference),
        )}`;

  const rowNumber =
    "w-12 border-b border-r border-slate-300 px-2 py-2.5 text-center text-sm font-bold italic text-slate-800";
  const description =
    "border-b border-r border-slate-300 px-3 py-2.5 text-sm leading-6 text-slate-800";
  const amount =
    "w-52 whitespace-nowrap border-b border-slate-300 px-3 py-2.5 text-right font-mono text-sm font-bold tabular-nums text-slate-900";

  return (
    <PinProtectedForm action={saveBrsStatement}>
      <input type="hidden" name="statementMonth" value={statementMonth} />
      <input type="hidden" name="cashbookBalanceSnapshot" value={cashbookBalance} />
      <input type="hidden" name="unpresentedChequesSnapshot" value={unpresentedCheques} />
      <input type="hidden" name="unpresentedCountSnapshot" value={unpresentedCount} />
      <input type="hidden" name="unclearedDepositsSnapshot" value={unclearedDeposits} />
      <input type="hidden" name="unclearedCountSnapshot" value={unclearedCount} />
      <input type="hidden" name="totalAdditionsSnapshot" value={totals.totalAdditions} />
      <input type="hidden" name="balanceAfterAdditionsSnapshot" value={totals.balanceAfterAdditions} />
      <input type="hidden" name="totalDeductionsSnapshot" value={totals.totalDeductions} />
      <input type="hidden" name="calculatedBalanceSnapshot" value={totals.calculatedBalance} />
      <input type="hidden" name="differenceSnapshot" value={totals.difference} />

      <div className="max-w-full overflow-x-auto rounded-xl border-2 border-slate-700 bg-white">
        <table className="w-full min-w-[720px] table-fixed border-collapse bg-white">
          <thead>
            <tr className="bg-slate-100">
              <th colSpan={2} className="border-b-2 border-r-2 border-slate-700 px-3 py-3 text-center text-base font-bold text-slate-900 sm:text-xl">
                बैंक समाधान विवरण
              </th>
              <th className="w-52 border-b-2 border-slate-700 px-3 py-3 text-center text-base font-bold italic text-slate-900">
                {monthLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={rowNumber}>1</td>
              <td className={description + " font-semibold"}>
                रोकड़ बही के अनुसार बैंक में जमा अवशेष
                <span className="ml-3 text-sm font-normal text-slate-500">
                  (Cashbook Closing Balance — Bank Column, Auto Sync)
                </span>
              </td>
              <td className={amount}>{inr(cashbookBalance)}</td>
            </tr>

            <tr className="bg-slate-50">
              <td className={rowNumber}>2</td>
              <td colSpan={2} className={description + " border-r-0 text-base font-bold"}>
                जोड़िये :-
              </td>
            </tr>

            <tr>
              <td className={rowNumber}></td>
              <td className={description}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1">
                    (अ)&nbsp; चालू माह में निर्गत चेक किन्तु मासान्त तक बैंक द्वारा भुगतान नहीं
                    <span className="ml-2 text-xs font-semibold text-blue-700">
                      (Cheque Register से Auto Sync)
                    </span>
                  </span>
                  <span className="whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {unpresentedCount} चेक अनिस्तारित
                  </span>
                </div>
              </td>
              <td className={amount}>{inr(unpresentedCheques)}</td>
            </tr>

            <tr>
              <td className={rowNumber}></td>
              <td className={description}>
                (ब)&nbsp; बैंक से प्राप्त ब्याज जिसकी प्रविष्टि रोकड़ बही/लेजर में न की गयी हो
              </td>
              <td className={amount}>
                <ManualAmount field="bankInterest" hint="समायोजन हेतु राशि भरें" current={values.bankInterest} onChange={setAmount} />
              </td>
            </tr>

            <tr>
              <td className={rowNumber}></td>
              <td className={description}>
                (स)&nbsp; अप्रत्यक्ष जमा (वह धनराशि जो बैंक में जमा है किन्तु रोकड़ बही में प्रविष्टि नहीं है)
              </td>
              <td className={amount}>
                <ManualAmount field="indirectDeposits" current={values.indirectDeposits} onChange={setAmount} />
              </td>
            </tr>

            <tr>
              <td className={rowNumber}></td>
              <td className={description}>(द)&nbsp; अन्य प्राप्तियां</td>
              <td className={amount}>
                <ManualAmount field="otherReceipts" current={values.otherReceipts} onChange={setAmount} />
              </td>
            </tr>

            <tr className="bg-amber-200">
              <td className={rowNumber + " border-amber-400 bg-amber-200"}>3</td>
              <td className={description + " border-amber-400 bg-amber-200 text-center text-base font-bold"}>
                योग :- 2(अ) से 2(द) तक
              </td>
              <td className={amount + " border-amber-400 bg-amber-200 text-base"}>
                {inr(totals.totalAdditions)}
              </td>
            </tr>

            <tr className="bg-emerald-100">
              <td className={rowNumber + " border-emerald-300 bg-emerald-100"}>4</td>
              <td className={description + " border-emerald-300 bg-emerald-100 text-center text-base font-bold"}>
                योग (1+3) =
              </td>
              <td className={amount + " border-emerald-300 bg-emerald-100 text-base"}>
                {inr(totals.balanceAfterAdditions)}
              </td>
            </tr>

            <tr className="bg-slate-50">
              <td className={rowNumber}>5</td>
              <td colSpan={2} className={description + " border-r-0 text-base font-bold"}>
                घटाइये :-
              </td>
            </tr>

            <tr>
              <td className={rowNumber}></td>
              <td className={description}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1">(अ)&nbsp; बैंक में चेक/बैंक ड्राफ्ट जमा किन्तु मास के अन्त तक खाते में जमा न होना</span>
                  <span className="whitespace-nowrap rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {unclearedCount} जमा अनिस्तारित
                  </span>
                </div>
              </td>
              <td className={amount}>{inr(unclearedDeposits)}</td>
            </tr>

            <tr>
              <td className={rowNumber}></td>
              <td className={description}>(ब)&nbsp; बैंक व्यय</td>
              <td className={amount}>
                <ManualAmount field="bankCharges" hint="समायोजन हेतु राशि भरें" current={values.bankCharges} onChange={setAmount} />
              </td>
            </tr>

            <tr>
              <td className={rowNumber}></td>
              <td className={description}>(स)&nbsp; अन्य व्यय</td>
              <td className={amount}>
                <ManualAmount field="otherExpenses" current={values.otherExpenses} onChange={setAmount} />
              </td>
            </tr>

            <tr className="bg-amber-200">
              <td className={rowNumber + " border-amber-400 bg-amber-200"}>6</td>
              <td className={description + " border-amber-400 bg-amber-200 text-center text-base font-bold"}>
                योग :- 5(अ) से 5(स) तक
              </td>
              <td className={amount + " border-amber-400 bg-amber-200 text-base"}>
                {inr(totals.totalDeductions)}
              </td>
            </tr>

            <tr className="bg-blue-100">
              <td className={rowNumber + " border-blue-300 bg-blue-100"}>7</td>
              <td className={description + " border-blue-300 bg-blue-100 text-center text-base font-bold"}>
                अवशेष (4-6) =
              </td>
              <td className={amount + " border-blue-300 bg-blue-100 text-base"}>
                {inr(totals.calculatedBalance)}
              </td>
            </tr>

            <tr className="bg-cyan-50">
              <td className={rowNumber + " border-cyan-200 bg-cyan-50"}>8</td>
              <td className={description + " border-cyan-200 bg-cyan-50 text-center text-base font-bold"}>
                पासबुक का वास्तविक अवशेष
              </td>
              <td className={amount + " border-cyan-200 bg-cyan-50"}>
                <ManualAmount field="passbookBalance" current={values.passbookBalance} onChange={setAmount} />
              </td>
            </tr>

            <tr
              className={
                totals.difference > 0.005
                  ? "bg-emerald-50"
                  : totals.difference < -0.005
                    ? "bg-red-50"
                    : "bg-blue-50"
              }
            >
              <td className={rowNumber}>9</td>
              <td className={description + " text-center text-base font-bold"}>
                <span>अन्तर (7-8) =</span>
                <span
                  className={`ml-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                    totals.difference > 0.005
                      ? "bg-emerald-100 text-emerald-800"
                      : totals.difference < -0.005
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {differenceStatus}
                </span>
              </td>
              <td
                className={`${amount} text-base ${
                  totals.difference > 0.005
                    ? "text-emerald-700"
                    : totals.difference < -0.005
                      ? "text-red-700"
                      : "text-blue-700"
                }`}
              >
                {differenceAmount}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="min-w-64 flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Remarks / टिप्पणी
          </label>
          <input
            name="remarks"
            value={values.remarks}
            onChange={(event) =>
              setValues((current) => ({ ...current, remarks: event.target.value }))
            }
            placeholder="Month-end reconciliation notes"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <button className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
          Save BRS Statement
        </button>
      </div>
    </PinProtectedForm>
  );
}
