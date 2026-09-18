import Link from "next/link";
import { and, asc, eq, gte, isNull, lte, ne } from "drizzle-orm";
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
      .where(
        and(
          ne(cashbookEntries.mode, "cash"),
          gte(cashbookEntries.entryDate, financialYearStart),
          lte(cashbookEntries.entryDate, periodEnd),
        ),
      )
      .orderBy(asc(cashbookEntries.entryDate), asc(cashbookEntries.id)),
    db
      .select()
      .from(cashDeposits)
      .where(
        and(
          gte(cashDeposits.depositDate, financialYearStart),
          lte(cashDeposits.depositDate, periodEnd),
        ),
      )
      .orderBy(asc(cashDeposits.depositDate), asc(cashDeposits.id)),
    db
      .select()
      .from(cheques)
      .where(
        and(
          gte(cheques.chequeDate, financialYearStart),
          lte(cheques.chequeDate, periodEnd),
        ),
      )
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

  const isUnclearedAtMonthEnd = (cheque: (typeof chequeRows)[number]) =>
    cheque.status === "pending" ||
    (cheque.status === "cleared" &&
      Boolean(cheque.clearedDate) &&
      cheque.clearedDate! > periodEnd);

  // BRS Row 2(अ): issued during the selected month but not cleared by month-end.
  const unpresentedChequeRows = chequeRows.filter(
    (cheque) =>
      cheque.direction === "issued" &&
      cheque.chequeDate >= periodStart &&
      cheque.chequeDate <= periodEnd &&
      isUnclearedAtMonthEnd(cheque),
  );
  // BRS Row 5(अ): received/deposited cheques still uncleared at month-end.
  const unclearedDepositRows = chequeRows.filter(
    (cheque) =>
      cheque.direction === "received" &&
      cheque.chequeDate <= periodEnd &&
      isUnclearedAtMonthEnd(cheque),
  );
  const unclearedChequeRows = [
    ...unpresentedChequeRows.map((cheque) => ({
      ...cheque,
      brsRow: "2(अ)",
      treatment: "Add / जोड़िये",
    })),
    ...unclearedDepositRows.map((cheque) => ({
      ...cheque,
      brsRow: "5(अ)",
      treatment: "Less / घटाइये",
    })),
  ].sort((a, b) => a.chequeDate.localeCompare(b.chequeDate));
  const unpresentedCheques = unpresentedChequeRows.reduce(
    (sum, cheque) => sum + num(cheque.amount),
    0,
  );
  const unclearedDeposits = unclearedDepositRows.reduce(
    (sum, cheque) => sum + num(cheque.amount),
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
  const difference = num(statement?.passbookBalance) - calculatedBalance;
  const differenceStatus =
    difference > 0.005
      ? "BANK SURPLUS (+)"
      : difference < -0.005
        ? "BANK NEGATIVE (-)"
        : "MATCHED";
  const differenceDisplay =
    Math.abs(difference) < 0.005
      ? inr(0)
      : `${difference > 0 ? "+" : "−"} ${inr(Math.abs(difference))}`;

  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <PageHeader
        title="Bank Reconciliation Statement (BRS)"
        hindi="बैंक समाधान विवरण"
        subtitle="Combined bank closing with uncleared issued/received cheques auto-synced only from Cheque Register"
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
                  Row 1 = Cashbook Closing Bank Column. Row 2(अ) = pending issued cheques; Row 5(अ) = pending received cheques. Both sync automatically only from Cheque Register.
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
                  <p
                    className={`text-xs font-bold uppercase ${
                      difference > 0.005
                        ? "text-emerald-700"
                        : difference < -0.005
                          ? "text-red-700"
                          : "text-blue-700"
                    }`}
                  >
                    {differenceStatus}
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      difference > 0.005
                        ? "text-emerald-700"
                        : difference < -0.005
                          ? "text-red-700"
                          : "text-blue-700"
                    }`}
                  >
                    {differenceDisplay}
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

          <div className="mt-6 space-y-6">
            <Card
              title={`Cheque Register — Uncleared Cheques Auto Sync (${unclearedChequeRows.length})`}
              className="min-w-0"
            >
              <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                यहाँ manual reconciliation नहीं है। Cheque Register में status Pending/Cleared बदलते ही BRS real-time update होगा।
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] table-fixed">
                  <thead>
                    <tr>
                      <Th>BRS Row</Th>
                      <Th>Cheque / Date</Th>
                      <Th>Bank</Th>
                      <Th>Party</Th>
                      <Th>Direction</Th>
                      <Th right>Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {unclearedChequeRows.length === 0 && (
                      <EmptyRow
                        colSpan={6}
                        message="Cheque Register में selected month-end तक कोई uncleared cheque नहीं है।"
                      />
                    )}
                    {unclearedChequeRows.map((cheque) => (
                      <tr key={`${cheque.direction}-${cheque.id}`} className="hover:bg-slate-50">
                        <Td>
                          <Badge color={cheque.brsRow === "2(अ)" ? "green" : "amber"}>
                            {cheque.brsRow} · {cheque.treatment}
                          </Badge>
                        </Td>
                        <Td>
                          <span className="font-semibold">{cheque.chequeNo}</span>
                          <br />
                          <span className="text-xs text-slate-500">
                            {fmtDate(cheque.chequeDate)}
                          </span>
                        </Td>
                        <Td className="whitespace-normal break-words">
                          {bankMap.get(cheque.bankAccountId)?.bankName ?? "-"}
                        </Td>
                        <Td className="whitespace-normal break-words">
                          {cheque.partyName}
                        </Td>
                        <Td>
                          <Badge color={cheque.direction === "issued" ? "blue" : "green"}>
                            {cheque.direction}
                          </Badge>
                        </Td>
                        <Td right className="font-bold text-amber-700">
                          {inr(cheque.amount)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card
              title={`Saved Combined Monthly BRS (${savedStatements.length})`}
              className="min-w-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] table-fixed">
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
                            prefetch={false}
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
                            prefetch={false}
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


        </>
      )}
    </div>
  );
}
