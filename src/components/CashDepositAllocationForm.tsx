"use client";

import { useMemo, useState } from "react";
import { addCashDeposit } from "@/lib/actions";
import { fmtDate, inr } from "@/lib/format";
import { btnCls, inputCls, labelCls } from "@/components/ui";

type CashSource = {
  sourceKey: string;
  sourceType: "opening" | "receipt";
  entryDate: string;
  voucherNo: string;
  partyName: string | null;
  headLabel: string;
  receiptAmount: number;
  alreadyDeposited: number;
  availableAmount: number;
  fixedBankId: number | null;
  fixedBankName: string;
  fixedBankAccountNumber: string;
  fixedBankAvailable: boolean;
  allowBankSelection: boolean;
};

type ActiveBank = {
  id: number;
  bankName: string;
  branch: string;
  accountNumber: string;
};

export default function CashDepositAllocationForm({
  receipts,
  defaultDate,
  defaultDepositedBy,
  activeBanks,
}: {
  receipts: CashSource[];
  defaultDate: string;
  defaultDepositedBy: string;
  activeBanks: ActiveBank[];
}) {
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [selectedBanks, setSelectedBanks] = useState<Record<string, string>>(
    Object.fromEntries(
      receipts.map((receipt) => [
        receipt.sourceKey,
        receipt.allowBankSelection
          ? String(activeBanks[0]?.id ?? "")
          : String(receipt.fixedBankId ?? ""),
      ]),
    ),
  );

  const selectedTotal = useMemo(
    () =>
      receipts.reduce(
        (sum, receipt) =>
          sum + (Number(allocations[receipt.sourceKey]) || 0),
        0,
      ),
    [allocations, receipts],
  );
  const hasOpeningSource = receipts.some(
    (receipt) => receipt.allowBankSelection,
  );
  const hasSelectedMissingBank = receipts.some((receipt) => {
    if ((Number(allocations[receipt.sourceKey]) || 0) <= 0) return false;
    return receipt.allowBankSelection
      ? !selectedBanks[receipt.sourceKey]
      : !receipt.fixedBankAvailable;
  });

  function setFull(receipt: CashSource) {
    setAllocations((current) => ({
      ...current,
      [receipt.sourceKey]: receipt.availableAmount.toFixed(2),
    }));
  }

  function allocateAll() {
    setAllocations(
      Object.fromEntries(
        receipts.map((receipt) => [
          receipt.sourceKey,
          receipt.availableAmount.toFixed(2),
        ]),
      ),
    );
  }

  return (
    <form action={addCashDeposit} className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className={labelCls}>Deposit Date / जमा दिनांक</label>
          <input
            type="date"
            name="depositDate"
            defaultValue={defaultDate}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Deposit Slip No. / पर्ची संख्या</label>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            Auto-generated · CDS-YYYY-000001
          </div>
        </div>
        <div>
          <label className={labelCls}>Bank Routing / बैंक निर्धारण</label>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
            {hasOpeningSource
              ? "Active Bank Account dropdown से चुनें"
              : "🔒 Income Head के अनुसार Fixed"}
          </div>
        </div>
        <div>
          <label className={labelCls}>Deposited By / जमा करने वाला</label>
          <input
            name="depositedBy"
            defaultValue={defaultDepositedBy}
            placeholder="Cashier name"
            required
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Remarks / टिप्पणी</label>
        <input
          name="remarks"
          placeholder="Cash receipts deposited into bank"
          className={inputCls}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Select Opening Cash & Cash Receipts / प्रारम्भिक रोकड़ एवं नकद प्राप्तियां चुनें
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Full या partial amount bank deposit में allocate करें।
            </p>
          </div>
          {receipts.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllocations({})}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={allocateAll}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Allocate All Pending
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr>
                <th className="border-b border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Source Date</th>
                <th className="border-b border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Source / Party</th>
                <th className="border-b border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Income Head</th>
                <th className="border-b border-slate-200 bg-white px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Available Cash</th>
                <th className="border-b border-slate-200 bg-white px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Deposited Earlier</th>
                <th className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-right text-xs font-semibold uppercase text-amber-700">Pending</th>
                <th className="border-b border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold uppercase text-emerald-700">Deposit Now</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    कोई pending Opening Cash या Cash Receipt नहीं है। Cashbook में Opening Cash अथवा Cash Receipt दर्ज करें।
                  </td>
                </tr>
              )}
              {receipts.map((receipt) => (
                <tr
                  key={receipt.sourceKey}
                  className={`border-b border-slate-100 last:border-b-0 hover:bg-slate-50 ${
                    receipt.sourceType === "opening" ? "bg-amber-50/60" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">
                    {fmtDate(receipt.entryDate)}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    <span className="font-semibold text-slate-800">{receipt.voucherNo}</span>
                    {receipt.sourceType === "opening" && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        OPENING CASH
                      </span>
                    )}
                    <br />
                    <span className="text-xs text-slate-500">{receipt.partyName || "-"}</span>
                  </td>
                  <td className="max-w-72 px-3 py-3 text-sm text-slate-700">
                    <span className="font-semibold">{receipt.headLabel}</span>
                    {receipt.allowBankSelection ? (
                      <div className="mt-2">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-blue-700">
                          Active Bank Account चुनें
                        </label>
                        <select
                          name="destinationBankAccountId"
                          value={selectedBanks[receipt.sourceKey] ?? ""}
                          onChange={(event) =>
                            setSelectedBanks((current) => ({
                              ...current,
                              [receipt.sourceKey]: event.target.value,
                            }))
                          }
                          required
                          className="w-full rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-900 outline-none focus:border-blue-500"
                        >
                          <option value="">-- active bank account select करें --</option>
                          {activeBanks.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.bankName} · A/C {bank.accountNumber} · {bank.branch}
                            </option>
                          ))}
                        </select>
                        {activeBanks.length === 0 && (
                          <p className="mt-1 text-[11px] font-semibold text-red-700">
                            कोई Active Bank Account उपलब्ध नहीं है।
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <input
                          type="hidden"
                          name="destinationBankAccountId"
                          value={receipt.fixedBankId ?? ""}
                        />
                        <div
                          className={`mt-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${
                            receipt.fixedBankAvailable
                              ? "bg-blue-50 text-blue-800"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          🔒 {receipt.fixedBankName} · A/C {receipt.fixedBankAccountNumber}
                          {!receipt.fixedBankAvailable && " · Account missing"}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-emerald-700">
                    {inr(receipt.receiptAmount)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm tabular-nums text-blue-700">
                    {inr(receipt.alreadyDeposited)}
                  </td>
                  <td className="bg-amber-50/50 px-3 py-3 text-right text-sm font-bold tabular-nums text-amber-800">
                    {inr(receipt.availableAmount)}
                  </td>
                  <td className="bg-emerald-50/40 px-3 py-3">
                    <input type="hidden" name="sourceKey" value={receipt.sourceKey} />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="allocatedAmount"
                        min="0"
                        max={receipt.availableAmount}
                        step="0.01"
                        value={allocations[receipt.sourceKey] ?? ""}
                        onChange={(event) =>
                          setAllocations((current) => ({
                            ...current,
                            [receipt.sourceKey]: event.target.value,
                          }))
                        }
                        placeholder="0.00"
                        disabled={!receipt.fixedBankAvailable}
                        className="w-32 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-right text-sm font-semibold text-emerald-800 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => setFull(receipt)}
                        disabled={!receipt.fixedBankAvailable}
                        className="rounded-lg border border-emerald-300 bg-white px-2.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      >
                        Full
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Total Cash Being Deposited
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{inr(selectedTotal)}</p>
        </div>
        <button
          disabled={selectedTotal <= 0 || hasSelectedMissingBank}
          className={`${btnCls} disabled:cursor-not-allowed disabled:bg-slate-300`}
        >
          Record Bank Cash Deposit
        </button>
      </div>
    </form>
  );
}
