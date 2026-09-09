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
  PageHeader, Card, StatCard, Th, Td, Badge, EmptyRow, inputCls, labelCls, btnCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BankAccountsPage() {
  const [banks, entries, deposits] = await Promise.all([
    db.select().from(bankAccounts).orderBy(asc(bankAccounts.id)),
    db.select().from(cashbookEntries),
    db.select().from(cashDeposits),
  ]);

  const balances = new Map<number, number>();
  for (const b of banks) balances.set(b.id, num(b.openingBalance));
  for (const e of entries) {
    if (!e.bankAccountId) continue;
    const bank = banks.find((item) => item.id === e.bankAccountId);
    if (bank?.openingBalanceDate && e.entryDate < bank.openingBalanceDate) continue;
    const sign = e.entryType === "receipt" ? 1 : -1;
    balances.set(e.bankAccountId, (balances.get(e.bankAccountId) ?? 0) + sign * num(e.amount));
  }
  for (const deposit of deposits) {
    const bank = banks.find((item) => item.id === deposit.bankAccountId);
    if (bank?.openingBalanceDate && deposit.depositDate < bank.openingBalanceDate) continue;
    balances.set(
      deposit.bankAccountId,
      (balances.get(deposit.bankAccountId) ?? 0) + num(deposit.amount),
    );
  }
  const totalBalance = [...balances.values()].reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        title="Bank Accounts"
        hindi="बैंक खाते"
        subtitle="Bank accounts held by the Mandi Samiti with live balances"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Accounts" value={String(banks.length)} icon="💳" accent="blue" />
        <StatCard label="Active Accounts" value={String(banks.filter((b) => b.status === "active").length)} icon="✅" accent="emerald" />
        <StatCard label="Combined Balance" value={inr(totalBalance)} icon="🏦" accent="emerald" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Add Bank Account">
          <form action={addBankAccount} className="space-y-3">
            <div>
              <label className={labelCls}>Bank Name</label>
              <input name="bankName" placeholder="State Bank of India" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Branch</label>
              <input name="branch" placeholder="Mandi Parishad Branch, Lucknow" required className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Account Number</label>
                <input name="accountNumber" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>IFSC Code</label>
                <input name="ifscCode" placeholder="SBIN0001234" required className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                <input type="number" step="0.01" name="openingBalance" defaultValue="0" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Opening Balance Date / प्रारम्भिक दिनांक</label>
              <input
                type="date"
                name="openingBalanceDate"
                defaultValue={todayISO()}
                required
                className={inputCls}
              />
            </div>
            <button className={btnCls + " w-full"}>Add Account</button>
          </form>
        </Card>

        <Card title="Account Details" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Bank / Branch</Th>
                  <Th>Account No.</Th>
                  <Th>IFSC</Th>
                  <Th>Type</Th>
                  <Th right>Opening / As On</Th>
                  <Th right>Current Balance</Th>
                  <Th>Update Opening</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {banks.length === 0 && <EmptyRow colSpan={8} message="No bank accounts added yet." />}
                {banks.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <Td>
                      <span className="font-semibold">{b.bankName}</span>
                      <br />
                      <span className="text-xs text-slate-500">{b.branch}</span>
                    </Td>
                    <Td>{b.accountNumber}</Td>
                    <Td>{b.ifscCode}</Td>
                    <Td>{b.accountType}</Td>
                    <Td right>
                      <span className="font-semibold">{inr(b.openingBalance)}</span>
                      <br />
                      <span className="text-xs text-slate-500">
                        As on {fmtDate(b.openingBalanceDate)}
                      </span>
                    </Td>
                    <Td right className="font-bold text-emerald-700">{inr(balances.get(b.id) ?? 0)}</Td>
                    <Td>
                      <form action={updateBankOpeningBalance} className="grid min-w-48 gap-1.5">
                        <input type="hidden" name="id" value={b.id} />
                        <input
                          type="number"
                          step="0.01"
                          name="openingBalance"
                          defaultValue={b.openingBalance}
                          aria-label="Opening balance"
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                          required
                        />
                        <input
                          type="date"
                          name="openingBalanceDate"
                          defaultValue={b.openingBalanceDate ?? todayISO()}
                          aria-label="Opening balance date"
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                          required
                        />
                        <button className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700">
                          Update Opening
                        </button>
                      </form>
                    </Td>
                    <Td>
                      <form action={toggleBankStatus} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="status" value={b.status} />
                        <button title="Toggle status">
                          <Badge color={b.status === "active" ? "green" : "slate"}>{b.status}</Badge>
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
    </div>
  );
}
