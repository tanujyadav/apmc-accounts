import PinProtectedForm from "@/components/PinProtectedForm";
import { db } from "@/db";
import {
  bankAccounts,
  cashbookEntries,
  cashbookOpeningBalances,
  cashDepositAllocations,
  cashDeposits,
  ledgerHeads,
  parties,
} from "@/db/schema";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import CashbookEntryForms from "@/components/CashbookEntryForms";
import { Card, PageHeader, StatCard, inputCls, labelCls, btnCls } from "@/components/ui";
import { deleteCashbookEntry } from "@/lib/actions";
import { currentFY, fmtDate, inr, num, todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

const thClass =
  "whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600";

export default async function CashbookPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; from?: string; to?: string }>;
}) {
  const { fy, from, to } = await searchParams;
  const selectedFY = fy || currentFY();
  const parsedStartYear = Number(selectedFY.slice(0, 4));
  const startYear = Number.isFinite(parsedStartYear)
    ? parsedStartYear
    : Number(currentFY().slice(0, 4));
  const periodStart = `${startYear}-04-01`;
  const periodEnd = `${startYear + 1}-03-31`;

  const [
    allEntries,
    heads,
    banks,
    partyRows,
    openingRows,
    depositRows,
    depositAllocations,
  ] = await Promise.all([
    db
      .select()
      .from(cashbookEntries)
      .where(
        and(
          gte(cashbookEntries.entryDate, periodStart),
          lte(cashbookEntries.entryDate, periodEnd),
        ),
      )
      .orderBy(desc(cashbookEntries.entryDate), desc(cashbookEntries.id)),
    db.select().from(ledgerHeads).orderBy(asc(ledgerHeads.type), asc(ledgerHeads.code)),
    db.select().from(bankAccounts).orderBy(asc(bankAccounts.bankName)),
    db.select().from(parties).orderBy(asc(parties.name)),
    db
      .select()
      .from(cashbookOpeningBalances)
      .where(eq(cashbookOpeningBalances.financialYear, selectedFY))
      .limit(1),
    db.select().from(cashDeposits),
    db.select().from(cashDepositAllocations),
  ]);
  const openingBalance = openingRows[0];
  const openingDate = openingBalance?.openingDate || periodStart;
  const accountingStart = openingDate > periodStart ? openingDate : periodStart;
  const validFrom = /^\d{4}-\d{2}-\d{2}$/.test(from ?? "") ? from! : null;
  const validTo = /^\d{4}-\d{2}-\d{2}$/.test(to ?? "") ? to! : null;
  const hasDateFilter = Boolean(validFrom || validTo);
  const requestedRangeStart = validFrom ?? accountingStart;
  const requestedRangeEnd = validTo ?? periodEnd;
  const clampedRangeStart =
    requestedRangeStart < accountingStart
      ? accountingStart
      : requestedRangeStart > periodEnd
        ? periodEnd
        : requestedRangeStart;
  const clampedRangeEnd =
    requestedRangeEnd > periodEnd
      ? periodEnd
      : requestedRangeEnd < accountingStart
        ? accountingStart
        : requestedRangeEnd;
  const invalidDateRange = clampedRangeStart > clampedRangeEnd;
  const rangeStart = invalidDateRange ? accountingStart : clampedRangeStart;
  const rangeEnd = invalidDateRange ? periodEnd : clampedRangeEnd;
  const accountingEntries = allEntries.filter(
    (entry) => entry.entryDate >= accountingStart,
  );
  const carryForwardEntries = hasDateFilter
    ? accountingEntries.filter((entry) => entry.entryDate < rangeStart)
    : [];
  const entries = accountingEntries.filter(
    (entry) => entry.entryDate >= rangeStart && entry.entryDate <= rangeEnd,
  );

  const headMap = new Map(heads.map((head) => [head.id, head]));
  const bankMap = new Map(banks.map((bank) => [bank.id, bank]));
  const depositMap = new Map(depositRows.map((deposit) => [deposit.id, deposit]));
  const allocationsByReceipt = new Map<number, typeof depositAllocations>();
  const allocationsByOpening = new Map<number, typeof depositAllocations>();
  for (const allocation of depositAllocations) {
    if (allocation.cashbookEntryId !== null) {
      const list = allocationsByReceipt.get(allocation.cashbookEntryId) ?? [];
      list.push(allocation);
      allocationsByReceipt.set(allocation.cashbookEntryId, list);
    }
    if (allocation.cashbookOpeningBalanceId !== null) {
      const list =
        allocationsByOpening.get(allocation.cashbookOpeningBalanceId) ?? [];
      list.push(allocation);
      allocationsByOpening.set(allocation.cashbookOpeningBalanceId, list);
    }
  }
  const openingAllocations = openingBalance
    ? allocationsByOpening.get(openingBalance.id) ?? []
    : [];
  const accountingDeposits = depositRows.filter(
    (deposit) =>
      deposit.depositDate >= accountingStart &&
      deposit.depositDate <= periodEnd,
  );
  const carryForwardDeposits = hasDateFilter
    ? accountingDeposits.filter((deposit) => deposit.depositDate < rangeStart)
    : [];
  const applicableDeposits = accountingDeposits.filter(
    (deposit) =>
      deposit.depositDate >= rangeStart && deposit.depositDate <= rangeEnd,
  );
  const cashDepositedToBank = applicableDeposits.reduce(
    (sum, deposit) => sum + num(deposit.amount),
    0,
  );
  const incomeHeads = heads.filter((head) => head.type === "income");
  const directDebitCodes = new Set(["EXP-35", "EXP-36"]);
  const expenseHeads = heads.filter(
    (head) => head.type === "expense" && directDebitCodes.has(head.code),
  );

  const directCash = entries
    .filter((entry) => entry.entryType === "receipt" && entry.mode === "cash")
    .reduce((sum, entry) => sum + num(entry.amount), 0);
  const directBank = entries
    .filter((entry) => entry.entryType === "receipt" && entry.mode !== "cash")
    .reduce((sum, entry) => sum + num(entry.amount), 0);
  const cashPayments = entries
    .filter((entry) => entry.entryType === "payment" && entry.mode === "cash")
    .reduce((sum, entry) => sum + num(entry.amount), 0);
  const bankPayments = entries
    .filter((entry) => entry.entryType === "payment" && entry.mode !== "cash")
    .reduce((sum, entry) => sum + num(entry.amount), 0);
  const debitPayments = cashPayments + bankPayments;
  const totalCredit = directCash + directBank;
  const carryCashReceipts = carryForwardEntries
    .filter((entry) => entry.entryType === "receipt" && entry.mode === "cash")
    .reduce((sum, entry) => sum + num(entry.amount), 0);
  const carryBankReceipts = carryForwardEntries
    .filter((entry) => entry.entryType === "receipt" && entry.mode !== "cash")
    .reduce((sum, entry) => sum + num(entry.amount), 0);
  const carryCashPayments = carryForwardEntries
    .filter((entry) => entry.entryType === "payment" && entry.mode === "cash")
    .reduce((sum, entry) => sum + num(entry.amount), 0);
  const carryBankPayments = carryForwardEntries
    .filter((entry) => entry.entryType === "payment" && entry.mode !== "cash")
    .reduce((sum, entry) => sum + num(entry.amount), 0);
  const carryCashDeposits = carryForwardDeposits.reduce(
    (sum, deposit) => sum + num(deposit.amount),
    0,
  );
  const openingCash =
    num(openingBalance?.openingCash) +
    carryCashReceipts -
    carryCashPayments -
    carryCashDeposits;
  const openingBank =
    num(openingBalance?.openingBank) +
    carryBankReceipts -
    carryBankPayments +
    carryCashDeposits;
  const closingCash =
    openingCash + directCash - cashPayments - cashDepositedToBank;
  const closingBank =
    openingBank + directBank + cashDepositedToBank - bankPayments;
  const combinedOpening = openingCash + openingBank;
  const combinedClosing = closingCash + closingBank;

  const year = new Date().getFullYear();
  const receiptCount =
    accountingEntries.filter((entry) => entry.entryType === "receipt").length + 1;
  const paymentCount =
    accountingEntries.filter((entry) => entry.entryType === "payment").length + 1;
  const receiptReference = `7R-${year}-${String(receiptCount).padStart(3, "0")}`;
  const paymentReference = `VCH-PAY-${String(paymentCount).padStart(4, "0")}`;
  const defaultEntryDate =
    selectedFY === currentFY() ? todayISO() : periodStart;
  const fyOptions = Array.from({ length: 12 }, (_, index) => {
    const optionStart = startYear - 9 + index;
    return `${optionStart}-${String(optionStart + 1).slice(-2)}`;
  });

  return (
    <div>
      <PageHeader
        title="Cashbook Register"
        hindi="रोकड़बही"
        subtitle={`Daily credit, debit and balance register · FY ${selectedFY}${
          hasDateFilter
            ? ` · ${fmtDate(rangeStart)} to ${fmtDate(rangeEnd)}`
            : ""
        }`}
      />

      <form
        method="get"
        className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="min-w-64 flex-1 sm:max-w-sm">
          <label className={labelCls}>
            Financial Year / वित्तीय वर्ष चुनें
          </label>
          <select
            name="fy"
            defaultValue={selectedFY}
            className={inputCls}
            aria-label="Choose financial year"
          >
            {fyOptions.map((option) => (
              <option key={option} value={option}>
                Financial Year {option}
                {option === currentFY() ? " (Current)" : ""}
              </option>
            ))}
          </select>
        </div>
        <button className={btnCls}>View Financial Year</button>
        <span className="pb-2 text-xs text-slate-500">
          Showing records from {fmtDate(periodStart)} to {fmtDate(periodEnd)}
        </span>
      </form>

      <form
        method="get"
        className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm"
      >
        <input type="hidden" name="fy" value={selectedFY} />
        <div>
          <label className={labelCls}>From Date / दिनांक से</label>
          <input
            type="date"
            name="from"
            min={accountingStart}
            max={periodEnd}
            defaultValue={validFrom ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>To Date / दिनांक तक</label>
          <input
            type="date"
            name="to"
            min={accountingStart}
            max={periodEnd}
            defaultValue={validTo ?? ""}
            className={inputCls}
          />
        </div>
        <button className={btnCls}>Apply Date Filter</button>
        {hasDateFilter && (
          <a
            href={`/cashbook?fy=${encodeURIComponent(selectedFY)}`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear Filter
          </a>
        )}
        <span className="pb-2 text-xs text-slate-500">
          {hasDateFilter
            ? `Showing ${fmtDate(rangeStart)} to ${fmtDate(rangeEnd)}`
            : "No date filter applied"}
        </span>
      </form>

      {invalidDateRange && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          From Date, To Date से बाद की नहीं हो सकती। अभी पूरा Financial Year दिखाया जा रहा है।
        </div>
      )}

      {!openingBalance && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Initial Opening Balance अभी set नहीं है। First-time setup केवल Profile & Settings module में उपलब्ध है।
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={
            hasDateFilter
              ? "Balance B/F / आगे लाया शेष"
              : "Opening Total / प्रारम्भिक शेष"
          }
          value={inr(combinedOpening)}
          icon="🔓"
          accent="amber"
        />
        <StatCard
          label="Closing Cash / अंतिम रोकड़"
          value={inr(closingCash)}
          icon="💵"
          accent="emerald"
        />
        <StatCard
          label="Closing Bank / अंतिम बैंक शेष"
          value={inr(closingBank)}
          icon="🏦"
          accent="blue"
        />
        <StatCard
          label="Combined Closing / कुल अंतिम शेष"
          value={inr(combinedClosing)}
          icon="⚖️"
          accent={combinedClosing >= 0 ? "emerald" : "red"}
        />
      </div>

      <div className="mt-6">
        <Card title="New Cashbook Entry / नई रोकड़बही प्रविष्टि">
          <CashbookEntryForms
            incomeHeads={incomeHeads.map((head) => ({
              id: head.id,
              code: head.code,
              name: head.name,
              nameHindi: head.nameHindi,
            }))}
            expenseHeads={expenseHeads.map((head) => ({
              id: head.id,
              code: head.code,
              name: head.name,
              nameHindi: head.nameHindi,
            }))}
            banks={banks.map((bank) => ({
              id: bank.id,
              bankName: bank.bankName,
              branch: bank.branch,
              accountNumber: bank.accountNumber,
            }))}
            parties={partyRows.map((party) => ({
              id: party.id,
              name: party.name,
              nameHindi: party.nameHindi,
            }))}
            defaultDate={defaultEntryDate}
            financialYear={selectedFY}
            returnFrom={hasDateFilter && !invalidDateRange ? validFrom ?? undefined : undefined}
            returnTo={hasDateFilter && !invalidDateRange ? validTo ?? undefined : undefined}
            receiptReference={receiptReference}
            paymentReference={paymentReference}
          />
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`Cashbook Register / रोकड़बही (${entries.length} entries)`}>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[1450px] border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>
                    Date<br />
                    <span className="normal-case">(दिनांक)</span>
                  </th>
                  <th className={thClass}>Voucher / 7R</th>
                  <th className={thClass}>Type (प्रकार)</th>
                  <th className={thClass}>
                    Account Head<br />
                    <span className="normal-case">(लेखा मद)</span>
                  </th>
                  <th className={thClass}>
                    Party / Payee<br />
                    <span className="normal-case">(पार्टी)</span>
                  </th>
                  <th className={thClass}>Particulars / विवरण</th>
                  <th className={`${thClass} bg-emerald-50 text-right text-emerald-700`}>
                    Direct Cash (₹)
                  </th>
                  <th className={`${thClass} bg-blue-50 text-right text-blue-700`}>
                    Direct Bank (₹)
                  </th>
                  <th className={`${thClass} bg-red-50 text-right text-red-700`}>
                    Debit Payment (₹)
                  </th>
                  <th className={`${thClass} border-r-0 text-center`}>Action</th>
                </tr>
              </thead>

              <tbody className="bg-white">
                <tr className="border-b-2 border-amber-200 bg-amber-50/70 text-sm text-slate-800">
                  <td className="whitespace-nowrap border-r border-amber-100 px-3 py-4 font-mono font-bold text-amber-800">
                    {fmtDate(hasDateFilter ? rangeStart : openingDate)}
                  </td>
                  <td className="border-r border-amber-100 px-3 py-4 font-mono font-bold text-amber-800">
                    {hasDateFilter ? "B/F" : "OB"}
                  </td>
                  <td className="border-r border-amber-100 px-3 py-4">
                    <span className="inline-flex rounded-lg border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-bold tracking-wide text-amber-800">
                      {hasDateFilter ? "B/F" : "OPENING"}
                    </span>
                  </td>
                  <td className="min-w-56 border-r border-amber-100 px-3 py-4">
                    <span className="font-bold text-slate-900">
                      {hasDateFilter ? "आगे लाया शेष" : "प्रारम्भिक शेष"}
                    </span>
                    <br />
                    <span className="text-xs font-semibold text-slate-500">
                      {hasDateFilter ? "Balance Brought Forward" : "Opening Balance"}
                    </span>
                  </td>
                  <td className="min-w-44 border-r border-amber-100 px-3 py-4 font-semibold text-slate-600">
                    Cash & Bank
                  </td>
                  <td className="min-w-64 border-r border-amber-100 px-3 py-4">
                    <span className="font-semibold text-slate-700">
                      {hasDateFilter
                        ? `Balance B/F before ${fmtDate(rangeStart)}`
                        : openingBalance?.remarks || "Opening Balance b/f"}
                    </span>
                    <br />
                    <span className="text-xs text-slate-500">
                      FY {selectedFY}
                      {hasDateFilter
                        ? ` · Filtered through ${fmtDate(rangeEnd)}`
                        : ""}
                    </span>
                    {!hasDateFilter && openingAllocations.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {openingAllocations.map((allocation) => {
                          const deposit = depositMap.get(allocation.cashDepositId);
                          const depositBank = deposit
                            ? bankMap.get(deposit.bankAccountId)
                            : null;
                          return (
                            <p
                              key={allocation.id}
                              className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800"
                            >
                              🏦 Opening Cash deposited on {fmtDate(deposit?.depositDate)} · Slip {deposit?.slipNo ?? "-"} · {depositBank?.bankName ?? "Bank"} · {inr(allocation.allocatedAmount)}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="border-r border-emerald-100 bg-emerald-50 px-3 py-4 text-right font-bold tabular-nums text-emerald-800">
                    {inr(openingCash)}
                  </td>
                  <td className="border-r border-blue-100 bg-blue-50 px-3 py-4 text-right font-bold tabular-nums text-blue-800">
                    {inr(openingBank)}
                  </td>
                  <td className="border-r border-red-100 bg-red-50/40 px-3 py-4 text-center font-semibold text-slate-400">
                    —
                  </td>
                  <td className="px-3 py-4 text-center">
                    <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                      {hasDateFilter ? "Period B/F" : "Initial Setup"}
                    </span>
                  </td>
                </tr>

                {entries.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-14 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl">
                        📒
                      </div>
                      <p className="mt-3 font-semibold text-slate-600">
                        No receipt or payment entries yet
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        ऊपर Record Receipt या Record Payment से पहली entry जोड़ें।
                      </p>
                    </td>
                  </tr>
                )}

                {entries.map((entry) => {
                  const head = headMap.get(entry.ledgerHeadId);
                  const bank = entry.bankAccountId
                    ? bankMap.get(entry.bankAccountId)
                    : null;
                  const isReceipt = entry.entryType === "receipt";
                  const isDirectCash = isReceipt && entry.mode === "cash";
                  const isDirectBank = isReceipt && entry.mode !== "cash";
                  const receiptAllocations = allocationsByReceipt.get(entry.id) ?? [];

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 text-sm text-slate-700 transition last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap border-r border-slate-100 px-3 py-3 font-medium">
                        {fmtDate(entry.entryDate)}
                      </td>
                      <td className="whitespace-nowrap border-r border-slate-100 px-3 py-3 font-mono text-xs font-bold text-slate-800">
                        {entry.voucherNo}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isReceipt
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {isReceipt ? "+ Credit / जमा" : "− Debit / भुगतान"}
                        </span>
                      </td>
                      <td className="min-w-56 border-r border-slate-100 px-3 py-3">
                        <span className="font-semibold text-slate-900">
                          {head?.nameHindi ?? head?.name ?? "-"}
                        </span>
                        <br />
                        <span className="text-xs text-slate-500">
                          [{head?.code ?? "-"}] {head?.name}
                        </span>
                      </td>
                      <td className="min-w-44 border-r border-slate-100 px-3 py-3 font-medium text-slate-800">
                        {entry.partyName || "-"}
                      </td>
                      <td className="min-w-64 border-r border-slate-100 px-3 py-3">
                        <p className="max-w-72 whitespace-normal">{entry.particulars}</p>
                        <p className="mt-1 text-xs capitalize text-slate-400">
                          {entry.mode}
                          {bank
                            ? ` · ${bank.bankName} A/C ····${bank.accountNumber.slice(-4)}`
                            : ""}
                          {entry.chequeNo ? ` · Chq ${entry.chequeNo}` : ""}
                        </p>
                        {receiptAllocations.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {receiptAllocations.map((allocation) => {
                              const deposit = depositMap.get(allocation.cashDepositId);
                              const depositBank = deposit
                                ? bankMap.get(deposit.bankAccountId)
                                : null;
                              return (
                                <p
                                  key={allocation.id}
                                  className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800"
                                >
                                  🏦 Cash deposited on {fmtDate(deposit?.depositDate)} · Slip {deposit?.slipNo ?? "-"} · {depositBank?.bankName ?? "Bank"} · {inr(allocation.allocatedAmount)}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="border-r border-emerald-100 bg-emerald-50/40 px-3 py-3 text-right font-semibold tabular-nums text-emerald-700">
                        {isDirectCash ? inr(entry.amount) : "—"}
                      </td>
                      <td className="border-r border-blue-100 bg-blue-50/40 px-3 py-3 text-right font-semibold tabular-nums text-blue-700">
                        {isDirectBank ? inr(entry.amount) : "—"}
                      </td>
                      <td className="border-r border-red-100 bg-red-50/40 px-3 py-3 text-right font-semibold tabular-nums text-red-700">
                        {!isReceipt ? inr(entry.amount) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-3">
                          <a
                            href={`/cashbook/voucher/${entry.id}`}
                            className="whitespace-nowrap text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                            title="Print voucher"
                          >
                            🖨️ Print
                          </a>
                          <PinProtectedForm action={deleteCashbookEntry}>
                            <input type="hidden" name="id" value={entry.id} />
                            <button
                              className="text-xs font-semibold text-red-500 hover:text-red-700"
                              title="Delete entry"
                            >
                              Delete
                            </button>
                          </PinProtectedForm>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 text-sm font-bold text-slate-800">
                  <td colSpan={6} className="px-3 py-3 text-right uppercase tracking-wide">
                    Receipts / कुल प्राप्तियां
                  </td>
                  <td className="border-l border-emerald-100 bg-emerald-50 px-3 py-3 text-right tabular-nums text-emerald-800">
                    + {inr(directCash)}
                  </td>
                  <td className="border-l border-blue-100 bg-blue-50 px-3 py-3 text-right tabular-nums text-blue-800">
                    + {inr(directBank)}
                  </td>
                  <td className="border-l border-red-100 bg-red-50/50 px-3 py-3 text-center text-slate-400">
                    —
                  </td>
                  <td className="border-l border-slate-200 px-3 py-3 text-center text-xs text-slate-500">
                    FY {selectedFY}
                  </td>
                </tr>
                <tr className="border-t border-slate-200 bg-slate-50 text-sm font-bold text-slate-800">
                  <td colSpan={6} className="px-3 py-3 text-right uppercase tracking-wide">
                    Payments / कुल भुगतान
                  </td>
                  <td className="border-l border-emerald-100 bg-emerald-50 px-3 py-3 text-right tabular-nums text-red-700">
                    − {inr(cashPayments)}
                  </td>
                  <td className="border-l border-blue-100 bg-blue-50 px-3 py-3 text-right tabular-nums text-red-700">
                    − {inr(bankPayments)}
                  </td>
                  <td className="border-l border-red-100 bg-red-50 px-3 py-3 text-right tabular-nums text-red-800">
                    {inr(debitPayments)}
                  </td>
                  <td className="border-l border-slate-200 px-3 py-3 text-center text-xs text-slate-500">
                    {entries.length} entries
                  </td>
                </tr>
                <tr className="border-t border-blue-200 bg-blue-50/50 text-sm font-bold text-slate-800">
                  <td colSpan={6} className="px-3 py-3 text-right uppercase tracking-wide text-blue-800">
                    Cash Deposited into Bank / बैंक में नकद जमा
                  </td>
                  <td className="border-l border-emerald-100 bg-emerald-50 px-3 py-3 text-right tabular-nums text-red-700">
                    − {inr(cashDepositedToBank)}
                  </td>
                  <td className="border-l border-blue-100 bg-blue-100/70 px-3 py-3 text-right tabular-nums text-blue-800">
                    + {inr(cashDepositedToBank)}
                  </td>
                  <td className="border-l border-red-100 bg-red-50/40 px-3 py-3 text-center text-slate-400">
                    Transfer
                  </td>
                  <td className="border-l border-slate-200 px-3 py-3 text-center text-xs text-blue-700">
                    {applicableDeposits.length} deposits
                  </td>
                </tr>
                <tr className="border-t-2 border-slate-400 bg-slate-100 text-sm font-bold text-slate-900">
                  <td colSpan={6} className="px-3 py-4 text-right uppercase tracking-wide">
                    Closing Balance / अंतिम शेष
                  </td>
                  <td className={`border-l border-emerald-200 bg-emerald-100 px-3 py-4 text-right text-base tabular-nums ${closingCash >= 0 ? "text-emerald-900" : "text-red-700"}`}>
                    {inr(closingCash)}
                  </td>
                  <td className={`border-l border-blue-200 bg-blue-100 px-3 py-4 text-right text-base tabular-nums ${closingBank >= 0 ? "text-blue-900" : "text-red-700"}`}>
                    {inr(closingBank)}
                  </td>
                  <td className="border-l border-red-100 bg-red-50/50 px-3 py-4 text-center text-slate-400">
                    —
                  </td>
                  <td className="border-l border-slate-200 px-3 py-4 text-center text-xs text-slate-600">
                    Total {inr(combinedClosing)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
