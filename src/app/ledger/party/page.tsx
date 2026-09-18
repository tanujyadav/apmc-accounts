import Link from "next/link";
import { asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { cashbookEntries, ledgerHeads, parties } from "@/db/schema";
import {
  Badge,
  Card,
  EmptyRow,
  PageHeader,
  Td,
  Th,
  btnCls,
  inputCls,
  labelCls,
} from "@/components/ui";
import { fmtDate, inr, num } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PartyLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ party?: string; from?: string; to?: string }>;
}) {
  const { party, from, to } = await searchParams;
  const [heads, directory, transactionParties] = await Promise.all([
    db.select().from(ledgerHeads),
    db.select().from(parties).orderBy(asc(parties.name)),
    db
      .selectDistinct({ partyName: cashbookEntries.partyName })
      .from(cashbookEntries)
      .where(isNotNull(cashbookEntries.partyName)),
  ]);
  const headMap = new Map(heads.map((head) => [head.id, head]));
  const partyNames = [
    ...new Set([
      ...directory.map((item) => item.name),
      ...transactionParties
        .map((entry) => entry.partyName?.trim())
        .filter((name): name is string => Boolean(name)),
    ]),
  ].sort((a, b) => a.localeCompare(b, "en-IN"));
  const selectedParty = partyNames.includes(party ?? "")
    ? party!
    : partyNames[0];
  const allPartyEntries = selectedParty
    ? await db
        .select()
        .from(cashbookEntries)
        .where(eq(cashbookEntries.partyName, selectedParty))
        .orderBy(asc(cashbookEntries.entryDate), asc(cashbookEntries.id))
    : [];
  const validFrom = /^\d{4}-\d{2}-\d{2}$/.test(from ?? "") ? from! : null;
  const validTo = /^\d{4}-\d{2}-\d{2}$/.test(to ?? "") ? to! : null;
  const hasDateFilter = Boolean(validFrom || validTo);
  const invalidDateRange = Boolean(validFrom && validTo && validFrom > validTo);
  const carryEntries =
    validFrom && !invalidDateRange
      ? allPartyEntries.filter((entry) => entry.entryDate < validFrom)
      : [];
  const partyEntries = invalidDateRange
    ? allPartyEntries
    : allPartyEntries.filter(
        (entry) =>
          (!validFrom || entry.entryDate >= validFrom) &&
          (!validTo || entry.entryDate <= validTo),
      );
  const carryBalance = carryEntries.reduce((balance, entry) => {
    const amount = num(entry.amount);
    return balance + (entry.entryType === "receipt" ? amount : -amount);
  }, 0);
  let running = carryBalance;
  const rows = partyEntries.map((entry) => {
    const amount = num(entry.amount);
    running += entry.entryType === "receipt" ? amount : -amount;
    return { ...entry, running };
  });
  const totalReceipts = partyEntries
    .filter((entry) => entry.entryType === "receipt")
    .reduce((sum, entry) => sum + num(entry.amount), 0);
  const totalPayments = partyEntries
    .filter((entry) => entry.entryType === "payment")
    .reduce((sum, entry) => sum + num(entry.amount), 0);
  const filterParams = new URLSearchParams();
  if (validFrom && !invalidDateRange) filterParams.set("from", validFrom);
  if (validTo && !invalidDateRange) filterParams.set("to", validTo);
  const partyHref = (name: string) => {
    const params = new URLSearchParams(filterParams);
    params.set("party", name);
    return `/ledger/party?${params.toString()}`;
  };
  const headLedgerHref = filterParams.size
    ? `/ledger?${filterParams.toString()}`
    : "/ledger";
  const directoryParty = directory.find((item) => item.name === selectedParty);

  return (
    <div>
      <PageHeader
        title="Party-wise Ledger"
        hindi="पार्टीवार खाता बही"
        subtitle="All receipts and payments grouped by depositor, payee or registered party"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/ledger"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
        >
          📚 Head-wise Ledger / मदवार खाता
        </Link>
        <Link
          href="/ledger/party"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          👥 Party-wise Ledger / पार्टीवार खाता
        </Link>
      </div>

      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm"
      >
        {selectedParty && (
          <input type="hidden" name="party" value={selectedParty} />
        )}
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
            href={
              selectedParty
                ? `/ledger/party?party=${encodeURIComponent(selectedParty)}`
                : "/ledger/party"
            }
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
        <Card title={`Party Directory / पार्टी सूची (${partyNames.length})`}>
          <div className="max-h-[38rem] space-y-1 overflow-y-auto pr-1">
            {partyNames.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-3 py-5 text-center text-sm text-slate-400">
                कोई Party उपलब्ध नहीं है।
              </p>
            )}
            {partyNames.map((name) => {
              const item = directory.find((entry) => entry.name === name);
              return (
                <Link
                  key={name}
                  href={partyHref(name)}
                  prefetch={false}
                  className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                    name === selectedParty
                      ? "bg-blue-600 font-semibold text-white shadow-sm"
                      : "text-slate-700 hover:bg-blue-50"
                  }`}
                >
                  <span className="block truncate">{name}</span>
                  {item?.nameHindi && (
                    <span
                      className={`block truncate text-xs ${
                        name === selectedParty ? "text-blue-100" : "text-blue-700"
                      }`}
                    >
                      {item.nameHindi}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </Card>

        <Card
          title={
            selectedParty
              ? `Party Ledger: ${
                  directoryParty?.nameHindi
                    ? `${directoryParty.nameHindi} / ${selectedParty}`
                    : selectedParty
                }`
              : "Party Ledger"
          }
          className="xl:col-span-3"
        >
          {selectedParty && (
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-emerald-700">Total Receipts</p>
                <p className="mt-1 font-bold text-emerald-900">{inr(totalReceipts)}</p>
              </div>
              <div className="rounded-lg bg-red-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-red-700">Total Payments</p>
                <p className="mt-1 font-bold text-red-900">{inr(totalPayments)}</p>
              </div>
              <div className="rounded-lg bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-blue-700">Closing Balance</p>
                <p className={`mt-1 font-bold ${running >= 0 ? "text-blue-900" : "text-red-700"}`}>
                  {inr(running)}
                </p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Voucher</Th>
                  <Th>Account Head / लेखा मद</Th>
                  <Th>Particulars</Th>
                  <Th>Mode</Th>
                  <Th right>Receipt</Th>
                  <Th right>Payment</Th>
                  <Th right>Balance</Th>
                </tr>
              </thead>
              <tbody>
                {validFrom && !invalidDateRange && (
                  <tr className="bg-amber-50">
                    <Td>{fmtDate(validFrom)}</Td>
                    <Td>B/F</Td>
                    <Td className="font-semibold">Balance Brought Forward</Td>
                    <Td>आगे लाया शेष</Td>
                    <Td><Badge color="amber">Opening</Badge></Td>
                    <Td right>—</Td>
                    <Td right>—</Td>
                    <Td
                      right
                      className={`font-bold ${
                        carryBalance >= 0 ? "text-slate-800" : "text-red-700"
                      }`}
                    >
                      {inr(carryBalance)}
                    </Td>
                  </tr>
                )}
                {rows.length === 0 && (
                  <EmptyRow
                    colSpan={8}
                    message={
                      hasDateFilter
                        ? "Selected date range में इस Party की कोई transaction नहीं है।"
                        : "इस Party के लिए कोई transaction नहीं है।"
                    }
                  />
                )}
                {rows.map((entry) => {
                  const head = headMap.get(entry.ledgerHeadId);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <Td>{fmtDate(entry.entryDate)}</Td>
                      <Td className="font-mono text-xs font-semibold">{entry.voucherNo}</Td>
                      <Td>
                        <span className="font-semibold">{head?.nameHindi ?? head?.name ?? "-"}</span>
                        <br />
                        <span className="text-xs text-slate-500">[{head?.code ?? "-"}] {head?.name}</span>
                      </Td>
                      <Td className="max-w-60 whitespace-normal">{entry.particulars}</Td>
                      <Td><Badge>{entry.mode}</Badge></Td>
                      <Td right className="font-semibold text-emerald-700">
                        {entry.entryType === "receipt" ? inr(entry.amount) : "—"}
                      </Td>
                      <Td right className="font-semibold text-red-700">
                        {entry.entryType === "payment" ? inr(entry.amount) : "—"}
                      </Td>
                      <Td right className={`font-bold ${entry.running >= 0 ? "text-slate-800" : "text-red-700"}`}>
                        {inr(entry.running)}
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
