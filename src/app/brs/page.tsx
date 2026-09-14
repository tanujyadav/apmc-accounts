import Link from "next/link";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  bankAccounts,
  brsStatements,
  cashbookEntries,
  cashbookOpeningBalances,
  cashDeposits,
  cheques,
} from "@/db/schema";
import BrsStatementForm from "@/components/BrsStatementForm";
import BrsLiveSync from "@/components/BrsLiveSync";
import PinProtectedForm from "@/components/PinProtectedForm";
import {
  Badge,
  Card,
  EmptyRow,
  PageHeader,
  Td,
  Th,
  btnCls,
  inputCls,
  labelCls,
} from "@/components/ui";
import { reconcileEntry, unreconcileEntry } from "@/lib/actions";
import {
  financialYearForDate,
  fmtDate,
  inr,
  num,
  todayISO,
} from "@/lib/format";

export const dynamic = "force-dynamic";

function monthEnd(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return todayISO();
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

function monthLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

export default async function BRSPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; saved?: string }>;
}) {
  const { month, saved } = await searchParams;
  const selectedMonth = /^\d{4}-\d{2}$/.test(month ?? "")
    ? month!
    : todayISO().slice(0, 7);
  const periodStart = `${selectedMonth}-01`;
  const periodEnd = monthEnd(selectedMonth);
  const financialYear = financialYearForDate(periodStart);
  const financialYearStart = `${financialYear.slice(0, 4)}-04-01`;

  const [
    banks,
    allBankEntries,
    deposits,
    chequeRows,
    openingRows,
    statementRows,
    savedStatements,
  ] = await Promise.all([
    db.select().from(bankAccounts).orderBy(asc(bankAccounts.bankName)),
    db
      .select()
      .from(cashbookEntries)
      .where(ne(cashbookEntries.mode, "cash"))
      .orderBy(asc(cashbookEntries.entryDate), asc(cashbookEntries.id)),
    db
      .select()
      .from(cashDeposits)
      .orderBy(asc(cashDeposits.depositDate), asc(cashDeposits.id)),
    db
      .select()
      .from(cheques)
      .orderBy(asc(cheques.chequeDate), asc(cheques.id)),
    db
      .select()
      .from(cashbookOpeningBalances)
      .where(eq(cashbookOpeningBalances.financialYear, financialYear))
      .limit(1),
    db
      .select()
      .from(brsStatements)
      .where(
        and(
          isNull(brsStatements.bankAccountId),
          eq(brsStatements.statementMonth, selectedMonth),
        ),
      )
      .limit(1),
    db
      .select()
      .from(brsStatements)
      .where(isNull(brsStatements.bankAccountId))
      .orderBy(asc(brsStatements.statementMonth)),
  ]);

  const bankMap = new Map(banks.map((bank) => [bank.id, bank]));
  const opening = openingRows[0];
  const openingDate = opening?.openingDate || financialYearStart;
  const entriesToMonthEnd = allBankEntries.filter(
    (entry) => entry.entryDate >= openingDate && entry.entryDate <= periodEnd,
  );
  const depositsToMonthEnd = deposits.filter(
    (deposit) =>
      deposit.depositDate >= openingDate && deposit.depositDate <= periodEnd,
  );

  // This is the same combined Bank Column closing formula used by Cashbook.
  let cashbookBalance = num(opening?.openingBank);
  for (const entry of entriesToMonthEnd) {
    cashbookBalance +=
      (entry.entryType === "receipt" ? 1 : -1) * num(entry.amount);
  }
  cashbookBalance += depositsToMonthEnd.reduce(
    (sum, deposit) => sum + num(deposit.amount),
    0,
  );

  const notClearedByMonthEnd = (entry: (typeof allBankEntries)[number]) =>
    !entry.reconciled ||
    !entry.reconciledDate ||
    entry.reconciledDate > periodEnd;

  const unpresentedChequeRows = chequeRows.filter(
    (cheque) =>
      cheque.direction === "issued" &&
      cheque.chequeDate >= periodStart &&
      cheque.chequeDate <= periodEnd &&
      (cheque.status === "pending" ||
        (cheque.status === "cleared" &&
          Boolean(cheque.clearedDate) &&
          cheque.clearedDate! > periodEnd)),
  );
  const unclearedDepositRows = entriesToMonthEnd.filter(
    (entry) =>
      entry.entryType === "receipt" &&
      entry.mode === "cheque" &&
      notClearedByMonthEnd(entry),
  );
  const unpresentedCheques = unpresentedChequeRows.reduce(
    (sum, cheque) => sum + num(cheque.amount),
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
  const pending = entriesToMonthEnd.filter(notClearedByMonthEnd);
  const cleared = entriesToMonthEnd.filter(
    (entry) =>
      entry.reconciled &&
      entry.reconciledDate !== null &&
      entry.reconciledDate <= periodEnd,
  );

  return (
    <div>
      <PageHeader
        title="Combined Bank Reconciliation Statement (BRS)"
        hindi="संयुक्त बैंक समाधान विवरण"
        subtitle="All APMC bank accounts combined; Cashbook bank closing and pending cheques sync automatically"
      />

      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="min-w-64">
          <label className={labelCls}>Statement Month / विवरण माह</label>
          <input
            type="month"
            name="month"
            defaultValue={selectedMonth}
            required
            className={inputCls}
          />
        </div>
        <button className={btnCls}>View Combined BRS</button>
        <span className="pb-2 text-xs text-slate-500">
          FY {financialYear} · As on {fmtDate(periodEnd)}
        </span>
      </form>

      {saved === "1" && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✓ {monthLabel(selectedMonth)} का Combined BRS save हो गया है।
        </div>
      )}

      {banks.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            BRS बनाने के लिए पहले{" "}
            <Link href="/bank-accounts" className="font-semibold text-emerald-700 underline">
              Bank Accounts
            </Link>{" "}
            में account जोड़ें।
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-blue-900">
                  All APMC Bank Accounts — Combined ({banks.length})
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  Row 1 = Cashbook Closing Balance of combined Bank Column. Row 2(अ) = all pending issued cheques from Cheque Register.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <BrsLiveSync />
                {statement && (
                  <Link
                    href={`/brs/print?month=${selectedMonth}`}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-700"
                  >
                    🖨️ Print / Save PDF
                  </Link>
                )}
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase text-blue-700">Difference</p>
                  <p className={`text-lg font-bold ${Math.abs(difference) < 0.01 ? "text-emerald-700" : "text-red-700"}`}>
                    {inr(difference)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {banks.map((bank) => (
                <span
                  key={bank.id}
                  className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800"
                >
                  {bank.bankName} ····{bank.accountNumber.slice(-4)}
                </span>
              ))}
            </div>
          </div>

          <BrsStatementForm
            key={`combined-${selectedMonth}`}
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
            <Card title={`Pending Issued Cheques · Row 2(अ) (${unpresentedChequeRows.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px]">
                  <thead>
                    <tr>
                      <Th>Cheque / Date</Th>
                      <Th>Bank</Th>
                      <Th>Party</Th>
                      <Th>Status</Th>
                      <Th right>Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpresentedChequeRows.length === 0 && (
                      <EmptyRow colSpan={5} message="इस माह कोई pending issued cheque नहीं है।" />
                    )}
                    {unpresentedChequeRows.map((cheque) => (
                      <tr key={cheque.id} className="hover:bg-slate-50">
                        <Td>
                          <span className="font-semibold">{cheque.chequeNo}</span>
                          <br /><span className="text-xs text-slate-500">{fmtDate(cheque.chequeDate)}</span>
                        </Td>
                        <Td>{bankMap.get(cheque.bankAccountId)?.bankName ?? "-"}</Td>
                        <Td>{cheque.partyName}</Td>
                        <Td><Badge color="amber">Pending</Badge></Td>
                        <Td right className="font-bold text-amber-700">{inr(cheque.amount)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title={`Saved Combined Monthly BRS (${savedStatements.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px]">
                  <thead>
                    <tr>
                      <Th>Month</Th>
                      <Th right>Saved Bank Closing</Th>
                      <Th right>Difference</Th>
                      <Th>Print</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedStatements.length === 0 && (
                      <EmptyRow colSpan={4} message="अभी कोई Combined BRS save नहीं है।" />
                    )}
                    {[...savedStatements].reverse().map((savedStatement) => (
                      <tr key={savedStatement.id} className="hover:bg-slate-50">
                        <Td>
                          <Link
                            href={`/brs?month=${savedStatement.statementMonth}`}
                            className="font-semibold text-blue-700 hover:underline"
                          >
                            {monthLabel(savedStatement.statementMonth)}
                          </Link>
                        </Td>
                        <Td right className="font-semibold">{inr(savedStatement.cashbookBalanceSnapshot)}</Td>
                        <Td right className={Math.abs(num(savedStatement.differenceSnapshot)) < 0.01 ? "font-bold text-emerald-700" : "font-bold text-red-700"}>
                          {inr(savedStatement.differenceSnapshot)}
                        </Td>
                        <Td>
                          <Link
                            href={`/brs/print?month=${savedStatement.statementMonth}`}
                            className="whitespace-nowrap text-xs font-semibold text-emerald-700"
                          >
                            🖨️ PDF / Print
                          </Link>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card title={`Unreconciled Combined Bank Items (${pending.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr>
                      <Th>Date</Th><Th>Bank</Th><Th>Voucher / Particulars</Th>
                      <Th>Type</Th><Th right>Amount</Th><Th>Clear On</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.length === 0 && <EmptyRow colSpan={6} message="All bank entries reconciled ✓" />}
                    {pending.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <Td>{fmtDate(entry.entryDate)}</Td>
                        <Td>{entry.bankAccountId ? bankMap.get(entry.bankAccountId)?.bankName ?? "-" : "-"}</Td>
                        <Td className="max-w-60 whitespace-normal"><b>{entry.voucherNo}</b> · {entry.particulars}</Td>
                        <Td><Badge color={entry.entryType === "receipt" ? "green" : "red"}>{entry.entryType} · {entry.mode}</Badge></Td>
                        <Td right className="font-semibold">{inr(entry.amount)}</Td>
                        <Td>
                          <PinProtectedForm action={reconcileEntry} className="flex min-w-48 gap-1">
                            <input type="hidden" name="id" value={entry.id} />
                            <input type="date" name="reconciledDate" min={entry.entryDate} defaultValue={todayISO()} required className="min-w-0 rounded border border-slate-300 px-2 py-1 text-xs" />
                            <button className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">Clear</button>
                          </PinProtectedForm>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title={`Reconciled Combined Bank Items (${cleared.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr><Th>Date</Th><Th>Bank</Th><Th>Voucher / Particulars</Th><Th>Cleared On</Th><Th right>Amount</Th><Th>Action</Th></tr>
                  </thead>
                  <tbody>
                    {cleared.length === 0 && <EmptyRow colSpan={6} message="Nothing reconciled for this month." />}
                    {cleared.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <Td>{fmtDate(entry.entryDate)}</Td>
                        <Td>{entry.bankAccountId ? bankMap.get(entry.bankAccountId)?.bankName ?? "-" : "-"}</Td>
                        <Td className="max-w-60 whitespace-normal"><b>{entry.voucherNo}</b> · {entry.particulars}</Td>
                        <Td>{fmtDate(entry.reconciledDate)}</Td>
                        <Td right className="font-semibold">{inr(entry.amount)}</Td>
                        <Td>
                          <PinProtectedForm action={unreconcileEntry}>
                            <input type="hidden" name="id" value={entry.id} />
                            <button className="text-xs font-semibold text-amber-700">Undo</button>
                          </PinProtectedForm>
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
