import { db } from "@/db";
import { bills, budgets, ledgerHeads, parties } from "@/db/schema";
import { desc, asc } from "drizzle-orm";
import { addBill, addBudget, updateBillStatus } from "@/lib/actions";
import { inr, num, fmtDate, todayISO, currentFY } from "@/lib/format";
import {
  PageHeader, Card, StatCard, Th, Td, Badge, EmptyRow, inputCls, labelCls, btnCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const billColor = (s: string) =>
  s === "paid" ? "green" : s === "approved" ? "blue" : s === "rejected" ? "red" : "amber";

export default async function BillsBudgetPage() {
  const [billRows, budgetRows, heads, partyRows] = await Promise.all([
    db.select().from(bills).orderBy(desc(bills.billDate), desc(bills.id)),
    db.select().from(budgets).orderBy(desc(budgets.financialYear), asc(budgets.id)),
    db.select().from(ledgerHeads).orderBy(asc(ledgerHeads.type), asc(ledgerHeads.code)),
    db.select().from(parties).orderBy(asc(parties.name)),
  ]);
  const headMap = new Map(
    heads.map((h) => [h.id, `[${h.code}] ${h.nameHindi ?? h.name}`]),
  );
  const fy = currentFY();

  // Budget utilisation: billed amount (approved+paid) per head for current FY
  const utilised = new Map<number, number>();
  for (const b of billRows) {
    if (b.financialYear === fy && (b.status === "approved" || b.status === "paid")) {
      utilised.set(b.ledgerHeadId, (utilised.get(b.ledgerHeadId) ?? 0) + num(b.amount));
    }
  }

  const fyBudgets = budgetRows.filter((b) => b.financialYear === fy);
  const totalAllocated = fyBudgets.reduce((s, b) => s + num(b.allocatedAmount), 0);
  const totalUtilised = [...utilised.values()].reduce((a, b) => a + b, 0);
  const pendingBills = billRows.filter((b) => b.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="Bill & Budget Module"
        hindi="बिल एवं बजट"
        subtitle={`Budget allocation & bill processing · Financial Year ${fy}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label={`Budget Allocated (${fy})`} value={inr(totalAllocated)} icon="🎯" accent="blue" />
        <StatCard label="Budget Utilised" value={inr(totalUtilised)} icon="📊" accent="amber" />
        <StatCard label="Budget Remaining" value={inr(totalAllocated - totalUtilised)} icon="🪙" accent="emerald" />
        <StatCard label="Bills Pending Approval" value={String(pendingBills)} icon="📋" accent="red" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Allocate Budget">
          <form action={addBudget} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Financial Year</label>
                <input name="financialYear" defaultValue={fy} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Allocated Amount (₹)</label>
                <input type="number" step="0.01" min="0" name="allocatedAmount" required className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Budget Head</label>
              <select name="ledgerHeadId" required className={inputCls}>
                <option value="">-- select head --</option>
                {heads.map((h) => (
                  <option key={h.id} value={h.id}>
                    [{h.code}] {h.nameHindi ?? h.name} / {h.name} ({h.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Remarks</label>
              <input name="remarks" className={inputCls} />
            </div>
            <button className={btnCls}>Allocate</button>
          </form>
        </Card>

        <Card title="Enter Bill">
          <form action={addBill} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Bill No.</label>
                <input name="billNo" placeholder="B-101" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Bill Date</label>
                <input type="date" name="billDate" defaultValue={todayISO()} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Amount (₹)</label>
                <input type="number" step="0.01" min="0" name="amount" required className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Vendor / Party</label>
                <input name="vendorName" list="vendor-list" required className={inputCls} />
                <datalist id="vendor-list">
                  {partyRows.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.partyType}
                    </option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelCls}>Budget Head</label>
                <select name="ledgerHeadId" required className={inputCls}>
                  <option value="">-- select head --</option>
                  {heads.map((h) => (
                    <option key={h.id} value={h.id}>
                      [{h.code}] {h.nameHindi ?? h.name} / {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Financial Year</label>
                <input name="financialYear" defaultValue={fy} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <input name="description" placeholder="Work / supply description" required className={inputCls} />
              </div>
            </div>
            <button className={btnCls}>Submit Bill</button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title={`Budget Allocation & Utilisation (${fy})`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Head</Th>
                  <Th right>Allocated</Th>
                  <Th right>Utilised</Th>
                  <Th right>Balance</Th>
                  <Th>Usage</Th>
                </tr>
              </thead>
              <tbody>
                {fyBudgets.length === 0 && (
                  <EmptyRow colSpan={5} message={`No budget allocated for FY ${fy} yet.`} />
                )}
                {fyBudgets.map((b) => {
                  const alloc = num(b.allocatedAmount);
                  const used = utilised.get(b.ledgerHeadId) ?? 0;
                  const pct = alloc > 0 ? Math.min(100, Math.round((used / alloc) * 100)) : 0;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <Td>{headMap.get(b.ledgerHeadId) ?? "-"}</Td>
                      <Td right>{inr(alloc)}</Td>
                      <Td right className="text-amber-700">{inr(used)}</Td>
                      <Td right className={alloc - used < 0 ? "font-bold text-red-600" : "font-semibold text-emerald-700"}>
                        {inr(alloc - used)}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{pct}%</span>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Bill Register">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Bill No.</Th>
                  <Th>Date</Th>
                  <Th>Vendor</Th>
                  <Th>Head</Th>
                  <Th right>Amount</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                  <Th>Print</Th>
                </tr>
              </thead>
              <tbody>
                {billRows.length === 0 && <EmptyRow colSpan={8} message="No bills entered yet." />}
                {billRows.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <Td className="font-semibold">{b.billNo}</Td>
                    <Td>{fmtDate(b.billDate)}</Td>
                    <Td className="max-w-[140px] truncate">{b.vendorName}</Td>
                    <Td className="max-w-[140px] truncate">{headMap.get(b.ledgerHeadId) ?? "-"}</Td>
                    <Td right className="font-semibold">{inr(b.amount)}</Td>
                    <Td><Badge color={billColor(b.status)}>{b.status}</Badge></Td>
                    <Td>
                      <form action={updateBillStatus} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={b.id} />
                        <select name="status" defaultValue={b.status} className="rounded border border-slate-300 px-1.5 py-1 text-xs">
                          <option value="pending">pending</option>
                          <option value="approved">approved</option>
                          <option value="paid">paid</option>
                          <option value="rejected">rejected</option>
                        </select>
                        <button className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700">
                          Set
                        </button>
                      </form>
                    </Td>
                    <Td>
                      <a
                        href={`/bills-budget/voucher/${b.id}`}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                        title="Print bill voucher"
                      >
                        🖨️
                      </a>
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
