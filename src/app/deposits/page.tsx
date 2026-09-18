import Link from "next/link";
import { db } from "@/db";
import DeleteDepositButton from "@/components/DeleteDepositButton";
import {
  bankAccounts,
  cashbookEntries,
  cashbookOpeningBalances,
  cashDepositAllocations,
  cashDeposits,
  ledgerHeads,
} from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import CashDepositAllocationForm from "@/components/CashDepositAllocationForm";
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
  searchParams: Promise<{ deposit?: string; pendingAccount?: string }>;
}) {
  const { deposit, pendingAccount } = await searchParams;
  const [
    rows,
    banks,
    cashReceipts,
    openingBalances,
    allocations,
    heads,
  ] = await Promise.all([
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
    db
      .select()
      .from(cashbookOpeningBalances)
      .orderBy(asc(cashbookOpeningBalances.openingDate), asc(cashbookOpeningBalances.id)),
    db.select().from(cashDepositAllocations),
    db.select().from(ledgerHeads),
  ]);

  const bankMap = new Map(banks.map((bank) => [bank.id, bank]));
  const bankByAccountNumber = new Map(
    banks.map((bank) => [bank.accountNumber, bank]),
  );
  const activeBanks = banks.filter((bank) => bank.status === "active");
  const receiptMap = new Map(cashReceipts.map((receipt) => [receipt.id, receipt]));
  const openingMap = new Map(
    openingBalances.map((opening) => [opening.id, opening]),
  );
  const headMap = new Map(heads.map((head) => [head.id, head]));
  const depositedByReceipt = new Map<number, number>();
  const depositedByOpening = new Map<number, number>();
  const allocationsByDeposit = new Map<number, typeof allocations>();

  for (const allocation of allocations) {
    if (allocation.cashbookEntryId !== null) {
      depositedByReceipt.set(
        allocation.cashbookEntryId,
        (depositedByReceipt.get(allocation.cashbookEntryId) ?? 0) +
          num(allocation.allocatedAmount),
      );
    }
    if (allocation.cashbookOpeningBalanceId !== null) {
      depositedByOpening.set(
        allocation.cashbookOpeningBalanceId,
        (depositedByOpening.get(allocation.cashbookOpeningBalanceId) ?? 0) +
          num(allocation.allocatedAmount),
      );
    }
    const list = allocationsByDeposit.get(allocation.cashDepositId) ?? [];
    list.push(allocation);
    allocationsByDeposit.set(allocation.cashDepositId, list);
  }

  const pendingOpenings = openingBalances
    .map((opening) => {
      const alreadyDeposited = depositedByOpening.get(opening.id) ?? 0;
      const availableAmount = Math.max(
        0,
        num(opening.openingCash) - alreadyDeposited,
      );
      const startYear = Number(opening.financialYear.slice(0, 4));
      return {
        sourceKey: `opening:${opening.id}`,
        sourceType: "opening" as const,
        entryDate:
          opening.openingDate ||
          `${startYear || new Date().getFullYear()}-04-01`,
        voucherNo: `OB · FY ${opening.financialYear}`,
        partyName: "Cash in Hand Opening Balance",
        headLabel: "प्रारम्भिक रोकड़ / Opening Cash Balance",
        receiptAmount: num(opening.openingCash),
        alreadyDeposited,
        availableAmount,
        fixedBankId: null,
        fixedBankName: "Active Bank Account चुनें",
        fixedBankAccountNumber: "Selectable",
        fixedBankAvailable: banks.some((bank) => bank.status === "active"),
        allowBankSelection: true,
      };
    })
    .filter((opening) => opening.availableAmount > 0.005);

  const pendingReceipts = cashReceipts
    .map((receipt) => {
      const alreadyDeposited = depositedByReceipt.get(receipt.id) ?? 0;
      const availableAmount = Math.max(0, num(receipt.amount) - alreadyDeposited);
      const head = headMap.get(receipt.ledgerHeadId);
      const fixedBankAccountNumber =
        head?.code === "1-B"
          ? "30410641195"
          : head?.code === "5-E"
            ? "30386343784"
            : "30386329769";
      const fixedBank = bankByAccountNumber.get(fixedBankAccountNumber);
      return {
        sourceKey: `receipt:${receipt.id}`,
        sourceType: "receipt" as const,
        entryDate: receipt.entryDate,
        voucherNo: receipt.voucherNo,
        partyName: receipt.partyName,
        headLabel: `[${head?.code ?? "-"}] ${head?.nameHindi ?? head?.name ?? "-"}`,
        receiptAmount: num(receipt.amount),
        alreadyDeposited,
        availableAmount,
        fixedBankId: fixedBank?.id ?? null,
        fixedBankName:
          fixedBank?.bankName ??
          (head?.code === "1-B"
            ? "SBI (APMC CESS)"
            : head?.code === "5-E"
              ? "SBI (APMC PAYMENT)"
              : "SBI (APMC DEPOSIT)"),
        fixedBankAccountNumber,
        fixedBankAvailable: Boolean(fixedBank),
        allowBankSelection: false,
      };
    })
    .filter((receipt) => receipt.availableAmount > 0.005);
  const pendingAccountOrder = ["30386329769", "30410641195", "30386343784"];
  const fixedAccountGroups = pendingAccountOrder.map((accountNumber) => {
    const sources = pendingReceipts.filter(
      (source) => source.fixedBankAccountNumber === accountNumber,
    );
    const bank = bankByAccountNumber.get(accountNumber);
    return {
      accountNumber,
      bankName:
        bank?.bankName ??
        (accountNumber === "30410641195"
          ? "SBI (APMC CESS)"
          : accountNumber === "30386343784"
            ? "SBI (APMC PAYMENT)"
            : "SBI (APMC DEPOSIT)"),
      branch: bank?.branch ?? "WAZIRGANJ",
      available: Boolean(bank),
      sources,
      pendingAmount: sources.reduce(
        (sum, source) => sum + source.availableAmount,
        0,
      ),
    };
  });
  const openingCashGroup = {
    accountNumber: "opening-cash",
    bankName: "Opening Cash Balance",
    branch: "Deposit के समय Active Bank Account चुनें",
    available: activeBanks.length > 0,
    sources: pendingOpenings,
    pendingAmount: pendingOpenings.reduce(
      (sum, source) => sum + source.availableAmount,
      0,
    ),
  };
  const pendingAccountGroups = [openingCashGroup, ...fixedAccountGroups];
  const selectedPendingGroup = pendingAccountGroups.find(
    (group) => group.accountNumber === pendingAccount,
  );
  const selectedPendingSources = selectedPendingGroup?.sources ?? [];

  const totalOpeningCash = openingBalances.reduce(
    (sum, opening) => sum + num(opening.openingCash),
    0,
  );
  const totalCashReceipts = cashReceipts.reduce(
    (sum, receipt) => sum + num(receipt.amount),
    0,
  );
  const totalAllocated = allocations.reduce(
    (sum, allocation) => sum + num(allocation.allocatedAmount),
    0,
  );
  const totalDeposited = rows.reduce(
    (sum, row) => sum + num(row.amount),
    0,
  );
  const totalCashAvailable = totalOpeningCash + totalCashReceipts;
  const undepositedBalance = Math.max(0, totalCashAvailable - totalAllocated);
  const thisMonth = rows
    .filter((row) => row.depositDate.slice(0, 7) === todayISO().slice(0, 7))
    .reduce((sum, row) => sum + num(row.amount), 0);

  return (
    <div>
      <PageHeader
        title="Cash Deposit Details"
        hindi="नकद जमा विवरण"
        subtitle="Head-wise fixed bank routing, auto-generated deposit slips and pending cash allocation"
      />

      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Income Head receipts destination Bank Account-wise fixed हैं। <strong>केवल Opening Cash Balance</strong> की Linked Details में Active Bank Account dropdown खुलेगा।
      </div>

      {deposit === "saved" && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✓ Cash deposit saved with auto-generated slip number(s). Amounts were routed bank-wise and Cashbook narration is marked.
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
      {deposit === "delete-failed" && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          Deposit delete नहीं हुआ। कृपया page refresh करके सही PIN के साथ दोबारा प्रयास करें।
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Opening Cash + Cash Receipts"
          value={inr(totalCashAvailable)}
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
        <Card title="Bank Account-wise Pending Cash / बैंक खातावार लंबित नकद">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <Th>Destination Bank Account</Th>
                  <Th>Branch</Th>
                  <Th right>Linked Sources</Th>
                  <Th right>Pending Cash</Th>
                  <Th>Details / Deposit</Th>
                </tr>
              </thead>
              <tbody>
                {pendingAccountGroups.map((group) => (
                  <tr
                    key={group.accountNumber}
                    className={
                      group.accountNumber === pendingAccount
                        ? "bg-blue-50"
                        : "hover:bg-slate-50"
                    }
                  >
                    <Td>
                      <span className="font-semibold text-slate-900">
                        {group.bankName}
                      </span>
                      <br />
                      <span className="font-mono text-xs text-slate-500">
                        {group.accountNumber === "opening-cash"
                          ? "Active Bank selectable"
                          : `A/C ${group.accountNumber}`}
                      </span>
                    </Td>
                    <Td>{group.branch}</Td>
                    <Td right>{group.sources.length}</Td>
                    <Td
                      right
                      className={`font-bold ${
                        group.pendingAmount > 0
                          ? "text-amber-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {inr(group.pendingAmount)}
                    </Td>
                    <Td>
                      {group.pendingAmount > 0 ? (
                        <Link
                          href={`/deposits?pendingAccount=${group.accountNumber}#pending-details`}
                          prefetch={false}
                          className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          View Linked Details →
                        </Link>
                      ) : (
                        <Badge color="green">No pending cash</Badge>
                      )}
                      {!group.available && (
                        <p className="mt-2 text-xs font-semibold text-red-600">
                          Bank account missing
                        </p>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {selectedPendingGroup && (
        <div id="pending-details" className="mt-6 scroll-mt-6">
          <Card
            title={
              selectedPendingGroup.accountNumber === "opening-cash"
                ? "Opening Cash Balance · Active Bank Account Select करें"
                : `Linked Pending Details · ${selectedPendingGroup.bankName} · ${selectedPendingGroup.accountNumber}`
            }
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  {selectedPendingGroup.sources.length} linked cash sources
                </p>
                <p className="text-xs text-blue-700">
                  Total pending: {inr(selectedPendingGroup.pendingAmount)}
                </p>
              </div>
              <Link
                href="/deposits"
                className="text-xs font-semibold text-slate-600 underline"
              >
                Close Details
              </Link>
            </div>
            <CashDepositAllocationForm
              receipts={selectedPendingSources}
              defaultDate={todayISO()}
              defaultDepositedBy={rows[0]?.depositedBy ?? ""}
              activeBanks={activeBanks.map((bank) => ({
                  id: bank.id,
                  bankName: bank.bankName,
                  branch: bank.branch,
                  accountNumber: bank.accountNumber,
                }))}
            />
          </Card>
        </div>
      )}

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
                            const receipt =
                              allocation.cashbookEntryId !== null
                                ? receiptMap.get(allocation.cashbookEntryId)
                                : null;
                            const opening =
                              allocation.cashbookOpeningBalanceId !== null
                                ? openingMap.get(allocation.cashbookOpeningBalanceId)
                                : null;
                            const openingYear = opening
                              ? Number(opening.financialYear.slice(0, 4))
                              : 0;
                            const sourceDate = receipt?.entryDate ??
                              opening?.openingDate ??
                              (opening ? `${openingYear}-04-01` : null);
                            return (
                              <div
                                key={allocation.id}
                                className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs ${
                                  opening ? "bg-amber-50" : "bg-slate-50"
                                }`}
                              >
                                <span>
                                  <span className="font-semibold text-slate-700">
                                    {opening
                                      ? `OB · FY ${opening.financialYear}`
                                      : receipt?.voucherNo ?? "Receipt"}
                                  </span>{" "}
                                  <span className="text-slate-500">
                                    · {fmtDate(sourceDate)} · {opening ? "Opening Cash in Hand" : receipt?.partyName || "-"}
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
                        <div className="flex flex-col items-start gap-2">
                          <a
                            href={`/deposits/print/${row.id}`}
                            className="whitespace-nowrap text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                          >
                            🖨️ Print Slip
                          </a>
                          <DeleteDepositButton
                            id={row.id}
                            slipNo={row.slipNo}
                            amount={inr(row.amount)}
                          />
                        </div>
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
