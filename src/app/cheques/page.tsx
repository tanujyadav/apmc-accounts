import PinProtectedForm from "@/components/PinProtectedForm";
import { db } from "@/db";
import { cheques, bankAccounts, parties } from "@/db/schema";
import { and, desc, asc, gte, lte } from "drizzle-orm";
import { addCheque, updateChequeStatus } from "@/lib/actions";
import { inr, num, fmtDate, todayISO } from "@/lib/format";
import {
  PageHeader, Card, StatCard, Th, Td, Badge, EmptyRow, inputCls, labelCls, btnCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const statusColor = (s: string) =>
  s === "cleared" ? "green" : s === "bounced" ? "red" : s === "cancelled" ? "slate" : "amber";

export default async function ChequesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const validFrom = /^\d{4}-\d{2}-\d{2}$/.test(from ?? "") ? from! : null;
  const validTo = /^\d{4}-\d{2}-\d{2}$/.test(to ?? "") ? to! : null;
  const hasDateFilter = Boolean(validFrom || validTo);
  const invalidDateRange = Boolean(validFrom && validTo && validFrom > validTo);
  const dateConditions = [];
  if (!invalidDateRange && validFrom) {
    dateConditions.push(gte(cheques.chequeDate, validFrom));
  }
  if (!invalidDateRange && validTo) {
    dateConditions.push(lte(cheques.chequeDate, validTo));
  }
  const [rows, banks, partyRows] = await Promise.all([
    dateConditions.length
      ? db
          .select()
          .from(cheques)
          .where(and(...dateConditions))
          .orderBy(desc(cheques.chequeDate), desc(cheques.id))
      : db
          .select()
          .from(cheques)
          .orderBy(desc(cheques.chequeDate), desc(cheques.id)),
    db.select().from(bankAccounts).orderBy(asc(bankAccounts.bankName)),
    db.select().from(parties).orderBy(asc(parties.name)),
  ]);
  const bankMap = new Map(banks.map((b) => [b.id, b.bankName]));

  const issued = rows.filter((c) => c.direction === "issued");
  const received = rows.filter((c) => c.direction === "received");
  const pendingAmt = rows
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + num(c.amount), 0);

  return (
    <div>
      <PageHeader
        title="Cheque Register"
        hindi="चेक पंजिका"
        subtitle="Manual entry only for received cheques; issued cheques will sync from payment modules"
      />

      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm"
      >
        <div>
          <label className={labelCls}>From Date / दिनांक से</label>
          <input
            type="date"
            name="from"
            defaultValue={validFrom ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>To Date / दिनांक तक</label>
          <input
            type="date"
            name="to"
            defaultValue={validTo ?? ""}
            className={inputCls}
          />
        </div>
        <button className={btnCls}>Apply Date Filter</button>
        {hasDateFilter && (
          <a
            href="/cheques"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear Filter
          </a>
        )}
        <span className="pb-2 text-xs text-slate-500">
          {hasDateFilter && !invalidDateRange
            ? `${validFrom ? fmtDate(validFrom) : "Beginning"} to ${
                validTo ? fmtDate(validTo) : "Today"
              }`
            : "All dates"}
        </span>
      </form>

      {invalidDateRange && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          From Date, To Date से बाद की नहीं हो सकती। अभी all dates दिख रही हैं।
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Cheques Issued" value={String(issued.length)} icon="✍️" accent="blue" />
        <StatCard label="Cheques Received" value={String(received.length)} icon="📥" accent="emerald" />
        <StatCard label="Pending Clearance" value={inr(pendingAmt)} icon="⏳" accent="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Record Received Cheque / प्राप्त चेक दर्ज करें">
          <form action={addCheque} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Cheque No.</label>
                <input name="chequeNo" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Cheque Date</label>
                <input type="date" name="chequeDate" defaultValue={todayISO()} required className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Bank Account</label>
              <select name="bankAccountId" required className={inputCls}>
                <option value="">-- select bank --</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} ····{b.accountNumber.slice(-4)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Drawer / Party Name</label>
              <input
                name="partyName"
                list="party-list"
                placeholder="e.g. M/s Sharma Traders"
                required
                className={inputCls}
              />
              <datalist id="party-list">
                {partyRows.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.partyType}
                  </option>
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-slate-400">
                Suggestions come from the Party Directory (Settings).
              </p>
            </div>
            <input type="hidden" name="direction" value="received" />
            <div>
              <label className={labelCls}>Amount (₹)</label>
              <input type="number" step="0.01" min="0" name="amount" required className={inputCls} />
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Manual issued/payment cheque entry disabled है। Payment cheques बाद में Bill & Budget और Staff Payment modules से automatic sync होंगे।
            </div>
            <div>
              <label className={labelCls}>Remarks</label>
              <input name="remarks" className={inputCls} />
            </div>
            <button className={btnCls + " w-full"}>Add Received Cheque</button>
          </form>
        </Card>

        <Card
          title={`Cheque Register (${rows.length}${
            hasDateFilter && !invalidDateRange ? " filtered" : ""
          })`}
          className="xl:col-span-2"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Chq No.</Th>
                  <Th>Date</Th>
                  <Th>Bank</Th>
                  <Th>Party</Th>
                  <Th>Direction</Th>
                  <Th right>Amount</Th>
                  <Th>Status</Th>
                  <Th>Update</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <EmptyRow
                    colSpan={8}
                    message={
                      hasDateFilter
                        ? "Selected date range में कोई cheque नहीं है।"
                        : "No cheques recorded yet."
                    }
                  />
                )}
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td className="font-semibold">{c.chequeNo}</Td>
                    <Td>{fmtDate(c.chequeDate)}</Td>
                    <Td>{bankMap.get(c.bankAccountId) ?? "-"}</Td>
                    <Td className="max-w-[160px] truncate">{c.partyName}</Td>
                    <Td>
                      <Badge color={c.direction === "issued" ? "blue" : "green"}>{c.direction}</Badge>
                    </Td>
                    <Td right className="font-semibold">{inr(c.amount)}</Td>
                    <Td>
                      <Badge color={statusColor(c.status)}>{c.status}</Badge>
                    </Td>
                    <Td>
                      <PinProtectedForm action={updateChequeStatus} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={c.id} />
                        <select name="status" defaultValue={c.status} className="rounded border border-slate-300 px-1.5 py-1 text-xs">
                          <option value="pending">pending</option>
                          <option value="cleared">cleared</option>
                          <option value="bounced">bounced</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                        <button className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700">
                          Set
                        </button>
                      </PinProtectedForm>
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
