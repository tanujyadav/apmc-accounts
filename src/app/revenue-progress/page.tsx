import Link from "next/link";
import { db } from "@/db";
import { cashbookEntries, ledgerHeads, revenueTargets } from "@/db/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { deleteRevenueTarget, saveRevenueTarget } from "@/lib/actions";
import { currentFY, inr, num } from "@/lib/format";
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

const monthLabels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

function financialYearBounds(financialYear: string) {
  const parsed = Number(financialYear.slice(0, 4));
  const fallback = Number(currentFY().slice(0, 4));
  const year = Number.isFinite(parsed) ? parsed : fallback;
  return { start: `${year}-04-01`, end: `${year + 1}-03-31`, year };
}

export default async function RevenueProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const { fy } = await searchParams;
  const selectedFY = fy || currentFY();
  const { start, end, year } = financialYearBounds(selectedFY);

  const [incomeHeads, targets, receipts] = await Promise.all([
    db
      .select()
      .from(ledgerHeads)
      .where(eq(ledgerHeads.type, "income"))
      .orderBy(asc(ledgerHeads.code)),
    db
      .select()
      .from(revenueTargets)
      .where(eq(revenueTargets.financialYear, selectedFY)),
    db
      .select()
      .from(cashbookEntries)
      .where(
        and(
          eq(cashbookEntries.entryType, "receipt"),
          gte(cashbookEntries.entryDate, start),
          lte(cashbookEntries.entryDate, end),
        ),
      ),
  ]);

  const targetMap = new Map(targets.map((target) => [target.ledgerHeadId, target]));
  const actualMap = new Map<number, number>();
  const monthlyActual = Array.from({ length: 12 }, () => 0);

  for (const receipt of receipts) {
    const amount = num(receipt.amount);
    actualMap.set(receipt.ledgerHeadId, (actualMap.get(receipt.ledgerHeadId) ?? 0) + amount);
    const dateParts = receipt.entryDate.split("-");
    const calendarMonth = Number(dateParts[1]);
    const fyMonthIndex = calendarMonth >= 4 ? calendarMonth - 4 : calendarMonth + 8;
    if (fyMonthIndex >= 0 && fyMonthIndex < 12) monthlyActual[fyMonthIndex] += amount;
  }

  const totalTarget = targets.reduce((sum, target) => sum + num(target.targetAmount), 0);
  const totalActual = incomeHeads.reduce((sum, head) => sum + (actualMap.get(head.id) ?? 0), 0);
  const totalBalance = totalTarget - totalActual;
  const achievement = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
  const monthlyTarget = totalTarget / 12;
  const fyOptions = Array.from({ length: 5 }, (_, index) => {
    const startYear = year - 2 + index;
    return `${startYear}-${String(startYear + 1).slice(-2)}`;
  });

  return (
    <div>
      <PageHeader
        title="Revenue Progress"
        hindi="राजस्व प्रगति"
        subtitle="Financial-year targets versus actual Cashbook income receipts"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {fyOptions.map((option) => (
          <Link
            key={option}
            href={`/revenue-progress?fy=${option}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              option === selectedFY
                ? "bg-emerald-600 text-white shadow"
                : "border border-slate-300 bg-white text-slate-600 hover:border-emerald-500"
            }`}
          >
            FY {option}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Annual Revenue Target" value={inr(totalTarget)} icon="🎯" accent="blue" />
        <StatCard label="Actual Collection" value={inr(totalActual)} icon="📈" accent="emerald" />
        <StatCard label={totalBalance >= 0 ? "Target Balance" : "Above Target"} value={inr(Math.abs(totalBalance))} icon={totalBalance >= 0 ? "⏳" : "🏆"} accent={totalBalance >= 0 ? "amber" : "emerald"} />
        <StatCard label="Achievement" value={`${achievement.toFixed(1)}%`} icon="📊" accent={achievement >= 100 ? "emerald" : achievement >= 75 ? "blue" : "amber"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Set / Update Revenue Target">
          <form action={saveRevenueTarget} className="space-y-3">
            <div>
              <label className={labelCls}>Financial Year</label>
              <input name="financialYear" defaultValue={selectedFY} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Income Head *</label>
              <select name="ledgerHeadId" required className={inputCls}>
                <option value="">-- select income head --</option>
                {incomeHeads.map((head) => (
                  <option key={head.id} value={head.id}>
                    [{head.code}] {head.nameHindi ?? head.name} / {head.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Annual Target Amount (₹)</label>
              <input type="number" min="0" step="0.01" name="targetAmount" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Remarks</label>
              <input name="remarks" className={inputCls} />
            </div>
            <button className={btnCls + " w-full"}>Save Revenue Target</button>
            <p className="text-xs text-slate-400">
              Saving the same financial year and income head updates its existing target.
            </p>
          </form>
        </Card>

        <Card title={`Monthly Revenue Progress · FY ${selectedFY}`} className="xl:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {monthLabels.map((label, index) => {
              const actual = monthlyActual[index];
              const progress = monthlyTarget > 0 ? (actual / monthlyTarget) * 100 : 0;
              return (
                <div key={label} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-500">{label}</span>
                    <span className="text-[11px] font-semibold text-emerald-700">{progress.toFixed(0)}%</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900">{inr(actual)}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${progress >= 100 ? "bg-emerald-500" : progress >= 75 ? "bg-blue-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Monthly target {inr(monthlyTarget)}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Monthly target is the annual target divided equally across 12 months. Actual revenue is calculated from Receipt entries dated {start} to {end}.
          </p>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`Head-wise Revenue Progress · FY ${selectedFY}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Income Head</Th>
                  <Th right>Annual Target</Th>
                  <Th right>Actual Receipt</Th>
                  <Th right>Balance</Th>
                  <Th>Progress</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {incomeHeads.length === 0 && <EmptyRow colSpan={7} message="No income heads are available." />}
                {incomeHeads.map((head) => {
                  const target = targetMap.get(head.id);
                  const targetAmount = num(target?.targetAmount);
                  const actual = actualMap.get(head.id) ?? 0;
                  const balance = targetAmount - actual;
                  const progress = targetAmount > 0 ? (actual / targetAmount) * 100 : 0;
                  return (
                    <tr key={head.id} className="hover:bg-slate-50">
                      <Td className="font-mono font-semibold">{head.code}</Td>
                      <Td>
                        <span className="font-semibold">{head.nameHindi ?? head.name}</span>
                        {head.nameHindi && <><br /><span className="text-xs text-slate-500">{head.name}</span></>}
                      </Td>
                      <Td right>{target ? inr(targetAmount) : <span className="text-slate-400">Not set</span>}</Td>
                      <Td right className="font-bold text-emerald-700">{inr(actual)}</Td>
                      <Td right className={balance < 0 ? "font-bold text-emerald-700" : "font-semibold text-amber-700"}>
                        {target ? inr(Math.abs(balance)) : "-"}
                      </Td>
                      <Td>
                        {target ? (
                          <div className="min-w-36">
                            <div className="flex items-center justify-between gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full ${progress >= 100 ? "bg-emerald-500" : progress >= 75 ? "bg-blue-500" : "bg-amber-500"}`}
                                  style={{ width: `${Math.min(100, progress)}%` }}
                                />
                              </div>
                              <Badge color={progress >= 100 ? "green" : progress >= 75 ? "blue" : "amber"}>{progress.toFixed(1)}%</Badge>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Set a target above</span>
                        )}
                      </Td>
                      <Td>
                        {target && (
                          <form action={deleteRevenueTarget}>
                            <input type="hidden" name="id" value={target.id} />
                            <button className="text-xs font-semibold text-red-600">Remove Target</button>
                          </form>
                        )}
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
