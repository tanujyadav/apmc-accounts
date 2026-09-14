import PinProtectedForm from "@/components/PinProtectedForm";
import { db } from "@/db";
import { bankAccounts, cashbookEntries, cashDeposits } from "@/db/schema";
import { asc } from "drizzle-orm";
import {
  addBankAccount,
  toggleBankStatus,
  updateBankOpeningBalance,
} from "@/lib/actions";
import { fmtDate, inr, num, todayISO } from "@/lib/format";
import {
  Badge,
  Card,
  EmptyRow,
  PageHeader,
  StatCard,
  Td,
  Th,
  btnCls,
  inputCls,
  labelCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BankAccountsPage() {
  const [banks, entries, deposits] = await Promise.all([
    db.select().from(bankAccounts).orderBy(asc(bankAccounts.id)),
    db.select().from(cashbookEntries),
    db.select().from(cashDeposits),
  ]);

  const directCredits = new Map<number, number>();
  const cashDepositCredits = new Map<number, number>();
  const bankDebits = new Map<number, number>();

  for (const entry of entries) {
    if (!entry.bankAccountId || entry.mode === "cash") continue;
    const bank = banks.find((item) => item.id === entry.bankAccountId);
    if (
      bank?.openingBalanceDate &&
      entry.entryDate < bank.openingBalanceDate
    ) {
      continue;
    }
    const target =
      entry.entryType === "receipt" ? directCredits : bankDebits;
    target.set(
      entry.bankAccountId,
      (target.get(entry.bankAccountId) ?? 0) + num(entry.amount),
    );
  }

  for (const deposit of deposits) {
    const bank = banks.find((item) => item.id === deposit.bankAccountId);
    if (
      bank?.openingBalanceDate &&
      deposit.depositDate < bank.openingBalanceDate
    ) {
      continue;
    }
    cashDepositCredits.set(
      deposit.bankAccountId,
      (cashDepositCredits.get(deposit.bankAccountId) ?? 0) +
        num(deposit.amount),
    );
  }

  const metrics = new Map(
    banks.map((bank) => {
      const opening = num(bank.openingBalance);
      const directBankCredit = directCredits.get(bank.id) ?? 0;
      const cashFlowCredit = cashDepositCredits.get(bank.id) ?? 0;
      const debit = bankDebits.get(bank.id) ?? 0;
      const totalCredit = directBankCredit + cashFlowCredit;
      return [
        bank.id,
        {
          opening,
          directBankCredit,
          cashFlowCredit,
          totalCredit,
          debit,
          netFlow: totalCredit - debit,
          currentBalance: opening + totalCredit - debit,
        },
      ];
    }),
  );

  const combinedOpening = banks.reduce(
    (sum, bank) => sum + num(bank.openingBalance),
    0,
  );
  const combinedCredits = [...metrics.values()].reduce(
    (sum, item) => sum + item.totalCredit,
    0,
  );
  const combinedDebits = [...metrics.values()].reduce(
    (sum, item) => sum + item.debit,
    0,
  );
  const totalBalance = [...metrics.values()].reduce(
    (sum, item) => sum + item.currentBalance,
    0,
  );

  return (
    <div>
      <PageHeader
        title="Bank Accounts"
        hindi="बैंक खाते"
        subtitle="Complete account details, opening balance, cash flow, bank credit, debit and current balance"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Combined Opening"
          value={inr(combinedOpening)}
          icon="🔓"
          accent="amber"
        />
        <StatCard
          label="Total Bank Inflow / Credit"
          value={inr(combinedCredits)}
          icon="📥"
          accent="emerald"
        />
        <StatCard
          label="Total Bank Outflow / Debit"
          value={inr(combinedDebits)}
          icon="📤"
          accent="red"
        />
        <StatCard
          label="Combined Current Balance"
          value={inr(totalBalance)}
          icon="🏦"
          accent="blue"
        />
      </div>

      <div className="mt-6 space-y-5">
        {banks.length === 0 && (
          <Card>
            <p className="py-8 text-center text-sm text-slate-400">
              No bank accounts added yet. Add the first account below.
            </p>
          </Card>
        )}

        {banks.map((bank) => {
          const flow = metrics.get(bank.id)!;
          return (
            <Card key={bank.id}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {bank.bankName}
                    </h2>
                    <Badge color={bank.status === "active" ? "green" : "slate"}>
                      {bank.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {bank.branch} · {bank.accountType} Account
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Current Balance
                  </p>
                  <p
                    className={`text-2xl font-bold tabular-nums ${
                      flow.currentBalance >= 0
                        ? "text-blue-900"
                        : "text-red-700"
                    }`}
                  >
                    {inr(flow.currentBalance)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Complete Account Details
                  </p>
                  <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
                    <dt className="text-slate-500">Account No.</dt>
                    <dd className="font-mono font-semibold text-slate-900">
                      {bank.accountNumber}
                    </dd>
                    <dt className="text-slate-500">IFSC</dt>
                    <dd className="font-mono font-semibold text-slate-900">
                      {bank.ifscCode}
                    </dd>
                    <dt className="text-slate-500">Type</dt>
                    <dd className="font-semibold text-slate-900">
                      {bank.accountType}
                    </dd>
                    <dt className="text-slate-500">Opening As On</dt>
                    <dd className="font-semibold text-slate-900">
                      {fmtDate(bank.openingBalanceDate)}
                    </dd>
                  </dl>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 lg:col-span-2">
                  <table className="w-full min-w-[620px]">
                    <thead>
                      <tr>
                        <Th>Flow Particular</Th>
                        <Th>Nature</Th>
                        <Th right>Amount</Th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <Td>Opening Balance</Td>
                        <Td><Badge color="amber">Opening</Badge></Td>
                        <Td right className="font-semibold">{inr(flow.opening)}</Td>
                      </tr>
                      <tr>
                        <Td>Direct Bank Receipts from Cashbook</Td>
                        <Td><Badge color="green">Bank Credit</Badge></Td>
                        <Td right className="font-semibold text-emerald-700">
                          + {inr(flow.directBankCredit)}
                        </Td>
                      </tr>
                      <tr>
                        <Td>Cash Deposited into Bank</Td>
                        <Td><Badge color="blue">Cash Flow</Badge></Td>
                        <Td right className="font-semibold text-blue-700">
                          + {inr(flow.cashFlowCredit)}
                        </Td>
                      </tr>
                      <tr>
                        <Td>All Bank Payments / Debits</Td>
                        <Td><Badge color="red">Bank Debit</Badge></Td>
                        <Td right className="font-semibold text-red-700">
                          − {inr(flow.debit)}
                        </Td>
                      </tr>
                      <tr className="bg-blue-50">
                        <Td className="font-bold">Net Bank Flow</Td>
                        <Td><Badge color={flow.netFlow >= 0 ? "green" : "red"}>Net Flow</Badge></Td>
                        <Td
                          right
                          className={`font-bold ${
                            flow.netFlow >= 0
                              ? "text-emerald-800"
                              : "text-red-700"
                          }`}
                        >
                          {inr(flow.netFlow)}
                        </Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[1fr_auto]">
                <PinProtectedForm
                  action={updateBankOpeningBalance}
                  purpose="Bank opening balance update"
                  className="flex flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="id" value={bank.id} />
                  <div>
                    <label className={labelCls}>Opening Balance (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="openingBalance"
                      defaultValue={bank.openingBalance}
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Opening Date</label>
                    <input
                      type="date"
                      name="openingBalanceDate"
                      defaultValue={bank.openingBalanceDate ?? todayISO()}
                      className={inputCls}
                      required
                    />
                  </div>
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    Update Opening
                  </button>
                </PinProtectedForm>

                <PinProtectedForm
                  action={toggleBankStatus}
                  purpose="Bank status update"
                  className="flex items-end"
                >
                  <input type="hidden" name="id" value={bank.id} />
                  <input type="hidden" name="status" value={bank.status} />
                  <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    {bank.status === "active" ? "Close Account" : "Activate Account"}
                  </button>
                </PinProtectedForm>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6">
        <Card title="Add New Bank Account / नया बैंक खाता जोड़ें">
          <form
            action={addBankAccount}
            className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <div>
              <label className={labelCls}>Bank Name</label>
              <input
                name="bankName"
                placeholder="State Bank of India"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Branch</label>
              <input
                name="branch"
                placeholder="Branch name"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Account Number</label>
              <input name="accountNumber" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>IFSC Code</label>
              <input
                name="ifscCode"
                placeholder="SBIN0001234"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Account Type</label>
              <select name="accountType" className={inputCls}>
                <option>Current</option>
                <option>Savings</option>
                <option>Fixed Deposit</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Opening Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                name="openingBalance"
                defaultValue="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Opening Balance Date</label>
              <input
                type="date"
                name="openingBalanceDate"
                defaultValue={todayISO()}
                required
                className={inputCls}
              />
            </div>
            <button className={btnCls}>Add Bank Account</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
