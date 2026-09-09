import Link from "next/link";
import { db } from "@/db";
import {
  bankAccounts,
  brsStatements,
  cashbookEntries,
  cashDeposits,
} from "@/db/schema";
import { and, asc, eq, ne } from "drizzle-orm";
import BrsStatementForm from "@/components/BrsStatementForm";
import { Badge, Card, EmptyRow, PageHeader, Td, Th, btnCls, inputCls, labelCls } from "@/components/ui";
import { reconcileEntry, unreconcileEntry } from "@/lib/actions";
import { fmtDate, inr, num, todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

function monthEnd(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return todayISO();
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

function monthLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return month;
  const name = date.toLocaleDateString("en-IN", { month: "short" });
  return `${name}-${String(date.getFullYear()).slice(-2)}`;
}

export default async function BRSPage({
  searchParams,
}: {
  searchParams: Promise<{ bank?: string; month?: string; saved?: string }>;
}) {
  const { bank, month, saved } = await searchParams;
  const selectedMonth = month || todayISO().slice(0, 7);
  const periodStart = `${selectedMonth}-01`;
  const periodEnd = monthEnd(selectedMonth);

  const banks = await db
    .select()
    .from(bankAccounts)
    .orderBy(asc(bankAccounts.bankName));
  const selectedId = bank ? Number(bank) : banks[0]?.id;
  const selected = banks.find((item) => item.id === selectedId);

  const [allBankEntries, deposits, statementRows] = selected
    ? await Promise.all([
        db
          .select()
          .from(cashbookEntries)
          .where(
            and(
              eq(cashbookEntries.bankAccountId, selected.id),
              ne(cashbookEntries.mode, "cash"),
            ),
          )
          .orderBy(asc(cashbookEntries.entryDate), asc(cashbookEntries.id)),
        db
          .select()
          .from(cashDeposits)
          .where(eq(cashDeposits.bankAccountId, selected.id))
          .orderBy(asc(cashDeposits.depositDate), asc(cashDeposits.id)),
        db
          .select()
          .from(brsStatements)
          .where(
            and(
              eq(brsStatements.bankAccountId, selected.id),
              eq(brsStatements.statementMonth, selectedMonth),
            ),
          )
          .limit(1),
      ])
    : [[], [], []];

  const openingDate = selected?.openingBalanceDate;
  const entriesToMonthEnd = allBankEntries.filter(
    (entry) =>
      entry.entryDate <= periodEnd &&
      (!openingDate || entry.entryDate >= openingDate),
  );
  const depositsToMonthEnd = deposits.filter(
    (deposit) =>
      deposit.depositDate <= periodEnd &&
      (!openingDate || deposit.depositDate >= openingDate),
  );

  let cashbookBalance = num(selected?.openingBalance);
  for (const entry of entriesToMonthEnd) {
    const sign = entry.entryType === "receipt" ? 1 : -1;
    cashbookBalance += sign * num(entry.amount);
  }
  cashbookBalance += depositsToMonthEnd.reduce(
    (sum, deposit) => sum + num(deposit.amount),
    0,
  );

  const notClearedByMonthEnd = (entry: (typeof allBankEntries)[number]) =>
    !entry.reconciled ||
    !entry.reconciledDate ||
    entry.reconciledDate > periodEnd;

  const unpresentedChequeRows = entriesToMonthEnd.filter(
    (entry) =>
      entry.entryType === "payment" &&
      entry.mode === "cheque" &&
      entry.entryDate >= periodStart &&
      notClearedByMonthEnd(entry),
  );
  const unclearedDepositRows = entriesToMonthEnd.filter(
    (entry) =>
      entry.entryType === "receipt" &&
      entry.mode === "cheque" &&
      notClearedByMonthEnd(entry),
  );
  const unpresentedCheques = unpresentedChequeRows.reduce(
    (sum, entry) => sum + num(entry.amount),
    0,
  );
  const unclearedDeposits = unclearedDepositRows.reduce(
    (sum, entry) => sum + num(entry.amount),
    0,
  );

  const statement = statementRows[0];
  const adjustmentTotal =
    num(statement?.bankInterest) +
    num(statement?.indirectDeposits) +
    num(statement?.otherReceipts) -
    num(statement?.bankCharges) -
    num(statement?.otherExpenses);
  const calculatedBalance =
    cashbookBalance + unpresentedCheques - unclearedDeposits + adjustmentTotal;
  const difference = calculatedBalance - num(statement?.passbookBalance);

  const visibleEntries = entriesToMonthEnd.filter(
    (entry) => entry.entryDate <= periodEnd,
  );
  const pending = visibleEntries.filter(notClearedByMonthEnd);
  const cleared = visibleEntries.filter(
    (entry) =>
      entry.reconciled &&
      entry.reconciledDate !== null &&
      entry.reconciledDate <= periodEnd,
  );

  return (
    <div>
      <PageHeader
        title="Bank Reconciliation Statement (BRS)"
        hindi="बैंक समाधान विवरण"
        subtitle="Month-end reconciliation of Cashbook bank balance with actual Passbook balance"
      />

      <form
        method="get"
        className="mb-6 grid grid-cols-1 items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px_auto]"
      >
        <div>
          <label className={labelCls}>Bank Account / बैंक खाता</label>
          <select name="bank" defaultValue={selectedId ?? ""} required className={inputCls}>
            <option value="">-- select bank account --</option>
            {banks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.bankName} · {item.branch} · A/C ····{item.accountNumber.slice(-4)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Statement Month / विवरण माह</label>
          <input type="month" name="month" defaultValue={selectedMonth} required className={inputCls} />
        </div>
        <button className={btnCls}>View BRS</button>
      </form>

      {saved === "1" && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✓ {monthLabel(selectedMonth)} का BRS statement save हो गया है।
        </div>
      )}

      {!selected && (
        <Card>
          <p className="text-sm text-slate-500">
            BRS बनाने के लिए पहले{" "}
            <Link href="/bank-accounts" className="font-semibold text-emerald-700 underline">
              Bank Accounts
            </Link>{" "}
            में bank account जोड़ें।
          </p>
        </Card>
      )}

      {selected && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-blue-900">
                {selected.bankName} · {selected.branch}
              </p>
              <p className="text-xs text-blue-700">
                A/C {selected.accountNumber} · IFSC {selected.ifscCode} · Statement as on {fmtDate(periodEnd)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Current Difference</p>
              <p className={`text-lg font-bold ${Math.abs(difference) < 0.01 ? "text-emerald-700" : "text-red-700"}`}>
                {inr(difference)}
              </p>
            </div>
          </div>

          <BrsStatementForm
            key={`${selected.id}-${selectedMonth}`}
            bankAccountId={selected.id}
            statementMonth={selectedMonth}
            monthLabel={monthLabel(selectedMonth)}
            cashbookBalance={cashbookBalance}
            unpresentedCheques={unpresentedCheques}
            unpresentedCount={unpresentedChequeRows.length}
            unclearedDeposits={unclearedDeposits}
            unclearedCount={unclearedDepositRows.length}
            initialValues={{
              bankInterest: statement?.bankInterest ?? "0.00",
              indirectDeposits: statement?.indirectDeposits ?? "0.00",
              otherReceipts: statement?.otherReceipts ?? "0.00",
              bankCharges: statement?.bankCharges ?? "0.00",
              otherExpenses: statement?.otherExpenses ?? "0.00",
              passbookBalance: statement?.passbookBalance ?? "0.00",
              remarks: statement?.remarks ?? "",
            }}
          />

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card title={`Unreconciled Items as on ${fmtDate(periodEnd)} (${pending.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Voucher / Particulars</Th>
                      <Th>Type</Th>
                      <Th right>Amount</Th>
                      <Th>Clear On</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.length === 0 && (
                      <EmptyRow colSpan={5} message="All bank entries are reconciled ✓" />
                    )}
                    {pending.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <Td>{fmtDate(entry.entryDate)}</Td>
                        <Td className="max-w-60 whitespace-normal">
                          <span className="font-semibold">{entry.voucherNo}</span> · {entry.particulars}
                          {entry.chequeNo ? ` · Chq ${entry.chequeNo}` : ""}
                        </Td>
                        <Td>
                          <Badge color={entry.entryType === "receipt" ? "green" : "red"}>
                            {entry.entryType} · {entry.mode}
                          </Badge>
                        </Td>
                        <Td right className="font-semibold">{inr(entry.amount)}</Td>
                        <Td>
                          <form action={reconcileEntry} className="flex min-w-48 items-center gap-1">
                            <input type="hidden" name="id" value={entry.id} />
                            <input
                              type="date"
                              name="reconciledDate"
                              min={entry.entryDate}
                              defaultValue={todayISO()}
                              className="min-w-0 rounded border border-slate-300 px-2 py-1 text-xs"
                              required
                            />
                            <button className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                              Clear
                            </button>
                          </form>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title={`Reconciled Items (${cleared.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Voucher / Particulars</Th>
                      <Th>Cleared On</Th>
                      <Th right>Amount</Th>
                      <Th>Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {cleared.length === 0 && (
                      <EmptyRow colSpan={5} message="Nothing reconciled for this period." />
                    )}
                    {cleared.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <Td>{fmtDate(entry.entryDate)}</Td>
                        <Td className="max-w-60 whitespace-normal">
                          <span className="font-semibold">{entry.voucherNo}</span> · {entry.particulars}
                        </Td>
                        <Td>{fmtDate(entry.reconciledDate)}</Td>
                        <Td right className="font-semibold">{inr(entry.amount)}</Td>
                        <Td>
                          <form action={unreconcileEntry}>
                            <input type="hidden" name="id" value={entry.id} />
                            <button className="text-xs font-semibold text-amber-600 hover:text-amber-800">
                              Undo
                            </button>
                          </form>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
