import PinProtectedForm from "@/components/PinProtectedForm";
import { db } from "@/db";
import { staffMembers, staffPayments } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import {
  addStaffMember,
  addStaffPayment,
  updateStaffPaymentStatus,
  updateStaffStatus,
  deleteStaffMember,
  deleteStaffPayment,
} from "@/lib/actions";
import HindiField from "@/components/HindiField";
import { fmtDate, inr, num, todayISO } from "@/lib/format";
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

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default async function StaffPaymentsPage() {
  const [staff, payments] = await Promise.all([
    db.select().from(staffMembers).orderBy(asc(staffMembers.employeeCode)),
    db.select().from(staffPayments).orderBy(desc(staffPayments.paymentMonth), desc(staffPayments.id)),
  ]);
  const staffMap = new Map(staff.map((member) => [member.id, member]));

  const gross = payments.reduce(
    (sum, payment) => sum + num(payment.basicAmount) + num(payment.allowanceAmount),
    0,
  );
  const deductions = payments.reduce(
    (sum, payment) => sum + num(payment.deductionAmount) + num(payment.tdsAmount),
    0,
  );
  const paid = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + num(payment.netAmount), 0);

  return (
    <div>
      <PageHeader
        title="Staff Salary & Other Payments"
        hindi="कर्मचारी वेतन एवं अन्य भुगतान"
        subtitle="Employee master, monthly payroll, arrears, allowances and reimbursements"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Staff" value={String(staff.filter((s) => s.status === "active").length)} icon="👥" accent="blue" />
        <StatCard label="Gross Pay Registered" value={inr(gross)} icon="🧾" accent="amber" />
        <StatCard label="Deductions + TDS" value={inr(deductions)} icon="➖" accent="red" />
        <StatCard label="Net Amount Paid" value={inr(paid)} icon="✅" accent="emerald" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Add Staff Member / कर्मचारी जोड़ें">
          <form action={addStaffMember} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Employee Code *</label>
                <input name="employeeCode" placeholder="EMP-001" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Designation *</label>
                <input name="designation" placeholder="Accountant" required className={inputCls} />
              </div>
            </div>
            <HindiField
              label="Employee Name (English) *"
              hindiLabel="कर्मचारी नाम (हिन्दी) — स्वतः"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Employment Type</label>
                <select name="employmentType" className={inputCls}>
                  <option value="regular">Regular</option>
                  <option value="contract">Contract</option>
                  <option value="outsourced">Outsourced</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Basic Pay (₹)</label>
                <input type="number" min="0" step="0.01" name="basicPay" defaultValue="0" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>PAN</label>
                <input name="pan" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Bank Account No.</label>
                <input name="bankAccount" className={inputCls} />
              </div>
            </div>
            <button className={btnCls + " w-full"}>Add Staff Member</button>
          </form>
        </Card>

        <Card title="Record Salary / Other Payment">
          <form action={addStaffPayment} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Employee *</label>
              <select name="staffId" required className={inputCls}>
                <option value="">-- select employee --</option>
                {staff.filter((s) => s.status === "active").map((member) => (
                  <option key={member.id} value={member.id}>
                    [{member.employeeCode}] {member.nameHindi ?? member.name} · {member.designation} · Basic {inr(member.basicPay)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Payment Month *</label>
              <input type="month" name="paymentMonth" defaultValue={currentMonth()} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Payment Type</label>
              <select name="paymentType" className={inputCls}>
                <option value="salary">Salary / वेतन</option>
                <option value="allowance">Allowance / भत्ता</option>
                <option value="arrear">Arrear / एरियर</option>
                <option value="advance">Advance / अग्रिम</option>
                <option value="reimbursement">Reimbursement / प्रतिपूर्ति</option>
                <option value="other">Other Payment / अन्य</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Basic / Main Amount (₹)</label>
              <input type="number" min="0" step="0.01" name="basicAmount" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Allowances / Extra (₹)</label>
              <input type="number" min="0" step="0.01" name="allowanceAmount" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Other Deductions (₹)</label>
              <input type="number" min="0" step="0.01" name="deductionAmount" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>TDS Deduction (₹)</label>
              <input type="number" min="0" step="0.01" name="tdsAmount" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Voucher No.</label>
              <input name="voucherNo" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select name="status" className={inputCls}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Payment Date</label>
              <input type="date" name="paymentDate" defaultValue={todayISO()} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Remarks</label>
              <input name="remarks" className={inputCls} />
            </div>
            <div className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Net payment is calculated automatically: Basic + Allowances − Other Deductions − TDS.
            </div>
            <div className="sm:col-span-2">
              <button className={btnCls + " w-full"}>Save Payment</button>
            </div>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Salary & Payment Register">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Month</Th>
                  <Th>Employee</Th>
                  <Th>Type / Voucher</Th>
                  <Th right>Basic</Th>
                  <Th right>Allowance</Th>
                  <Th right>Deduction</Th>
                  <Th right>TDS</Th>
                  <Th right>Net Pay</Th>
                  <Th>Status</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && <EmptyRow colSpan={10} message="No staff payments recorded yet." />}
                {payments.map((payment) => {
                  const member = staffMap.get(payment.staffId);
                  return (
                    <tr key={payment.id} className="align-top hover:bg-slate-50">
                      <Td>{payment.paymentMonth}</Td>
                      <Td>
                        <span className="font-semibold">{member?.name ?? "-"}</span>
                        <br /><span className="text-xs text-slate-500">{member?.employeeCode} · {member?.designation}</span>
                      </Td>
                      <Td><span className="capitalize">{payment.paymentType}</span><br /><span className="text-xs text-slate-500">{payment.voucherNo || "No voucher"}</span></Td>
                      <Td right>{inr(payment.basicAmount)}</Td>
                      <Td right>{inr(payment.allowanceAmount)}</Td>
                      <Td right className="text-red-600">{inr(payment.deductionAmount)}</Td>
                      <Td right className="text-red-600">{inr(payment.tdsAmount)}</Td>
                      <Td right className="font-bold text-emerald-700">{inr(payment.netAmount)}</Td>
                      <Td>
                        <Badge color={payment.status === "paid" ? "green" : "amber"}>{payment.status}</Badge>
                        {payment.status !== "paid" && (
                          <PinProtectedForm action={updateStaffPaymentStatus} className="mt-2 flex min-w-52 gap-1">
                            <input type="hidden" name="id" value={payment.id} />
                            <input type="hidden" name="status" value="paid" />
                            <input type="date" name="paymentDate" defaultValue={todayISO()} className="min-w-0 rounded border border-slate-300 px-1 py-1 text-xs" />
                            <button className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">Mark Paid</button>
                          </PinProtectedForm>
                        )}
                        {payment.paymentDate && <p className="mt-1 text-[11px] text-slate-500">{fmtDate(payment.paymentDate)}</p>}
                      </Td>
                      <Td>
                        <PinProtectedForm action={deleteStaffPayment}>
                          <input type="hidden" name="id" value={payment.id} />
                          <button className="text-xs font-semibold text-red-600">Delete</button>
                        </PinProtectedForm>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Staff Master">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Employee</Th>
                  <Th>Designation</Th>
                  <Th>Type</Th>
                  <Th>PAN / Bank</Th>
                  <Th right>Basic Pay</Th>
                  <Th>Status</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 && <EmptyRow colSpan={7} message="No employees added yet." />}
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50">
                    <Td><span className="font-semibold">[{member.employeeCode}] {member.name}</span>{member.nameHindi && <><br /><span className="text-xs text-emerald-700">{member.nameHindi}</span></>}</Td>
                    <Td>{member.designation}</Td>
                    <Td className="capitalize">{member.employmentType}</Td>
                    <Td>{member.pan || "-"}<br /><span className="text-xs text-slate-500">A/c {member.bankAccount ? `····${member.bankAccount.slice(-4)}` : "-"}</span></Td>
                    <Td right>{inr(member.basicPay)}</Td>
                    <Td>
                      <PinProtectedForm action={updateStaffStatus} className="flex gap-1">
                        <input type="hidden" name="id" value={member.id} />
                        <select name="status" defaultValue={member.status} className="rounded border border-slate-300 px-2 py-1 text-xs">
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                        </select>
                        <button className="rounded bg-slate-800 px-2 py-1 text-xs text-white">Set</button>
                      </PinProtectedForm>
                    </Td>
                    <Td>
                      <PinProtectedForm action={deleteStaffMember}>
                        <input type="hidden" name="id" value={member.id} />
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
