import PinProtectedForm from "@/components/PinProtectedForm";
import { db } from "@/db";
import { tdsReturns } from "@/db/schema";
import { desc } from "drizzle-orm";
import { addTdsReturn, deleteTdsReturn, updateTdsReturn } from "@/lib/actions";
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

const statusColor = (status: string) =>
  status === "filed" || status === "revised"
    ? "green"
    : status === "deposited"
      ? "blue"
      : "amber";

export default async function TdsReturnsPage() {
  const rows = await db
    .select()
    .from(tdsReturns)
    .orderBy(desc(tdsReturns.financialYear), desc(tdsReturns.quarter), desc(tdsReturns.id));

  const totalTaxable = rows.reduce((sum, row) => sum + num(row.taxableAmount), 0);
  const totalTds = rows.reduce((sum, row) => sum + num(row.tdsAmount), 0);
  const totalLateFee = rows.reduce((sum, row) => sum + num(row.interestLateFee), 0);
  const pending = rows.filter((row) => row.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="TDS Returns"
        hindi="टी.डी.एस. रिटर्न"
        subtitle="Quarter-wise TDS challan deposit, filing and acknowledgement register"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Taxable Amount" value={inr(totalTaxable)} icon="🧮" accent="blue" />
        <StatCard label="TDS Amount" value={inr(totalTds)} icon="🏛️" accent="emerald" />
        <StatCard label="Interest / Late Fee" value={inr(totalLateFee)} icon="⚠️" accent="red" />
        <StatCard label="Returns Pending" value={String(pending)} icon="⏳" accent="amber" />
      </div>

      <div className="mt-6">
        <Card title="Add TDS Return / Challan Record">
          <form action={addTdsReturn} className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
            <div>
              <label className={labelCls}>Financial Year *</label>
              <input name="financialYear" defaultValue={currentFY()} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Quarter</label>
              <select name="quarter" className={inputCls}>
                <option value="Q1">Q1 · Apr–Jun</option>
                <option value="Q2">Q2 · Jul–Sep</option>
                <option value="Q3">Q3 · Oct–Dec</option>
                <option value="Q4">Q4 · Jan–Mar</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Form Type</label>
              <select name="formType" className={inputCls}>
                <option value="24Q">24Q · Salary</option>
                <option value="26Q">26Q · Non-salary</option>
                <option value="27Q">27Q · Non-resident</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>TDS Section *</label>
              <select name="section" required className={inputCls}>
                <option value="192">192 · Salary</option>
                <option value="194C">194C · Contractor</option>
                <option value="194J">194J · Professional fees</option>
                <option value="194I">194I · Rent</option>
                <option value="194H">194H · Commission</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Taxable Amount (₹)</label>
              <input type="number" min="0" step="0.01" name="taxableAmount" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>TDS Amount (₹)</label>
              <input type="number" min="0" step="0.01" name="tdsAmount" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Interest / Late Fee (₹)</label>
              <input type="number" min="0" step="0.01" name="interestLateFee" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select name="status" className={inputCls}>
                <option value="pending">Pending</option>
                <option value="deposited">Challan Deposited</option>
                <option value="filed">Return Filed</option>
                <option value="revised">Revised Return</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Challan No.</label>
              <input name="challanNo" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>BSR Code</label>
              <input name="bsrCode" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Deposit Date</label>
              <input type="date" name="depositDate" defaultValue={todayISO()} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Filing Date</label>
              <input type="date" name="filingDate" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Acknowledgement No.</label>
              <input name="acknowledgementNo" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Remarks</label>
              <input name="remarks" className={inputCls} />
            </div>
            <div className="flex items-end">
              <button className={btnCls + " w-full"}>Save TDS Record</button>
            </div>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="TDS Return Register">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>FY / Quarter</Th>
                  <Th>Form / Section</Th>
                  <Th>Challan / BSR</Th>
                  <Th>Deposit Date</Th>
                  <Th right>Taxable</Th>
                  <Th right>TDS</Th>
                  <Th right>Late Fee</Th>
                  <Th>Status / Filing</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <EmptyRow colSpan={9} message="No TDS return or challan records yet." />}
                {rows.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-slate-50">
                    <Td><span className="font-semibold">{row.financialYear}</span><br /><span className="text-xs text-slate-500">{row.quarter}</span></Td>
                    <Td><span className="font-semibold">Form {row.formType}</span><br /><span className="text-xs text-slate-500">Section {row.section}</span></Td>
                    <Td>{row.challanNo || "-"}<br /><span className="text-xs text-slate-500">BSR: {row.bsrCode || "-"}</span></Td>
                    <Td>{fmtDate(row.depositDate)}</Td>
                    <Td right>{inr(row.taxableAmount)}</Td>
                    <Td right className="font-bold text-emerald-700">{inr(row.tdsAmount)}</Td>
                    <Td right className="text-red-600">{inr(row.interestLateFee)}</Td>
                    <Td>
                      <Badge color={statusColor(row.status)}>{row.status}</Badge>
                      <PinProtectedForm action={updateTdsReturn} className="mt-2 grid min-w-64 grid-cols-2 gap-1">
                        <input type="hidden" name="id" value={row.id} />
                        <select name="status" defaultValue={row.status} className="rounded border border-slate-300 px-2 py-1 text-xs">
                          <option value="pending">Pending</option>
                          <option value="deposited">Deposited</option>
                          <option value="filed">Filed</option>
                          <option value="revised">Revised</option>
                        </select>
                        <input type="date" name="filingDate" defaultValue={row.filingDate ?? ""} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                        <input name="acknowledgementNo" defaultValue={row.acknowledgementNo ?? ""} placeholder="Acknowledgement" className="rounded border border-slate-300 px-2 py-1 text-xs" />
                        <button className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-white">Update</button>
                      </PinProtectedForm>
                      {row.filingDate && <p className="mt-1 text-[11px] text-slate-500">Filed {fmtDate(row.filingDate)}</p>}
                    </Td>
                    <Td>
                      <PinProtectedForm action={deleteTdsReturn}>
                        <input type="hidden" name="id" value={row.id} />
                        <button className="text-xs font-semibold text-red-600">Delete</button>
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
