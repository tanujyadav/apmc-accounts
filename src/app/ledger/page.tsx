import { db } from "@/db";
import { cashbookEntries, ledgerHeads } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { addLedgerHead } from "@/lib/actions";
import HindiField from "@/components/HindiField";
import { inr, num, fmtDate } from "@/lib/format";
import {
  PageHeader, Card, Th, Td, Badge, EmptyRow, inputCls, labelCls, btnCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ head?: string }>;
}) {
  const { head } = await searchParams;
  const heads = await db.select().from(ledgerHeads).orderBy(asc(ledgerHeads.type), asc(ledgerHeads.code));
  const selectedId = head ? parseInt(head, 10) : heads[0]?.id;
  const selected = heads.find((h) => h.id === selectedId);

  const entries = selected
    ? await db
        .select()
        .from(cashbookEntries)
        .where(eq(cashbookEntries.ledgerHeadId, selected.id))
        .orderBy(asc(cashbookEntries.entryDate), asc(cashbookEntries.id))
    : [];

  let running = 0;
  const rows = entries.map((e) => {
    const amt = num(e.amount);
    running += e.entryType === "receipt" ? amt : -amt;
    return { ...e, running };
  });

  const typeColor = (t: string) =>
    t === "income" ? "green" : t === "expense" ? "red" : t === "asset" ? "blue" : "amber";

  return (
    <div>
      <PageHeader
        title="Ledger"
        hindi="खाता बही"
        subtitle="Head-wise account ledger with running balance"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="space-y-6">
          <Card title="Ledger Heads">
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {heads.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/ledger?head=${h.id}`}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                      h.id === selectedId
                        ? "bg-emerald-600 font-semibold text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="truncate">
                      <span className="mr-1 font-mono text-xs">[{h.code}]</span>
                      {h.name}
                      {h.nameHindi && (
                        <span className={`block text-xs ${h.id === selectedId ? "text-emerald-100" : "text-emerald-700"}`}>
                          {h.nameHindi}
                        </span>
                      )}
                    </span>
                    <span className={`ml-2 text-[10px] uppercase ${h.id === selectedId ? "text-emerald-100" : "text-slate-400"}`}>
                      {h.type}
                    </span>
                  </Link>
                </li>
              ))}
              {heads.length === 0 && <li className="text-sm text-slate-400">No heads yet.</li>}
            </ul>
          </Card>

          <Card title="Add Ledger Head">
            <form action={addLedgerHead} className="space-y-3">
              <div>
                <label className={labelCls}>Code</label>
                <input name="code" placeholder="e.g. MF-01" className={inputCls} />
              </div>
              <HindiField
                label="Head Name"
                hindiLabel="हिन्दी नाम — स्वतः"
                placeholder="e.g. Mandi Shulk"
                required
              />
              <div>
                <label className={labelCls}>Type</label>
                <select name="type" className={inputCls}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                </select>
              </div>
              <button className={btnCls + " w-full"}>Add Head</button>
            </form>
          </Card>
        </div>

        <Card
          title={selected ? `Ledger: ${selected.name} (${selected.code})` : "Ledger"}
          className="xl:col-span-3"
        >
          {selected && (
            <div className="mb-4 flex items-center gap-3">
              <Badge color={typeColor(selected.type)}>{selected.type.toUpperCase()}</Badge>
              <span className="text-sm text-slate-500">
                Closing Balance:{" "}
                <span className={`font-bold ${running >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {inr(Math.abs(running))} {running >= 0 ? "Cr" : "Dr"}
                </span>
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Voucher</Th>
                  <Th>Particulars</Th>
                  <Th>Mode</Th>
                  <Th right>Credit (Receipt)</Th>
                  <Th right>Debit (Payment)</Th>
                  <Th right>Balance</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <EmptyRow colSpan={7} message="No transactions posted to this head yet." />
                )}
                {rows.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td>{fmtDate(e.entryDate)}</Td>
                    <Td>{e.voucherNo}</Td>
                    <Td className="max-w-[240px] truncate">{e.particulars}</Td>
                    <Td><Badge>{e.mode}</Badge></Td>
                    <Td right className="text-emerald-700">
                      {e.entryType === "receipt" ? inr(e.amount) : "—"}
                    </Td>
                    <Td right className="text-red-600">
                      {e.entryType === "payment" ? inr(e.amount) : "—"}
                    </Td>
                    <Td right className={`font-semibold ${e.running >= 0 ? "text-slate-800" : "text-red-600"}`}>
                      {inr(Math.abs(e.running))} {e.running >= 0 ? "Cr" : "Dr"}
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
