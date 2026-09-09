import { db } from "@/db";
import { cheques, bankAccounts, parties } from "@/db/schema";
import { desc, asc } from "drizzle-orm";
import { addCheque, updateChequeStatus } from "@/lib/actions";
import { inr, num, fmtDate, todayISO } from "@/lib/format";
import {
  PageHeader, Card, StatCard, Th, Td, Badge, EmptyRow, inputCls, labelCls, btnCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const statusColor = (s: string) =>
  s === "cleared" ? "green" : s === "bounced" ? "red" : s === "cancelled" ? "slate" : "amber";

export default async function ChequesPage() {
  const [rows, banks, partyRows] = await Promise.all([
    db.select().from(cheques).orderBy(desc(cheques.chequeDate), desc(cheques.id)),
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
        subtitle="Register of cheques issued and received with clearing status"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Cheques Issued" value={String(issued.length)} icon="✍️" accent="blue" />
        <StatCard label="Cheques Received" value={String(received.length)} icon="📥" accent="emerald" />
        <StatCard label="Pending Clearance" value={inr(pendingAmt)} icon="⏳" accent="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Record Cheque">
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
              <label className={labelCls}>Party Name (Payee / Drawer)</label>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Direction</label>
                <select name="direction" className={inputCls}>
                  <option value="issued">Issued (जारी)</option>
                  <option value="received">Received (प्राप्त)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Amount (₹)</label>
                <input type="number" step="0.01" min="0" name="amount" required className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Remarks</label>
              <input name="remarks" className={inputCls} />
            </div>
            <button className={btnCls + " w-full"}>Add to Register</button>
          </form>
        </Card>

        <Card title="Cheque Register" className="xl:col-span-2">
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
                {rows.length === 0 && <EmptyRow colSpan={8} message="No cheques recorded yet." />}
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
                      <form action={updateChequeStatus} className="flex items-center gap-1">
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
