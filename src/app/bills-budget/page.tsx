import Link from "next/link";
import PinProtectedForm from "@/components/PinProtectedForm";
import ContingentBillForm from "@/components/ContingentBillForm";
import DeleteBillButton from "@/components/DeleteBillButton";
import { db } from "@/db";
import {
  bankAccounts,
  billNumberCounters,
  bills,
  budgets,
  ledgerHeads,
  parties,
} from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { addBudget, finalApproveBill } from "@/lib/actions";
import { currentFY, fmtDate, inr, num, todayISO } from "@/lib/format";
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

function billSerialNumber(billNo: string, fallbackId: number): number {
  const lastPart = billNo.split("/").at(-1);
  const parsed = Number(lastPart);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackId;
}

const billColor = (status: string) =>
  status === "paid"
    ? "green"
    : status === "approved"
      ? "blue"
      : status === "rejected"
        ? "red"
        : "amber";

export default async function BillsBudgetPage({
  searchParams,
}: {
  searchParams: Promise<{
    fy?: string;
    showZero?: string;
    approved?: string;
    draftSaved?: string;
    billDeleted?: string;
    budgetSort?: string;
    budgetDir?: string;
    billSort?: string;
    billDir?: string;
  }>;
}) {
  const {
    fy: requestedFY,
    showZero,
    approved,
    draftSaved,
    billDeleted,
    budgetSort = "head",
    budgetDir = "asc",
    billSort = "date",
    billDir = "desc",
  } = await searchParams;
  const selectedFY = /^\d{4}-\d{2}$/.test(requestedFY ?? "")
    ? requestedFY!
    : currentFY();

  const [billRows, budgetRows, heads, partyRows, banks, counterRows] =
    await Promise.all([
    db
      .select()
      .from(bills)
      .where(eq(bills.financialYear, selectedFY))
      .orderBy(desc(bills.billDate), desc(bills.id)),
    db
      .select()
      .from(budgets)
      .where(eq(budgets.financialYear, selectedFY))
      .orderBy(asc(budgets.id)),
    db
      .select()
      .from(ledgerHeads)
      .orderBy(asc(ledgerHeads.type), asc(ledgerHeads.code)),
    db.select().from(parties).orderBy(asc(parties.name)),
    db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.status, "active"))
      .orderBy(asc(bankAccounts.bankName)),
    db
      .select()
      .from(billNumberCounters)
      .where(eq(billNumberCounters.financialYear, selectedFY))
      .limit(1),
  ]);

  const existingMaxSerial = billRows.reduce(
    (max, bill) => Math.max(max, billSerialNumber(bill.billNo, bill.id)),
    0,
  );
  const nextBillSerial =
    Math.max(counterRows[0]?.lastSerial ?? 0, existingMaxSerial) + 1;
  const expenseHeads = heads.filter((head) => head.type === "expense");
  const headMap = new Map(heads.map((head) => [head.id, head]));
  const budgetMap = new Map(
    budgetRows.map((budget) => [budget.ledgerHeadId, budget]),
  );
  const expenseMap = new Map<number, number>();
  for (const bill of billRows) {
    if (bill.status === "approved" || bill.status === "paid") {
      expenseMap.set(
        bill.ledgerHeadId,
        (expenseMap.get(bill.ledgerHeadId) ?? 0) + num(bill.amount),
      );
    }
  }

  const budgetTableRows = expenseHeads.map((head) => {
    const budget = budgetMap.get(head.id);
    const mainBudget = num(budget?.mainBudget);
    const supplementaryBudget = num(budget?.supplementaryBudget);
    const totalSanctioned = mainBudget + supplementaryBudget;
    const totalExpense = expenseMap.get(head.id) ?? 0;
    return {
      head,
      budget,
      mainBudget,
      supplementaryBudget,
      totalSanctioned,
      totalExpense,
      balance: totalSanctioned - totalExpense,
    };
  });

  const showZeroHeads = showZero === "1";
  const visibleBudgetRows = showZeroHeads
    ? budgetTableRows
    : budgetTableRows.filter(
        (row) =>
          Math.abs(row.mainBudget) > 0.005 ||
          Math.abs(row.supplementaryBudget) > 0.005 ||
          Math.abs(row.totalExpense) > 0.005,
      );
  const hiddenZeroCount = budgetTableRows.length - visibleBudgetRows.length;
  const budgetDirection = budgetDir === "desc" ? -1 : 1;
  const sortedBudgetRows = [...visibleBudgetRows].sort((a, b) => {
    const aValue =
      budgetSort === "main"
        ? a.mainBudget
        : budgetSort === "supplementary"
          ? a.supplementaryBudget
          : budgetSort === "sanctioned"
            ? a.totalSanctioned
            : budgetSort === "expense"
              ? a.totalExpense
              : budgetSort === "balance"
                ? a.balance
                : budgetSort === "utilisation"
                  ? a.totalSanctioned > 0
                    ? a.totalExpense / a.totalSanctioned
                    : 0
                  : `${a.head.code} ${a.head.nameHindi ?? a.head.name}`;
    const bValue =
      budgetSort === "main"
        ? b.mainBudget
        : budgetSort === "supplementary"
          ? b.supplementaryBudget
          : budgetSort === "sanctioned"
            ? b.totalSanctioned
            : budgetSort === "expense"
              ? b.totalExpense
              : budgetSort === "balance"
                ? b.balance
                : budgetSort === "utilisation"
                  ? b.totalSanctioned > 0
                    ? b.totalExpense / b.totalSanctioned
                    : 0
                  : `${b.head.code} ${b.head.nameHindi ?? b.head.name}`;
    return (
      (typeof aValue === "number"
        ? aValue - (bValue as number)
        : aValue.localeCompare(String(bValue), "en-IN")) * budgetDirection
    );
  });

  const billDirection = billDir === "asc" ? 1 : -1;
  const sortedBillRows = [...billRows].sort((a, b) => {
    const aHead = headMap.get(a.ledgerHeadId);
    const bHead = headMap.get(b.ledgerHeadId);
    const aValue =
      billSort === "serial"
        ? billSerialNumber(a.billNo, a.id)
        : billSort === "bill"
          ? a.billNo
          : billSort === "cheque"
          ? a.chequeNo ?? ""
          : billSort === "vendor"
            ? a.vendorName
            : billSort === "head"
              ? `${aHead?.code ?? ""} ${aHead?.nameHindi ?? aHead?.name ?? ""}`
              : billSort === "gross"
                ? num(a.amount)
                : billSort === "deduction"
                  ? num(a.deductionAmount)
                  : billSort === "net"
                    ? num(a.netAmount)
                    : billSort === "status"
                      ? a.status
                      : a.billDate;
    const bValue =
      billSort === "serial"
        ? billSerialNumber(b.billNo, b.id)
        : billSort === "bill"
          ? b.billNo
          : billSort === "cheque"
          ? b.chequeNo ?? ""
          : billSort === "vendor"
            ? b.vendorName
            : billSort === "head"
              ? `${bHead?.code ?? ""} ${bHead?.nameHindi ?? bHead?.name ?? ""}`
              : billSort === "gross"
                ? num(b.amount)
                : billSort === "deduction"
                  ? num(b.deductionAmount)
                  : billSort === "net"
                    ? num(b.netAmount)
                    : billSort === "status"
                      ? b.status
                      : b.billDate;
    return (
      (typeof aValue === "number"
        ? aValue - (bValue as number)
        : aValue.localeCompare(String(bValue), "en-IN")) * billDirection
    );
  });

  const totalMainBudget = budgetTableRows.reduce(
    (sum, row) => sum + row.mainBudget,
    0,
  );
  const totalSupplementary = budgetTableRows.reduce(
    (sum, row) => sum + row.supplementaryBudget,
    0,
  );
  const totalSanctioned = totalMainBudget + totalSupplementary;
  const totalExpense = budgetTableRows.reduce(
    (sum, row) => sum + row.totalExpense,
    0,
  );
  const totalBalance = totalSanctioned - totalExpense;
  const totalBillGross = billRows.reduce(
    (sum, bill) => sum + num(bill.amount),
    0,
  );
  const totalBillDeduction = billRows.reduce(
    (sum, bill) => sum + num(bill.deductionAmount),
    0,
  );
  const totalBillNet = billRows.reduce(
    (sum, bill) => sum + num(bill.netAmount),
    0,
  );
  const pendingBills = billRows.filter(
    (bill) => bill.status === "draft" || bill.status === "pending",
  ).length;
  const currentStart = Number(currentFY().slice(0, 4));
  const fyOptions = Array.from({ length: 5 }, (_, index) => {
    const start = currentStart - 2 + index;
    return `${start}-${String(start + 1).slice(-2)}`;
  });
  const defaultBillDate =
    selectedFY === currentFY()
      ? todayISO()
      : `${selectedFY.slice(0, 4)}-04-01`;

  const sortUrl = (table: "budget" | "bill", key: string) => {
    const params = new URLSearchParams({ fy: selectedFY });
    if (showZeroHeads) params.set("showZero", "1");
    params.set("budgetSort", budgetSort);
    params.set("budgetDir", budgetDir);
    params.set("billSort", billSort);
    params.set("billDir", billDir);
    const currentKey = table === "budget" ? budgetSort : billSort;
    const currentDir = table === "budget" ? budgetDir : billDir;
    params.set(table === "budget" ? "budgetSort" : "billSort", key);
    params.set(
      table === "budget" ? "budgetDir" : "billDir",
      currentKey === key && currentDir === "asc" ? "desc" : "asc",
    );
    return `/bills-budget?${params.toString()}`;
  };

  function SortHeading({
    table,
    field,
    label,
    right = false,
    className = "",
  }: {
    table: "budget" | "bill";
    field: string;
    label: string;
    right?: boolean;
    className?: string;
  }) {
    const activeField = table === "budget" ? budgetSort : billSort;
    const activeDirection = table === "budget" ? budgetDir : billDir;
    return (
      <th
        className={`border-b border-r border-slate-300 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 ${
          right ? "text-right" : "text-left"
        } ${className}`}
      >
        <Link
          href={sortUrl(table, field)}
          prefetch={false}
          className="inline-flex items-center gap-1 hover:text-blue-700"
        >
          {label}
          <span className="text-[10px]">
            {activeField === field
              ? activeDirection === "asc"
                ? "▲"
                : "▼"
              : "↕"}
          </span>
        </Link>
      </th>
    );
  }

  return (
    <div>
      <PageHeader
        title="Bill & Budget Module"
        hindi="बिल एवं बजट"
        subtitle={`Expense Head-wise sanctioned budget and Contingent Bill processing · FY ${selectedFY}`}
      />

      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="min-w-64">
          <label className={labelCls}>Financial Year / वित्तीय वर्ष</label>
          <select name="fy" defaultValue={selectedFY} className={inputCls}>
            {fyOptions.map((option) => (
              <option key={option} value={option}>
                Financial Year {option}
                {option === currentFY() ? " (Current)" : ""}
              </option>
            ))}
          </select>
        </div>
        <button className={btnCls}>View Financial Year</button>
      </form>

      {draftSaved === "1" && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          ✓ Bill Draft automatic FY/Month/Serial number के साथ save हो गया है।
        </div>
      )}
      {approved === "1" && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✓ Bill finally approved. Cashbook और Ledger में payment post हो गया तथा Budget Balance update हो गया।
        </div>
      )}
      {billDeleted === "1" && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          ✓ Bill deleted. Linked Cashbook, Ledger, Cheque और Budget effects reverse हो गए हैं।
        </div>
      )}
      {billDeleted === "0" && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          Bill delete नहीं हुआ। कृपया सही PIN के साथ दोबारा प्रयास करें।
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Main Budget / मुख्य बजट"
          value={inr(totalMainBudget)}
          icon="📘"
          accent="blue"
        />
        <StatCard
          label="Supplementary / अनुपूरक"
          value={inr(totalSupplementary)}
          icon="➕"
          accent="amber"
        />
        <StatCard
          label="Total Sanctioned / स्वीकृत"
          value={inr(totalSanctioned)}
          icon="🎯"
          accent="blue"
        />
        <StatCard
          label="Total Expense / कुल व्यय"
          value={inr(totalExpense)}
          icon="📉"
          accent="red"
        />
        <StatCard
          label="Budget Balance / अवशेष"
          value={inr(totalBalance)}
          icon="🪙"
          accent={totalBalance >= 0 ? "emerald" : "red"}
        />
      </div>

      <div className="mt-6">
        <Card title={`Expense Head-wise Budget Table / व्यय मदवार बजट · FY ${selectedFY}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600">
              Showing {visibleBudgetRows.length} of {budgetTableRows.length} Expense Heads
              {!showZeroHeads && hiddenZeroCount > 0
                ? ` · ${hiddenZeroCount} zero heads hidden`
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/bills-budget?fy=${encodeURIComponent(selectedFY)}&showZero=${
                  showZeroHeads ? "0" : "1"
                }`}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700"
              >
                {showZeroHeads ? "Hide Zero Amount Heads" : "Show Zero Amount Heads"}
              </Link>
              <Link
                href={`/bills-budget/budget/print?fy=${encodeURIComponent(
                  selectedFY,
                )}&showZero=${showZeroHeads ? "1" : "0"}`}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                🖨️ Print / Save PDF
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-300">
            <table className="w-full min-w-[1050px] table-fixed border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <SortHeading table="budget" field="head" label="Expense Head / व्यय मद" className="w-72" />
                  <SortHeading table="budget" field="main" label="Main Budget" right />
                  <SortHeading table="budget" field="supplementary" label="Supplementary Budget" right />
                  <SortHeading table="budget" field="sanctioned" label="Total Sanctioned" right />
                  <SortHeading table="budget" field="expense" label="Total Expense" right />
                  <SortHeading table="budget" field="balance" label="Balance" right />
                  <SortHeading table="budget" field="utilisation" label="Utilisation" className="w-32 border-r-0" />
                </tr>
              </thead>
              <tbody>
                {visibleBudgetRows.length === 0 && (
                  <EmptyRow
                    colSpan={7}
                    message={
                      showZeroHeads
                        ? "No Expense Heads available."
                        : "All zero amount heads are hidden. Use Show Zero Amount Heads."
                    }
                  />
                )}
                {sortedBudgetRows.map((row) => {
                  const percentage =
                    row.totalSanctioned > 0
                      ? (row.totalExpense / row.totalSanctioned) * 100
                      : 0;
                  return (
                    <tr key={row.head.id} className="hover:bg-slate-50">
                      <Td className="overflow-hidden whitespace-normal break-words border-r border-slate-200 text-sm leading-5">
                        <span className="block break-words font-semibold text-slate-900">
                          [{row.head.code}] {row.head.nameHindi ?? row.head.name}
                        </span>
                        {row.head.nameHindi && (
                          <span className="mt-0.5 block break-words text-[10px] leading-4 text-slate-500">
                            {row.head.name}
                          </span>
                        )}
                      </Td>
                      <Td right className="border-r border-slate-200">
                        {inr(row.mainBudget)}
                      </Td>
                      <Td right className="border-r border-slate-200 text-amber-700">
                        {inr(row.supplementaryBudget)}
                      </Td>
                      <Td right className="border-r border-slate-200 font-semibold text-blue-800">
                        {inr(row.totalSanctioned)}
                      </Td>
                      <Td right className="border-r border-slate-200 font-semibold text-red-700">
                        {inr(row.totalExpense)}
                      </Td>
                      <Td
                        right
                        className={`border-r border-slate-200 ${
                          row.balance >= 0
                            ? "font-bold text-emerald-700"
                            : "font-bold text-red-700"
                        }`}
                      >
                        {inr(row.balance)}
                      </Td>
                      <Td className="whitespace-normal">
                        <div className="min-w-28">
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${
                                percentage > 100
                                  ? "bg-red-500"
                                  : percentage >= 80
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                  <Td className="border-r border-slate-300">TOTAL / कुल योग</Td>
                  <Td right className="border-r border-slate-300">{inr(totalMainBudget)}</Td>
                  <Td right className="border-r border-slate-300">{inr(totalSupplementary)}</Td>
                  <Td right className="border-r border-slate-300">{inr(totalSanctioned)}</Td>
                  <Td right className="border-r border-slate-300 text-red-800">{inr(totalExpense)}</Td>
                  <Td
                    right
                    className={`border-r border-slate-300 ${
                      totalBalance >= 0 ? "text-emerald-800" : "text-red-800"
                    }`}
                  >
                    {inr(totalBalance)}
                  </Td>
                  <Td>{""}</Td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Set / Update Expense Head Budget">
          <PinProtectedForm
            action={addBudget}
            purpose="Budget sanction update"
            className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-5"
          >
            <input type="hidden" name="financialYear" value={selectedFY} />
            <div className="md:col-span-2">
              <label className={labelCls}>Expense Head / व्यय मद</label>
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
              <label className={labelCls}>Main Budget / मुख्य बजट (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="mainBudget"
                defaultValue="0"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Supplementary / अनुपूरक (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="supplementaryBudget"
                defaultValue="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Remarks / टिप्पणी</label>
              <input name="remarks" className={inputCls} />
            </div>
            <div className="md:col-span-2 xl:col-span-5 flex justify-end">
              <button className={btnCls}>Save / Update Budget</button>
            </div>
          </PinProtectedForm>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="New Contingent Bill / नया आकस्मिक बिल">
          <ContingentBillForm
            financialYear={selectedFY}
            defaultDate={defaultBillDate}
            nextSerial={nextBillSerial}
            expenseHeads={expenseHeads.map((head) => ({
              id: head.id,
              code: head.code,
              name: head.name,
              nameHindi: head.nameHindi,
            }))}
            parties={partyRows.map((party) => ({
              id: party.id,
              name: party.name,
              partyType: party.partyType,
            }))}
            banks={banks.map((bank) => ({
              id: bank.id,
              bankName: bank.bankName,
              accountNumber: bank.accountNumber,
              branch: bank.branch,
            }))}
          />
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`Bill Register / बिल पंजिका (${billRows.length})`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600">
              Column heading पर click करके ascending/descending sort करें।
            </p>
            <Link
              href={`/bills-budget/register/print?fy=${encodeURIComponent(
                selectedFY,
              )}&sort=${encodeURIComponent(billSort)}&dir=${encodeURIComponent(
                billDir,
              )}`}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              🖨️ Print Bill Register / PDF
            </Link>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-300">
            <table className="w-full min-w-[1380px] border-collapse [&_tbody_td]:border-r [&_tbody_td]:border-slate-200 [&_tbody_td]:align-top">
              <thead>
                <tr className="bg-slate-100">
                  <SortHeading table="bill" field="serial" label="S.No." />
                  <SortHeading table="bill" field="bill" label="Bill No." />
                  <SortHeading table="bill" field="date" label="Date" />
                  <SortHeading table="bill" field="cheque" label="Cheque Details" />
                  <SortHeading table="bill" field="vendor" label="Vendor / Party" />
                  <SortHeading table="bill" field="head" label="Expense Head" />
                  <SortHeading table="bill" field="gross" label="Gross" right />
                  <SortHeading table="bill" field="deduction" label="Deduction" right />
                  <SortHeading table="bill" field="net" label="Net Payment" right />
                  <SortHeading table="bill" field="status" label="Status" />
                  <th className="border-b border-r border-slate-300 px-3 py-3 text-left text-xs font-bold uppercase text-slate-600">
                    Action
                  </th>
                  <th className="border-b border-slate-300 px-3 py-3 text-left text-xs font-bold uppercase text-slate-600">
                    Print / Delete
                  </th>
                </tr>
              </thead>
              <tbody>
                {billRows.length === 0 && (
                  <EmptyRow
                    colSpan={12}
                    message={`FY ${selectedFY} में कोई Bill नहीं है।`}
                  />
                )}
                {sortedBillRows.map((bill) => {
                  const head = headMap.get(bill.ledgerHeadId);
                  const netAmount = bill.netAmount || String(
                    Math.max(0, num(bill.amount) - num(bill.deductionAmount)),
                  );
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50">
                      <Td className="font-mono font-bold text-slate-700">
                        {billSerialNumber(bill.billNo, bill.id)}
                      </Td>
                      <Td className="min-w-52 whitespace-normal font-mono text-xs font-semibold text-slate-900">
                        {bill.billNo}
                      </Td>
                      <Td>{fmtDate(bill.billDate)}</Td>
                      <Td className="min-w-48 whitespace-normal">
                        <span className="text-xs font-semibold text-emerald-800">
                          Net: {bill.chequeNo || "-"}
                        </span>
                        <br />
                        <span className="text-[10px] text-slate-500">
                          {fmtDate(bill.chequeDate)} · {inr(netAmount)}
                        </span>
                        {num(bill.deductionAmount) > 0 && (
                          <>
                            <br />
                            <span className="text-xs font-semibold text-amber-800">
                              Deduction: {bill.deductionChequeNo || "-"}
                            </span>
                            <br />
                            <span className="text-[10px] text-slate-500">
                              {fmtDate(bill.deductionChequeDate)} · {inr(bill.deductionAmount)}
                            </span>
                          </>
                        )}
                      </Td>
                      <Td className="max-w-44 whitespace-normal">{bill.vendorName}</Td>
                      <Td className="max-w-60 whitespace-normal">
                        <span className="font-semibold">
                          {head?.nameHindi ?? head?.name ?? "-"}
                        </span>
                        {head?.nameHindi && (
                          <span className="mt-0.5 block text-[10px] text-slate-500">
                            {head.name}
                          </span>
                        )}
                      </Td>
                      <Td right className="font-semibold">{inr(bill.amount)}</Td>
                      <Td right className="text-red-700">
                        {inr(bill.deductionAmount)}
                      </Td>
                      <Td right className="font-bold text-emerald-700">
                        {inr(netAmount)}
                      </Td>
                      <Td>
                        <Badge color={billColor(bill.status)}>{bill.status}</Badge>
                      </Td>
                      <Td>
                        {(bill.status === "draft" || bill.status === "pending") &&
                        !bill.postedCashbookEntryId ? (
                          <PinProtectedForm
                            action={finalApproveBill}
                            purpose="Bill Final Approval"
                            confirmMessage={`Bill ${bill.billNo} finally approve करें? Gross ${inr(
                              bill.amount,
                            )} Budget से घटेगा और Gross ${inr(
                              bill.amount,
                            )} Cashbook/Ledger में post होगा। Net तथा Deduction cheques Cheque Register में बनेंगे। यह action दोबारा नहीं होगा।`}
                          >
                            <input type="hidden" name="id" value={bill.id} />
                            <input
                              type="hidden"
                              name="returnFinancialYear"
                              value={selectedFY}
                            />
                            <button className="whitespace-nowrap rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                              🔒 Final Approve & Post
                            </button>
                          </PinProtectedForm>
                        ) : bill.postedCashbookEntryId ? (
                          <div>
                            <Badge color="green">Posted</Badge>
                            <p className="mt-1 text-[10px] text-slate-500">
                              Cashbook #{bill.postedCashbookEntryId}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Locked</span>
                        )}
                      </Td>
                      <Td className="border-r-0">
                        <div className="flex flex-col items-start gap-2">
                          <a
                            href={`/bills-budget/voucher/${bill.id}`}
                            className="whitespace-nowrap text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                          >
                            🖨️ Bill / PDF
                          </a>
                          <DeleteBillButton
                            id={bill.id}
                            billNo={bill.billNo}
                            approved={Boolean(bill.postedCashbookEntryId)}
                            financialYear={selectedFY}
                          />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold">
                  <td
                    colSpan={6}
                    className="border-r border-slate-300 px-3 py-3 text-right text-sm text-slate-800"
                  >
                    TOTAL / कुल योग ({billRows.length} Bills)
                  </td>
                  <td className="border-r border-slate-300 px-3 py-3 text-right font-mono text-sm tabular-nums">
                    {inr(totalBillGross)}
                  </td>
                  <td className="border-r border-slate-300 px-3 py-3 text-right font-mono text-sm tabular-nums text-red-800">
                    {inr(totalBillDeduction)}
                  </td>
                  <td className="border-r border-slate-300 px-3 py-3 text-right font-mono text-sm tabular-nums text-emerald-800">
                    {inr(totalBillNet)}
                  </td>
                  <td colSpan={3} className="px-3 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Budget expenditure में केवल Approved और Paid bills का Gross Amount शामिल होता है। Pending/Rejected bills शामिल नहीं होते। Pending approval: {pendingBills}.
          </p>
        </Card>
      </div>
    </div>
  );
}
