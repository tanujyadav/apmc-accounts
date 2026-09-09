import { db } from "@/db";
import {
  bankAccounts,
  cashbookEntries,
  cashDepositAllocations,
  cashDeposits,
  ledgerHeads,
} from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import CashDepositAllocationForm from "@/components/CashDepositAllocationForm";
import { deleteCashDeposit } from "@/lib/actions";
import { fmtDate, inr, num, todayISO } from "@/lib/format";
import {
  Badge,
  Card,
  EmptyRow,
  PageHeader,
  StatCard,
  Td,
  Th,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DepositsPage({
  searchParams,
}: {
  searchParams: Promise<{ deposit?: string }>;
}) {
  const { deposit } = await searchParams;
  const [rows, banks, cashReceipts, allocations, heads] = await Promise.all([
    db
      .select()
      .from(cashDeposits)
      .orderBy(desc(cashDeposits.depositDate), desc(cashDeposits.id)),
    db.select().from(bankAccounts).orderBy(asc(bankAccounts.bankName)),
    db
      .select()
      .from(cashbookEntries)
      .where(
        and(
          eq(cashbookEntries.entryType, "receipt"),
          eq(cashbookEntries.mode, "cash"),
        ),
      )
      .orderBy(asc(cashbookEntries.entryDate), asc(cashbookEntries.id)),
    db.select().from(cashDepositAllocations),
    db.select().from(ledgerHeads),
  ]);

  const bankMap = new Map(banks.map((bank) => [bank.id, bank]));
  const receiptMap = new Map(cashReceipts.map((receipt) => [receipt.id, receipt]));
  const headMap = new Map(heads.map((head) => [head.id, head]));
  const depositedByReceipt = new Map<number, number>();
  const allocationsByDeposit = new Map<number, typeof allocations>();

  for (const allocation of allocations) {
    depositedByReceipt.set(
      allocation.cashbookEntryId,
      (depositedByReceipt.get(allocation.cashbookEntryId) ?? 0) +
        num(allocation.allocatedAmount),
    );
    const list = allocationsByDeposit.get(allocation.cashDepositId) ?? [];
    list.push(allocation);
    allocationsByDeposit.set(allocation.cashDepositId, list);
  }

  const pendingReceipts = cashReceipts
    .map((receipt) => {
      const alreadyDeposited = depositedByReceipt.get(receipt.id) ?? 0;
      const availableAmount = Math.max(0, num(receipt.amount) - alreadyDeposited);
      const head = headMap.get(receipt.ledgerHeadId);
      return {
        id: receipt.id,
        entryDate: receipt.entryDate,
        voucherNo: receipt.voucherNo,
        partyName: receipt.partyName,
        headLabel: `[${head?.code ?? "-"}] ${head?.nameHindi ?? head?.name ?? "-"}`,
        receiptAmount: num(receipt.amount),
        alreadyDeposited,
        availableAmount,
      };
    })
    .filter((receipt) => receipt.availableAmount > 0.005);

  const totalCashReceipts = cashReceipts.reduce(
    (sum, receipt) => sum + num(receipt.amount),
    0,
  );
  const totalDeposited = allocations.reduce(
    (sum, allocation) => sum + num(allocation.allocatedAmount),
    0,
  );
  const undepositedBalance = Math.max(0, totalCashReceipts - totalDeposited);
  const thisMonth = rows
    .filter((row) => row.depositDate.slice(0, 7) === todayISO().slice(0, 7))
    .reduce((sum, row) => sum + num(row.amount), 0);

  return (
    <div>
      <PageHeader
        title="Cash Deposit Details"
        hindi="नकद जमा विवरण"
        subtitle="Cashbook cash receipts pending for deposit and bank deposit allocation register"
      />

      {deposit === "saved" && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✓ Cash deposit saved. Selected receipt balances have been reduced and Cashbook narration is marked.
        </div>
      )}
      {deposit === "deleted" && (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          Deposit deleted. Its allocated amounts are available again for deposit.
        </div>
      )}
      {deposit === "failed" && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          Deposit could not be saved. Check receipt pending amounts and ensure the deposit date is not before the receipt date.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cash Receipts in Cashbook"
          value={inr(totalCashReceipts)}
          icon="📒"
          accent="blue"
        />
        <StatCard
          label="Deposited into Bank"
          value={inr(totalDeposited)}
          icon="🏦"
          accent="emerald"
        />
        <StatCard
          label="Cash Pending for Deposit"
          value={inr(undepositedBalance)}
          icon="💵"
          accent="amber"
        />
        <StatCard
          label="Deposited This Month"
          value={inr(thisMonth)}
          icon="📅"
          accent="emerald"
        />
      </div>

      <div className="mt-6">
        <Card title="New Bank Cash Deposit / नया बैंक नकद जमा">
          <CashDepositAllocationForm
            receipts={pendingReceipts}
            banks={banks.map((bank) => ({
              id: bank.id,
              bankName: bank.bankName,
              accountNumber: bank.accountNumber,
            }))}
            defaultDate={todayISO()}
          />
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Deposit Register / नकद जमा पंजिका">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr>
                  <Th>Date / Slip</Th>
                  <Th>Bank</Th>
                  <Th>Cashbook Receipts Allocated</Th>
                  <Th>Deposited By</Th>
                  <Th>Remarks</Th>
                  <Th right>Amount</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <EmptyRow colSpan={7} message="No bank cash deposits recorded yet." />
                )}
                {rows.map((row) => {
                  const bank = bankMap.get(row.bankAccountId);
                  const depositAllocations = allocationsByDeposit.get(row.id) ?? [];
                  return (
                    <tr key={row.id} className="align-top hover:bg-slate-50">
                      <Td>
                        <span className="font-semibold">{fmtDate(row.depositDate)}</span>
                        <br />
                        <span className="text-xs text-slate-500">Slip {row.slipNo}</span>
                      </Td>
                      <Td>
                        <span className="font-semibold">{bank?.bankName ?? "-"}</span>
                        <br />
                        <span className="text-xs text-slate-500">
                          A/C ····{bank?.accountNumber.slice(-4) ?? "-"}
                        </span>
                      </Td>
                      <Td>
                        <div className="space-y-1.5">
                          {depositAllocations.length === 0 && (
                            <span className="text-xs text-slate-400">Legacy deposit — no receipt allocation</span>
                          )}
                          {depositAllocations.map((allocation) => {
                            const receipt = receiptMap.get(allocation.cashbookEntryId);
                            return (
                              <div
                                key={allocation.id}
                                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs"
                              >
                                <span>
                                  <span className="font-semibold text-slate-700">
                                    {receipt?.voucherNo ?? "Receipt"}
                                  </span>{" "}
                                  <span className="text-slate-500">
                                    · {fmtDate(receipt?.entryDate)} · {receipt?.partyName || "-"}
                                  </span>
                                </span>
                                <span className="font-bold text-emerald-700">
                                  {inr(allocation.allocatedAmount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </Td>
                      <Td>{row.depositedBy}</Td>
                      <Td className="max-w-52 whitespace-normal">{row.remarks ?? "-"}</Td>
                      <Td right className="font-bold text-emerald-700">
                        {inr(row.amount)}
                        <br />
                        <Badge color="green">Bank deposited</Badge>
                      </Td>
                      <Td>
                        <form action={deleteCashDeposit}>
                          <input type="hidden" name="id" value={row.id} />
                          <button className="text-xs font-semibold text-red-600 hover:text-red-800">
                            Delete Deposit
                          </button>
                        </form>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
