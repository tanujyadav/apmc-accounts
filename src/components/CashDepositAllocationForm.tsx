"use client";

import { useMemo, useState } from "react";
import { addCashDeposit } from "@/lib/actions";
import { fmtDate, inr } from "@/lib/format";
import { btnCls, inputCls, labelCls } from "@/components/ui";

type Receipt = {
  id: number;
  entryDate: string;
  voucherNo: string;
  partyName: string | null;
  headLabel: string;
  receiptAmount: number;
  alreadyDeposited: number;
  availableAmount: number;
};

type Bank = {
  id: number;
  bankName: string;
  accountNumber: string;
};

export default function CashDepositAllocationForm({
  receipts,
  banks,
  defaultDate,
}: {
  receipts: Receipt[];
  banks: Bank[];
  defaultDate: string;
}) {
  const [allocations, setAllocations] = useState<Record<number, string>>({});

  const selectedTotal = useMemo(
    () =>
      receipts.reduce(
        (sum, receipt) => sum + (Number(allocations[receipt.id]) || 0),
        0,
      ),
    [allocations, receipts],
  );

  function setFull(receipt: Receipt) {
    setAllocations((current) => ({
      ...current,
      [receipt.id]: receipt.availableAmount.toFixed(2),
    }));
  }

  function allocateAll() {
    setAllocations(
      Object.fromEntries(
        receipts.map((receipt) => [receipt.id, receipt.availableAmount.toFixed(2)]),
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
          <input name="slipNo" placeholder="DS-001" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Bank Account / बैंक खाता</label>
          <select name="bankAccountId" required className={inputCls}>
            <option value="">-- select bank account --</option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.bankName} ····{bank.accountNumber.slice(-4)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Deposited By / जमा करने वाला</label>
          <input name="depositedBy" placeholder="Cashier name" required className={inputCls} />
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
              Select Cashbook Receipts / नकद प्राप्तियां चुनें
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
                <th className="border-b border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Receipt Date</th>
                <th className="border-b border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Voucher / Party</th>
                <th className="border-b border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Income Head</th>
                <th className="border-b border-slate-200 bg-white px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Cash Receipt</th>
                <th className="border-b border-slate-200 bg-white px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Deposited Earlier</th>
                <th className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-right text-xs font-semibold uppercase text-amber-700">Pending</th>
                <th className="border-b border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold uppercase text-emerald-700">Deposit Now</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    कोई pending Cash Receipt नहीं है। पहले Cashbook में Cash mode से Receipt दर्ज करें।
                  </td>
                </tr>
              )}
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">
                    {fmtDate(receipt.entryDate)}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    <span className="font-semibold text-slate-800">{receipt.voucherNo}</span>
                    <br />
                    <span className="text-xs text-slate-500">{receipt.partyName || "-"}</span>
                  </td>
                  <td className="max-w-60 px-3 py-3 text-sm text-slate-700">
                    {receipt.headLabel}
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
                    <input type="hidden" name="cashbookEntryId" value={receipt.id} />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="allocatedAmount"
                        min="0"
                        max={receipt.availableAmount}
                        step="0.01"
                        value={allocations[receipt.id] ?? ""}
                        onChange={(event) =>
                          setAllocations((current) => ({
                            ...current,
                            [receipt.id]: event.target.value,
                          }))
                        }
                        placeholder="0.00"
                        className="w-32 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-right text-sm font-semibold text-emerald-800 outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setFull(receipt)}
                        className="rounded-lg border border-emerald-300 bg-white px-2.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
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
          disabled={selectedTotal <= 0 || banks.length === 0}
          className={`${btnCls} disabled:cursor-not-allowed disabled:bg-slate-300`}
        >
          Record Bank Cash Deposit
        </button>
      </div>
    </form>
  );
}
