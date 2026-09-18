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
  searchParams: Promise<{ head?: string; from?: string; to?: string }>;
}) {
  const { head, from, to } = await searchParams;
  const heads = await db
    .select()
    .from(ledgerHeads)
    .orderBy(asc(ledgerHeads.type), asc(ledgerHeads.code));
  const incomeHeads = heads.filter((item) => item.type === "income");
  const expenseHeads = heads.filter((item) => item.type === "expense");
  const otherHeads = heads.filter(
    (item) => item.type !== "income" && item.type !== "expense",
  );
  const selectedId = head ? parseInt(head, 10) : incomeHeads[0]?.id ?? expenseHeads[0]?.id ?? heads[0]?.id;
  const selected = heads.find((item) => item.id === selectedId);

  const allEntries = selected
    ? await db
        .select()
        .from(cashbookEntries)
        .where(eq(cashbookEntries.ledgerHeadId, selected.id))
        .orderBy(asc(cashbookEntries.entryDate), asc(cashbookEntries.id))
    : [];

  const validFrom = /^\d{4}-\d{2}-\d{2}$/.test(from ?? "") ? from! : null;
  const validTo = /^\d{4}-\d{2}-\d{2}$/.test(to ?? "") ? to! : null;
  const hasDateFilter = Boolean(validFrom || validTo);
  const invalidDateRange = Boolean(validFrom && validTo && validFrom > validTo);
  const carryEntries =
    hasDateFilter && !invalidDateRange && validFrom
      ? allEntries.filter((entry) => entry.entryDate < validFrom)
      : [];
  const filteredEntries = invalidDateRange
    ? allEntries
    : allEntries.filter(
        (entry) =>
          (!validFrom || entry.entryDate >= validFrom) &&
          (!validTo || entry.entryDate <= validTo),
      );
  const carryBalance = carryEntries.reduce((balance, entry) => {
    const amount = num(entry.amount);
    return balance + (entry.entryType === "receipt" ? amount : -amount);
  }, 0);
  let running = carryBalance;
  const rows = filteredEntries.map((entry) => {
    const amount = num(entry.amount);
    running += entry.entryType === "receipt" ? amount : -amount;
    return { ...entry, running };
  });
  const filterParams = new URLSearchParams();
  if (validFrom && !invalidDateRange) filterParams.set("from", validFrom);
  if (validTo && !invalidDateRange) filterParams.set("to", validTo);
  const headHref = (headId: number) => {
    const params = new URLSearchParams(filterParams);
    params.set("head", String(headId));
    return `/ledger?${params.toString()}`;
  };
  const partyLedgerHref = filterParams.size
    ? `/ledger/party?${filterParams.toString()}`
    : "/ledger/party";

  const typeColor = (t: string) =>
    t === "income" ? "green" : t === "expense" ? "red" : t === "asset" ? "blue" : "amber";

  return (
    <div>
      <PageHeader
        title="Ledger"
        hindi="खाता बही"
        subtitle="Head-wise and party-wise account ledger with running balance"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/ledger"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          📚 Head-wise Ledger / मदवार खाता
        </Link>
        <Link
          href={partyLedgerHref}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-700"
        >
          👥 Party-wise Ledger / पार्टीवार खाता
        </Link>
      </div>

      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm"
      >
        {selectedId && <input type="hidden" name="head" value={selectedId} />}
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
          <Link
            href={selectedId ? `/ledger?head=${selectedId}` : "/ledger"}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear Filter
          </Link>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="space-y-6">
          <Card title="Ledger Heads / लेखा मद">
            <div className="max-h-[34rem] space-y-5 overflow-y-auto pr-1">
              <section>
                <div className="mb-2 flex items-center justify-between border-b border-emerald-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Income Heads / आय मद
                  </h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {incomeHeads.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {incomeHeads.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={headHref(item.id)}
                        prefetch={false}
                        className={`block rounded-lg px-3 py-2 text-sm transition ${
                          item.id === selectedId
                            ? "bg-emerald-600 font-semibold text-white shadow-sm"
                            : "text-slate-700 hover:bg-emerald-50"
                        }`}
                      >
                        <span className="block truncate">
                          <span className="mr-1 font-mono text-xs">[{item.code}]</span>
                          {item.name}
                        </span>
                        {item.nameHindi && (
                          <span
                            className={`block truncate text-xs ${
                              item.id === selectedId
                                ? "text-emerald-100"
                                : "text-emerald-700"
                            }`}
                          >
                            {item.nameHindi}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                  {incomeHeads.length === 0 && (
                    <li className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-400">
                      No income heads available.
                    </li>
                  )}
                </ul>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between border-b border-red-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-red-700">
                    Expense Heads / व्यय मद
                  </h3>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                    {expenseHeads.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {expenseHeads.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={headHref(item.id)}
                        prefetch={false}
                        className={`block rounded-lg px-3 py-2 text-sm transition ${
                          item.id === selectedId
                            ? "bg-red-600 font-semibold text-white shadow-sm"
                            : "text-slate-700 hover:bg-red-50"
                        }`}
                      >
                        <span className="block truncate">
                          <span className="mr-1 font-mono text-xs">[{item.code}]</span>
                          {item.name}
                        </span>
                        {item.nameHindi && (
                          <span
                            className={`block truncate text-xs ${
                              item.id === selectedId ? "text-red-100" : "text-red-700"
                            }`}
                          >
                            {item.nameHindi}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                  {expenseHeads.length === 0 && (
                    <li className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-400">
                      No expense heads available.
                    </li>
                  )}
                </ul>
              </section>

              {otherHeads.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between border-b border-blue-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700">
                      Other Heads / अन्य मद
                    </h3>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      {otherHeads.length}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {otherHeads.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={headHref(item.id)}
                          prefetch={false}
                          className={`block rounded-lg px-3 py-2 text-sm transition ${
                            item.id === selectedId
                              ? "bg-blue-600 font-semibold text-white"
                              : "text-slate-700 hover:bg-blue-50"
                          }`}
                        >
                          <span className="font-mono text-xs">[{item.code}]</span>{" "}
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
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
          title={
            selected
              ? `Ledger: ${selected.nameHindi ?? selected.name} / ${selected.name} (${selected.code})`
              : "Ledger"
          }
          className="xl:col-span-3"
        >
          {selected && (
            <div className="mb-4 flex items-center gap-3">
              <Badge color={typeColor(selected.type)}>{selected.type.toUpperCase()}</Badge>
              <span className="text-sm text-slate-500">
                Closing Balance:{" "}
                <span
                  className={`font-bold ${
                    running >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {inr(running)}
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
                {validFrom && !invalidDateRange && (
                  <tr className="bg-amber-50">
                    <Td>{fmtDate(validFrom)}</Td>
                    <Td>B/F</Td>
                    <Td className="font-semibold">Balance Brought Forward / आगे लाया शेष</Td>
                    <Td><Badge color="amber">Opening</Badge></Td>
                    <Td right>—</Td>
                    <Td right>—</Td>
                    <Td
                      right
                      className={`font-bold ${
                        carryBalance >= 0 ? "text-slate-800" : "text-red-600"
                      }`}
                    >
                      {inr(carryBalance)}
                    </Td>
                  </tr>
                )}
                {rows.length === 0 && (
                  <EmptyRow
                    colSpan={7}
                    message={
                      hasDateFilter
                        ? "Selected date range में कोई transaction नहीं है।"
                        : "No transactions posted to this head yet."
                    }
                  />
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
