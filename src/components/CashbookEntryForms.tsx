"use client";

import { useMemo, useState, type ReactNode } from "react";
import { addCashbookPayment, addCashbookReceipt } from "@/lib/actions";
import { inr } from "@/lib/format";

type Head = {
  id: number;
  code: string;
  name: string;
  nameHindi: string | null;
};

type Bank = {
  id: number;
  bankName: string;
  branch: string;
  accountNumber: string;
};

type Party = {
  id: number;
  name: string;
  nameHindi: string | null;
};

type CreditRow = {
  key: number;
  headId: number;
  destination: "cash" | "bank";
  bankId: number;
  amount: string;
};

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

function ModalShell({
  title,
  tone,
  onClose,
  children,
}: {
  title: string;
  tone: "credit" | "debit";
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="flex items-center gap-3 text-xl font-bold">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${
                tone === "credit"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {tone === "credit" ? "+" : "−"}
            </span>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PartySuggestions({ parties }: { parties: Party[] }) {
  return (
    <datalist id="cashbook-party-directory">
      {parties.map((party) => (
        <option key={party.id} value={party.name}>
          {party.nameHindi ?? "Party Directory"}
        </option>
      ))}
    </datalist>
  );
}

export default function CashbookEntryForms({
  incomeHeads,
  expenseHeads,
  banks,
  parties,
  defaultDate,
  financialYear,
  receiptReference,
  paymentReference,
}: {
  incomeHeads: Head[];
  expenseHeads: Head[];
  banks: Bank[];
  parties: Party[];
  defaultDate: string;
  financialYear: string;
  receiptReference: string;
  paymentReference: string;
}) {
  const [open, setOpen] = useState<"credit" | "debit" | null>(null);
  const [rowSequence, setRowSequence] = useState(2);
  const [sourceMode, setSourceMode] = useState("cash");
  const [paymentMode, setPaymentMode] = useState("bank");
  const defaultIncomeId = incomeHeads[0]?.id ?? 0;
  const [creditRows, setCreditRows] = useState<CreditRow[]>([
    {
      key: 1,
      headId: defaultIncomeId,
      destination: "cash",
      bankId: banks[0]?.id ?? 0,
      amount: "",
    },
  ]);

  const receiptTotal = useMemo(
    () => creditRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [creditRows],
  );

  function addCreditRow(headId = defaultIncomeId) {
    setCreditRows((rows) => [
      ...rows,
      {
        key: rowSequence,
        headId,
        destination: "cash",
        bankId: banks[0]?.id ?? 0,
        amount: "",
      },
    ]);
    setRowSequence((value) => value + 1);
  }

  function setup7R() {
    const mandiFee = incomeHeads.find((head) => head.code === "1-A");
    const developmentCess = incomeHeads.find((head) => head.code === "1-B");
    const selected = [mandiFee, developmentCess].filter(
      (head): head is Head => Boolean(head),
    );
    if (selected.length === 0) return;

    setCreditRows(
      selected.map((head, index) => ({
        key: rowSequence + index,
        headId: head.id,
        destination: "cash",
        bankId: banks[0]?.id ?? 0,
        amount: "",
      })),
    );
    setRowSequence((value) => value + selected.length);
  }

  function updateRow(key: number, patch: Partial<CreditRow>) {
    setCreditRows((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setOpen("credit")}
          className="group flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left transition hover:border-emerald-400 hover:bg-emerald-100"
        >
          <span>
            <span className="block text-sm font-bold text-emerald-800">
              + Record Receipt / प्राप्ति दर्ज करें
            </span>
            <span className="mt-1 block text-xs text-emerald-700/70">
              Income head में Direct Cash या Bank Credit करें
            </span>
          </span>
          <span className="text-2xl text-emerald-600 transition group-hover:translate-x-1">
            →
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOpen("debit")}
          className="group flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-left transition hover:border-red-400 hover:bg-red-100"
        >
          <span>
            <span className="block text-sm font-bold text-red-800">
              − Record Payment / भुगतान दर्ज करें
            </span>
            <span className="mt-1 block text-xs text-red-700/70">
              Expense head में Cash या Bank Debit दर्ज करें
            </span>
          </span>
          <span className="text-2xl text-red-600 transition group-hover:translate-x-1">
            →
          </span>
        </button>
      </div>

      {open === "credit" && (
        <ModalShell
          title="Record Receipt (+ Credit Entry)"
          tone="credit"
          onClose={() => setOpen(null)}
        >
          <form action={addCashbookReceipt}>
            <input type="hidden" name="returnFinancialYear" value={financialYear} />
            <div className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Date / दिनांक</label>
                  <input
                    type="date"
                    name="entryDate"
                    defaultValue={defaultDate}
                    required
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>7R / Receipt Reference</label>
                  <input
                    name="voucherNo"
                    defaultValue={receiptReference}
                    placeholder="7R-2026-001"
                    required
                    className={fieldClass}
                  />
                </div>
              </div>

              <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-200 pb-4">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800">
                      ⊕ Credit Income Heads (7R Receipt Entry)
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Income Head, Cash/Bank destination और amount चुनें।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={setup7R}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
                  >
                    💰 1-Click 7R Setup (मण्डी शुल्क + विकास सेस)
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {creditRows.map((row, index) => {
                    const selectedBank = banks.find((bank) => bank.id === row.bankId);
                    return (
                      <div
                        key={row.key}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
                              Income Head #{index + 1}
                            </span>
                            {row.destination === "bank" && selectedBank && (
                              <span className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-800">
                                🏦 {selectedBank.bankName} A/C ····
                                {selectedBank.accountNumber.slice(-4)}
                              </span>
                            )}
                          </div>
                          {creditRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setCreditRows((rows) =>
                                  rows.filter((item) => item.key !== row.key),
                                )
                              }
                              className="text-xs font-semibold text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[1.15fr_1.4fr_.8fr]">
                          <div>
                            <label className={labelClass}>Income Head *</label>
                            <select
                              name="ledgerHeadId"
                              value={row.headId}
                              onChange={(event) =>
                                updateRow(row.key, {
                                  headId: Number(event.target.value),
                                })
                              }
                              required
                              className={fieldClass}
                            >
                              <option value="">-- select income head --</option>
                              {incomeHeads.map((head) => (
                                <option key={head.id} value={head.id}>
                                  {head.nameHindi ?? head.name} [{head.code}] / {head.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>Credit Deposit To *</label>
                            <input
                              type="hidden"
                              name="destination"
                              value={row.destination}
                            />
                            <div className="grid grid-cols-2 rounded-lg border border-slate-300 bg-slate-100 p-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateRow(row.key, { destination: "cash" })
                                }
                                className={`rounded-md px-3 py-2 text-sm font-bold transition ${
                                  row.destination === "cash"
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                💵 Cash
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateRow(row.key, { destination: "bank" })
                                }
                                className={`rounded-md px-3 py-2 text-sm font-bold transition ${
                                  row.destination === "bank"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                🏦 Bank Deposit
                              </button>
                            </div>
                            {row.destination === "bank" ? (
                              <select
                                name="bankAccountId"
                                value={row.bankId}
                                onChange={(event) =>
                                  updateRow(row.key, {
                                    bankId: Number(event.target.value),
                                  })
                                }
                                required
                                className={fieldClass + " mt-2"}
                              >
                                <option value="">-- select bank account --</option>
                                {banks.map((bank) => (
                                  <option key={bank.id} value={bank.id}>
                                    {bank.bankName} ····{bank.accountNumber.slice(-4)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input type="hidden" name="bankAccountId" value="" />
                            )}
                          </div>

                          <div>
                            <label className={labelClass}>Amount (₹) *</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              name="amount"
                              value={row.amount}
                              onChange={(event) =>
                                updateRow(row.key, { amount: event.target.value })
                              }
                              placeholder="0.00"
                              required
                              className={fieldClass + " text-lg font-bold"}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-emerald-200 pt-5">
                  <button
                    type="button"
                    onClick={() => addCreditRow()}
                    className="rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    ⊕ Add Another Income Head
                  </button>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Total 7R Amount
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-700">
                      {inr(receiptTotal)}
                    </p>
                  </div>
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Name of Depositor / जमाकर्ता *
                  </label>
                  <input
                    name="partyName"
                    list="cashbook-party-directory"
                    placeholder="e.g. M/s Mahaveer Traders"
                    required
                    className={fieldClass}
                  />
                  <p className="mt-1 text-xs font-medium text-blue-600">
                    ♙ Party Directory suggestions enabled
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Mode of Entry</label>
                  <select
                    name="sourceMode"
                    value={sourceMode}
                    onChange={(event) => setSourceMode(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="cash">Cash (Direct Physical Cash)</option>
                    <option value="bank">Bank Transfer / RTGS / NEFT</option>
                    <option value="cheque">Cheque Receipt</option>
                  </select>
                </div>
              </div>

              {sourceMode === "cheque" && (
                <div>
                  <label className={labelClass}>Cheque Number</label>
                  <input name="chequeNo" className={fieldClass} />
                </div>
              )}

              <div>
                <label className={labelClass}>
                  Narration / Particulars (विवरण)
                </label>
                <textarea
                  name="particulars"
                  rows={3}
                  placeholder="Details of transaction / particulars (optional)…"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button className="rounded-lg bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">
                Save Credit Entry
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {open === "debit" && (
        <ModalShell
          title="Record Bank Payment (− Debit Entry)"
          tone="debit"
          onClose={() => setOpen(null)}
        >
          <form action={addCashbookPayment}>
            <input type="hidden" name="returnFinancialYear" value={financialYear} />
            <div className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Date / दिनांक</label>
                  <input
                    type="date"
                    name="entryDate"
                    defaultValue={defaultDate}
                    required
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Voucher No.</label>
                  <input
                    name="voucherNo"
                    defaultValue={paymentReference}
                    required
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Select Expense Head *</label>
                <select name="ledgerHeadId" required className={fieldClass}>
                  <option value="">-- select expense head --</option>
                  {expenseHeads.map((head) => (
                    <option key={head.id} value={head.id}>
                      {head.nameHindi ?? head.name} [{head.code}] / {head.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Name of Payee / Party *</label>
                  <input
                    name="partyName"
                    list="cashbook-party-directory"
                    placeholder="e.g. Office Supplier"
                    required
                    className={fieldClass}
                  />
                  <p className="mt-1 text-xs font-medium text-blue-600">
                    ♙ Party Directory suggestions enabled
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Mode of Entry</label>
                  <select
                    name="mode"
                    value={paymentMode}
                    onChange={(event) => setPaymentMode(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="bank">Bank RTGS / NEFT / Transfer</option>
                    <option value="cheque">Bank Cheque</option>
                    <option value="cash">Cash Payment</option>
                  </select>
                </div>
              </div>

              {paymentMode !== "cash" && (
                <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                  <h3 className="text-sm font-bold text-slate-700">
                    Selected Payment / Debit Bank Account
                  </h3>
                  <select
                    name="bankAccountId"
                    required
                    className={fieldClass + " mt-3"}
                  >
                    <option value="">-- select committee bank account --</option>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName} — {bank.branch} — A/C ····
                        {bank.accountNumber.slice(-4)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-blue-700">
                    ℹ वह Committee Bank Account चुनें जिससे राशि debit हुई है।
                  </p>
                </section>
              )}

              {paymentMode === "cash" && (
                <input type="hidden" name="bankAccountId" value="" />
              )}

              {paymentMode === "cheque" && (
                <div>
                  <label className={labelClass}>Cheque Number *</label>
                  <input name="chequeNo" required className={fieldClass} />
                </div>
              )}

              <div>
                <label className={labelClass}>Amount (₹) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  name="amount"
                  placeholder="0.00"
                  required
                  className={fieldClass + " text-xl font-bold"}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Narration / Particulars (विवरण)
                </label>
                <textarea
                  name="particulars"
                  rows={3}
                  placeholder="Details of transaction / particulars (optional)…"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button className="rounded-lg bg-red-600 px-8 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700">
                Save Debit Entry
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      <PartySuggestions parties={parties} />
    </>
  );
}
