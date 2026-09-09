"use client";

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
  "w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right font-mono text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

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
    <div className="flex flex-wrap items-center justify-end gap-3">
      {hint && <span className="text-xs italic text-slate-400">{hint}</span>}
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
  bankAccountId,
  statementMonth,
  monthLabel,
  cashbookBalance,
  unpresentedCheques,
  unpresentedCount,
  unclearedDeposits,
  unclearedCount,
  initialValues,
}: {
  bankAccountId: number;
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
    const difference = calculatedBalance - value("passbookBalance");
    return {
      totalAdditions,
      balanceAfterAdditions,
      totalDeductions,
      calculatedBalance,
      difference,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, cashbookBalance, unpresentedCheques, unclearedDeposits]);

  const rowNumber =
    "w-16 border-b border-r border-slate-300 px-3 py-4 text-center text-lg font-bold italic text-slate-800";
  const description = "border-b border-r border-slate-300 px-5 py-4 text-base text-slate-800";
  const amount =
    "w-72 whitespace-nowrap border-b border-slate-300 px-5 py-4 text-right font-mono text-base font-bold tabular-nums text-slate-900";

  return (
    <form action={saveBrsStatement}>
      <input type="hidden" name="bankAccountId" value={bankAccountId} />
      <input type="hidden" name="statementMonth" value={statementMonth} />

      <div className="overflow-x-auto rounded-xl border-2 border-slate-700">
        <table className="w-full min-w-[1150px] border-collapse bg-white">
          <thead>
            <tr className="bg-slate-100">
              <th colSpan={2} className="border-b-2 border-r-2 border-slate-700 px-5 py-4 text-center text-2xl font-bold text-slate-900">
                बैंक समाधान विवरण
              </th>
              <th className="border-b-2 border-slate-700 px-5 py-4 text-center text-xl font-bold italic text-slate-900">
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
                  (Balance as per Cashbook)
                </span>
              </td>
              <td className={amount}>{inr(cashbookBalance)}</td>
            </tr>

            <tr className="bg-slate-50">
              <td className={rowNumber}>2</td>
              <td colSpan={2} className={description + " border-r-0 text-lg font-bold"}>
                जोड़िये :-
              </td>
            </tr>

            <tr>
              <td className={rowNumber}></td>
              <td className={description}>
                <div className="flex items-center justify-between gap-4">
                  <span>(अ)&nbsp; चालू माह में निर्गत चेक किन्तु मासान्त तक बैंक द्वारा भुगतान नहीं</span>
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
              <td className={description + " border-amber-400 bg-amber-200 text-center text-lg font-bold"}>
                योग :- 2(अ) से 2(द) तक
              </td>
              <td className={amount + " border-amber-400 bg-amber-200 text-lg"}>
                {inr(totals.totalAdditions)}
              </td>
            </tr>

            <tr className="bg-emerald-100">
              <td className={rowNumber + " border-emerald-300 bg-emerald-100"}>4</td>
              <td className={description + " border-emerald-300 bg-emerald-100 text-center text-xl font-bold"}>
                योग (1+3) =
              </td>
              <td className={amount + " border-emerald-300 bg-emerald-100 text-lg"}>
                {inr(totals.balanceAfterAdditions)}
              </td>
            </tr>

            <tr className="bg-slate-50">
              <td className={rowNumber}>5</td>
              <td colSpan={2} className={description + " border-r-0 text-lg font-bold"}>
                घटाइये :-
              </td>
            </tr>

            <tr>
              <td className={rowNumber}></td>
              <td className={description}>
                <div className="flex items-center justify-between gap-4">
                  <span>(अ)&nbsp; बैंक में चेक/बैंक ड्राफ्ट जमा किन्तु मास के अन्त तक खाते में जमा न होना</span>
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
              <td className={description + " border-amber-400 bg-amber-200 text-center text-lg font-bold"}>
                योग :- 5(अ) से 5(स) तक
              </td>
              <td className={amount + " border-amber-400 bg-amber-200 text-lg"}>
                {inr(totals.totalDeductions)}
              </td>
            </tr>

            <tr className="bg-blue-100">
              <td className={rowNumber + " border-blue-300 bg-blue-100"}>7</td>
              <td className={description + " border-blue-300 bg-blue-100 text-center text-xl font-bold"}>
                अवशेष (4-6) =
              </td>
              <td className={amount + " border-blue-300 bg-blue-100 text-lg"}>
                {inr(totals.calculatedBalance)}
              </td>
            </tr>

            <tr className="bg-cyan-50">
              <td className={rowNumber + " border-cyan-200 bg-cyan-50"}>8</td>
              <td className={description + " border-cyan-200 bg-cyan-50 text-center text-xl font-bold"}>
                पासबुक का वास्तविक अवशेष
              </td>
              <td className={amount + " border-cyan-200 bg-cyan-50"}>
                <ManualAmount field="passbookBalance" current={values.passbookBalance} onChange={setAmount} />
              </td>
            </tr>

            <tr className="bg-red-50">
              <td className={rowNumber + " border-red-200 bg-red-50"}>9</td>
              <td className={description + " border-red-200 bg-red-50 text-center text-xl font-bold"}>
                अन्तर (7-8) =
              </td>
              <td className={`${amount} border-red-200 bg-red-50 text-lg ${Math.abs(totals.difference) < 0.01 ? "text-emerald-700" : "text-red-700"}`}>
                {inr(totals.difference)}
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
    </form>
  );
}
