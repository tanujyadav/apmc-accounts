"use client";

import { useMemo, useState } from "react";
import { addBill } from "@/lib/actions";
import { inr } from "@/lib/format";
import { btnCls, inputCls, labelCls } from "@/components/ui";

type ExpenseHead = {
  id: number;
  code: string;
  name: string;
  nameHindi: string | null;
};

type Party = {
  id: number;
  name: string;
  partyType: string;
};

type Bank = {
  id: number;
  bankName: string;
  accountNumber: string;
  branch: string;
};

export default function ContingentBillForm({
  financialYear,
  defaultDate,
  nextSerial,
  expenseHeads,
  parties,
  banks,
}: {
  financialYear: string;
  defaultDate: string;
  nextSerial: number;
  expenseHeads: ExpenseHead[];
  parties: Party[];
  banks: Bank[];
}) {
  const [billDate, setBillDate] = useState(defaultDate);
  const [gross, setGross] = useState("");
  const [deduction, setDeduction] = useState("0");
  const grossAmount = Number(gross) || 0;
  const deductionAmount = Number(deduction) || 0;
  const net = useMemo(
    () => grossAmount - deductionAmount,
    [grossAmount, deductionAmount],
  );
  const fixedBank = banks.find(
    (bank) => bank.accountNumber === "30386343784",
  );
  const billMonthName = new Date(`${billDate}T00:00:00`).toLocaleDateString(
    "en-IN",
    { month: "long" },
  ).toUpperCase();
  const automaticBillNumber = `FY${financialYear.slice(0, 4)}/${
    billMonthName === "INVALID DATE" ? "MONTH" : billMonthName
  }/${nextSerial}`;

  return (
    <form action={addBill} className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center">
        <p className="text-sm font-semibold text-blue-900">
          प्रपत्र–4 · उपविधि 22 के अधीन · Financial Year {financialYear}
        </p>
      </div>

      <input type="hidden" name="financialYear" value={financialYear} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Bill No. / संख्या (Auto)</label>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900 shadow-sm">
            {automaticBillNumber}
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            Final number Draft save पर server generate करेगा।
          </p>
        </div>
        <div>
          <label className={labelCls}>Bill Date / दिनांक *</label>
          <input
            type="date"
            name="billDate"
            value={billDate}
            onChange={(event) => setBillDate(event.target.value)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Vendor / Party *</label>
          <input
            name="vendorName"
            list="contingent-party-list"
            placeholder="Party / supplier name"
            required
            className={inputCls}
          />
          <datalist id="contingent-party-list">
            {parties.map((party) => (
              <option key={party.id} value={party.name}>
                {party.partyType}
              </option>
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className={labelCls}>Expense Head / मद का नाम *</label>
        <select name="ledgerHeadId" required className={inputCls}>
          <option value="">-- व्यय मद चुनें --</option>
          {expenseHeads.map((head) => (
            <option key={head.id} value={head.id}>
              [{head.code}] {head.nameHindi ?? head.name} / {head.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>मांग/वस्तु/कार्य तथा दर का विवरण *</label>
        <textarea
          name="description"
          rows={4}
          placeholder="वस्तु/कार्य, मात्रा, दर एवं धनराशि का विवरण"
          required
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Gross Bill Amount / सकल राशि (₹) *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            name="amount"
            value={gross}
            onChange={(event) => setGross(event.target.value)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Deduction / कटौती (₹)</label>
          <input
            type="number"
            min="0"
            max={grossAmount || undefined}
            step="0.01"
            name="deductionAmount"
            value={deduction}
            onChange={(event) => setDeduction(event.target.value)}
            className={inputCls}
          />
        </div>
        <div
          className={`rounded-xl border px-4 py-3 ${
            net > 0
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
            Net Payment / शुद्ध भुगतान
          </p>
          <p
            className={`mt-1 text-xl font-bold ${
              net > 0 ? "text-emerald-900" : "text-red-700"
            }`}
          >
            {inr(net)}
          </p>
        </div>
      </div>

      <div
        className={`rounded-xl border p-4 ${
          fixedBank
            ? "border-blue-200 bg-blue-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
          🔒 Fixed & Locked Payment Bank — Cheque Mode Only
        </p>
        <p className="mt-1 font-bold text-slate-900">
          {fixedBank?.bankName ?? "SBI (APMC PAYMENT)"}
        </p>
        <p className="text-sm text-slate-600">
          Account No. 30386343784
          {fixedBank ? ` · ${fixedBank.branch}` : " · Active account missing"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-bold text-emerald-900">Net Payment Cheque</p>
            <span className="font-bold text-emerald-800">{inr(net)}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Cheque Number *</label>
              <input name="chequeNo" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cheque Date *</label>
              <input
                type="date"
                name="chequeDate"
                defaultValue={defaultDate}
                required
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-bold text-amber-900">Deduction Cheque</p>
            <span className="font-bold text-amber-800">
              {inr(deductionAmount)}
            </span>
          </div>
          {deductionAmount > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Deduction Cheque Number *</label>
                <input name="deductionChequeNo" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Deduction Cheque Date *</label>
                <input
                  type="date"
                  name="deductionChequeDate"
                  defaultValue={defaultDate}
                  required
                  className={inputCls}
                />
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-500">
              Deduction ₹0.00 है—deduction cheque आवश्यक नहीं है।
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          Draft save होने के बाद PIN से Final Approve करें। Approval पर Gross
          Amount Cashbook/Ledger में और दोनों cheques Cheque Register में post होंगे।
        </p>
        <button
          disabled={!gross || net <= 0 || !fixedBank}
          className={
            btnCls +
            " min-w-48 disabled:cursor-not-allowed disabled:bg-slate-300"
          }
        >
          Save Bill as Draft
        </button>
      </div>
    </form>
  );
}
