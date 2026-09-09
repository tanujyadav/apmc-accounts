"use server";

import { db } from "@/db";
import {
  ledgerHeads,
  bankAccounts,
  cashbookEntries,
  cashbookOpeningBalances,
  cheques,
  brsStatements,
  cashDeposits,
  cashDepositAllocations,
  budgets,
  bills,
  apmcProfile,
  parties,
  shops,
  shopCollections,
  staffMembers,
  staffPayments,
  tdsReturns,
  revenueTargets,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function s(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function n(fd: FormData, key: string): string {
  const v = parseFloat(String(fd.get(key) ?? "0"));
  return isNaN(v) ? "0" : v.toFixed(2);
}
function i(fd: FormData, key: string): number {
  return parseInt(String(fd.get(key) ?? "0"), 10);
}

// ---------- APMC Profile ----------
export async function saveApmcProfile(fd: FormData) {
  const mandiName = s(fd, "mandiName");
  if (!mandiName) return;
  const values = {
    mandiName,
    mandiNameHindi: s(fd, "mandiNameHindi") || null,
    address: s(fd, "address") || null,
    district: s(fd, "district") || null,
    state: s(fd, "state") || "Uttar Pradesh",
    pincode: s(fd, "pincode") || null,
    phone: s(fd, "phone") || null,
    email: s(fd, "email") || null,
    gstin: s(fd, "gstin") || null,
    updatedAt: new Date(),
  };
  const existing = await db.select().from(apmcProfile).limit(1);
  if (existing.length > 0) {
    await db.update(apmcProfile).set(values).where(eq(apmcProfile.id, existing[0].id));
  } else {
    await db.insert(apmcProfile).values(values);
  }
  revalidatePath("/", "layout");
}

// ---------- Party Directory ----------
export async function addParty(fd: FormData) {
  const name = s(fd, "name");
  if (!name) return;
  await db.insert(parties).values({
    name,
    nameHindi: s(fd, "nameHindi") || null,
    partyType: s(fd, "partyType") || "trader",
    contactPerson: s(fd, "contactPerson") || null,
    phone: s(fd, "phone") || null,
    email: s(fd, "email") || null,
    address: s(fd, "address") || null,
    gstin: s(fd, "gstin") || null,
    licenseNo: s(fd, "licenseNo") || null,
  });
  revalidatePath("/", "layout");
}

export async function togglePartyStatus(fd: FormData) {
  const id = i(fd, "id");
  const status = s(fd, "status") === "active" ? "inactive" : "active";
  await db.update(parties).set({ status }).where(eq(parties.id, id));
  revalidatePath("/settings");
}

export async function deleteParty(fd: FormData) {
  await db.delete(parties).where(eq(parties.id, i(fd, "id")));
  revalidatePath("/settings");
}

export async function deleteLedgerHead(fd: FormData) {
  const id = i(fd, "id");
  if (!id) redirect("/settings?headDelete=failed");

  let deleted = false;
  try {
    await db.transaction(async (tx) => {
      // Remove dependent records first so PostgreSQL can safely delete the head.
      // The confirmation in the UI clearly warns the user about this cascade.
      await tx.delete(cashbookEntries).where(eq(cashbookEntries.ledgerHeadId, id));
      await tx.delete(bills).where(eq(bills.ledgerHeadId, id));
      await tx.delete(budgets).where(eq(budgets.ledgerHeadId, id));
      await tx.delete(revenueTargets).where(eq(revenueTargets.ledgerHeadId, id));
      const result = await tx
        .delete(ledgerHeads)
        .where(eq(ledgerHeads.id, id))
        .returning({ id: ledgerHeads.id });
      deleted = result.length > 0;
    });
  } catch {
    deleted = false;
  }

  revalidatePath("/", "layout");
  redirect(`/settings?headDelete=${deleted ? "success" : "failed"}`);
}

// ---------- Ledger Heads ----------
export async function addLedgerHead(fd: FormData) {
  const name = s(fd, "name");
  if (!name) return;
  await db.insert(ledgerHeads).values({
    code: s(fd, "code") || "GEN",
    name,
    nameHindi: s(fd, "nameHindi") || null,
    type: s(fd, "type") || "expense",
  });
  revalidatePath("/", "layout");
}

export async function updateLedgerHead(fd: FormData) {
  const id = i(fd, "id");
  const name = s(fd, "name");
  if (!id || !name) return;
  await db
    .update(ledgerHeads)
    .set({
      code: s(fd, "code") || "GEN",
      name,
      nameHindi: s(fd, "nameHindi") || null,
      type: s(fd, "type") || "expense",
    })
    .where(eq(ledgerHeads.id, id));
  revalidatePath("/", "layout");
  redirect("/settings");
}

// ---------- Bank Accounts ----------
export async function addBankAccount(fd: FormData) {
  const bankName = s(fd, "bankName");
  if (!bankName) return;
  await db.insert(bankAccounts).values({
    bankName,
    branch: s(fd, "branch"),
    accountNumber: s(fd, "accountNumber"),
    ifscCode: s(fd, "ifscCode"),
    accountType: s(fd, "accountType") || "Current",
    openingBalance: n(fd, "openingBalance"),
    openingBalanceDate: s(fd, "openingBalanceDate") || null,
  });
  revalidatePath("/", "layout");
}

export async function toggleBankStatus(fd: FormData) {
  const id = i(fd, "id");
  const status = s(fd, "status") === "active" ? "closed" : "active";
  await db.update(bankAccounts).set({ status }).where(eq(bankAccounts.id, id));
  revalidatePath("/bank-accounts");
}

export async function updateBankOpeningBalance(fd: FormData) {
  const id = i(fd, "id");
  if (!id) return;
  await db
    .update(bankAccounts)
    .set({
      openingBalance: n(fd, "openingBalance"),
      openingBalanceDate: s(fd, "openingBalanceDate") || null,
    })
    .where(eq(bankAccounts.id, id));
  revalidatePath("/bank-accounts");
  revalidatePath("/", "layout");
}

// ---------- Cashbook ----------
export async function addCashbookEntry(fd: FormData) {
  const amount = n(fd, "amount");
  const ledgerHeadId = i(fd, "ledgerHeadId");
  if (!ledgerHeadId || amount === "0.00") return;
  const mode = s(fd, "mode") || "cash";
  const bankId = i(fd, "bankAccountId");
  await db.insert(cashbookEntries).values({
    entryDate: s(fd, "entryDate") || new Date().toISOString().slice(0, 10),
    voucherNo: s(fd, "voucherNo") || "-",
    entryType: s(fd, "entryType") || "receipt",
    mode,
    ledgerHeadId,
    bankAccountId: mode === "cash" ? null : bankId || null,
    chequeNo: mode === "cheque" ? s(fd, "chequeNo") || null : null,
    partyName: s(fd, "partyName") || null,
    particulars: s(fd, "particulars") || "-",
    amount,
  });
  revalidatePath("/", "layout");
}

export async function deleteCashbookEntry(fd: FormData) {
  await db.delete(cashbookEntries).where(eq(cashbookEntries.id, i(fd, "id")));
  revalidatePath("/", "layout");
}

export async function saveCashbookOpeningBalance(fd: FormData) {
  const financialYear = s(fd, "financialYear");
  if (!financialYear) return;

  const values = {
    openingDate: s(fd, "openingDate") || null,
    openingCash: n(fd, "openingCash"),
    openingBank: n(fd, "openingBank"),
    remarks: s(fd, "remarks") || null,
    updatedAt: new Date(),
  };
  const existing = await db
    .select({ id: cashbookOpeningBalances.id })
    .from(cashbookOpeningBalances)
    .where(eq(cashbookOpeningBalances.financialYear, financialYear))
    .limit(1);

  if (existing[0]) {
    await db
      .update(cashbookOpeningBalances)
      .set(values)
      .where(eq(cashbookOpeningBalances.id, existing[0].id));
  } else {
    await db.insert(cashbookOpeningBalances).values({ financialYear, ...values });
  }

  revalidatePath("/cashbook");
  redirect(`/cashbook?fy=${encodeURIComponent(financialYear)}&balanceSaved=1`);
}

export async function addCashbookReceipt(fd: FormData) {
  const entryDate = s(fd, "entryDate") || new Date().toISOString().slice(0, 10);
  const voucherNo = s(fd, "voucherNo");
  const partyName = s(fd, "partyName");
  const particulars = s(fd, "particulars") || "Receipt entry";
  const sourceMode = s(fd, "sourceMode") || "cash";
  const chequeNo = s(fd, "chequeNo") || null;
  const headIds = fd.getAll("ledgerHeadId").map((value) => Number(value));
  const destinations = fd.getAll("destination").map(String);
  const bankIds = fd.getAll("bankAccountId").map((value) => Number(value));
  const amounts = fd.getAll("amount").map((value) => Number(value));

  if (!voucherNo || !partyName) return;

  const values = headIds.flatMap((ledgerHeadId, index) => {
    const amount = amounts[index] ?? 0;
    const destination = destinations[index] ?? "cash";
    const bankAccountId = bankIds[index] || null;
    if (!ledgerHeadId || amount <= 0) return [];
    const mode = destination === "cash" ? "cash" : sourceMode === "cheque" ? "cheque" : "bank";
    return [{
      entryDate,
      voucherNo,
      entryType: "receipt",
      mode,
      ledgerHeadId,
      bankAccountId: destination === "bank" ? bankAccountId : null,
      chequeNo: mode === "cheque" ? chequeNo : null,
      partyName,
      particulars,
      amount: amount.toFixed(2),
    }];
  });

  if (values.length > 0) await db.insert(cashbookEntries).values(values);
  revalidatePath("/", "layout");
  const returnFinancialYear = s(fd, "returnFinancialYear");
  redirect(
    returnFinancialYear
      ? `/cashbook?fy=${encodeURIComponent(returnFinancialYear)}`
      : "/cashbook",
  );
}

export async function addCashbookPayment(fd: FormData) {
  const ledgerHeadId = i(fd, "ledgerHeadId");
  const amount = Number(n(fd, "amount"));
  const mode = s(fd, "mode") || "bank";
  const bankAccountId = i(fd, "bankAccountId") || null;
  const voucherNo = s(fd, "voucherNo");
  const partyName = s(fd, "partyName");
  if (!ledgerHeadId || amount <= 0 || !voucherNo || !partyName) return;

  await db.insert(cashbookEntries).values({
    entryDate: s(fd, "entryDate") || new Date().toISOString().slice(0, 10),
    voucherNo,
    entryType: "payment",
    mode,
    ledgerHeadId,
    bankAccountId: mode === "cash" ? null : bankAccountId,
    chequeNo: mode === "cheque" ? s(fd, "chequeNo") || null : null,
    partyName,
    particulars: s(fd, "particulars") || "Payment entry",
    amount: amount.toFixed(2),
  });
  revalidatePath("/", "layout");
  const returnFinancialYear = s(fd, "returnFinancialYear");
  redirect(
    returnFinancialYear
      ? `/cashbook?fy=${encodeURIComponent(returnFinancialYear)}`
      : "/cashbook",
  );
}

// ---------- BRS ----------
export async function saveBrsStatement(fd: FormData) {
  const bankAccountId = i(fd, "bankAccountId");
  const statementMonth = s(fd, "statementMonth");
  if (!bankAccountId || !statementMonth) return;

  const values = {
    bankInterest: n(fd, "bankInterest"),
    indirectDeposits: n(fd, "indirectDeposits"),
    otherReceipts: n(fd, "otherReceipts"),
    bankCharges: n(fd, "bankCharges"),
    otherExpenses: n(fd, "otherExpenses"),
    passbookBalance: n(fd, "passbookBalance"),
    remarks: s(fd, "remarks") || null,
    updatedAt: new Date(),
  };
  const existing = await db
    .select({ id: brsStatements.id })
    .from(brsStatements)
    .where(
      and(
        eq(brsStatements.bankAccountId, bankAccountId),
        eq(brsStatements.statementMonth, statementMonth),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(brsStatements)
      .set(values)
      .where(eq(brsStatements.id, existing[0].id));
  } else {
    await db.insert(brsStatements).values({
      bankAccountId,
      statementMonth,
      ...values,
    });
  }
  revalidatePath("/brs");
  redirect(
    `/brs?bank=${bankAccountId}&month=${encodeURIComponent(statementMonth)}&saved=1`,
  );
}

export async function reconcileEntry(fd: FormData) {
  const id = i(fd, "id");
  await db
    .update(cashbookEntries)
    .set({
      reconciled: true,
      reconciledDate: s(fd, "reconciledDate") || new Date().toISOString().slice(0, 10),
    })
    .where(eq(cashbookEntries.id, id));
  revalidatePath("/brs");
}

export async function unreconcileEntry(fd: FormData) {
  await db
    .update(cashbookEntries)
    .set({ reconciled: false, reconciledDate: null })
    .where(eq(cashbookEntries.id, i(fd, "id")));
  revalidatePath("/brs");
}

// ---------- Cheques ----------
export async function addCheque(fd: FormData) {
  const chequeNo = s(fd, "chequeNo");
  if (!chequeNo) return;
  await db.insert(cheques).values({
    chequeNo,
    chequeDate: s(fd, "chequeDate") || new Date().toISOString().slice(0, 10),
    bankAccountId: i(fd, "bankAccountId"),
    partyName: s(fd, "partyName"),
    amount: n(fd, "amount"),
    direction: s(fd, "direction") || "issued",
    remarks: s(fd, "remarks") || null,
  });
  revalidatePath("/cheques");
}

export async function updateChequeStatus(fd: FormData) {
  await db
    .update(cheques)
    .set({ status: s(fd, "status") })
    .where(eq(cheques.id, i(fd, "id")));
  revalidatePath("/cheques");
}

// ---------- Cash Deposits ----------
export async function addCashDeposit(fd: FormData) {
  const bankAccountId = i(fd, "bankAccountId");
  const depositDate = s(fd, "depositDate") || new Date().toISOString().slice(0, 10);
  const slipNo = s(fd, "slipNo");
  const depositedBy = s(fd, "depositedBy");
  const receiptIds = fd.getAll("cashbookEntryId").map((value) => Number(value));
  const requestedAmounts = fd.getAll("allocatedAmount").map((value) => Number(value));
  if (!bankAccountId || !slipNo || !depositedBy) return;

  let saved = false;
  try {
    await db.transaction(async (tx) => {
      const cashReceipts = await tx
        .select()
        .from(cashbookEntries)
        .where(
          and(
            eq(cashbookEntries.entryType, "receipt"),
            eq(cashbookEntries.mode, "cash"),
          ),
        );
      const previousAllocations = await tx.select().from(cashDepositAllocations);
      const receiptMap = new Map(cashReceipts.map((receipt) => [receipt.id, receipt]));
      const allocatedMap = new Map<number, number>();
      for (const allocation of previousAllocations) {
        allocatedMap.set(
          allocation.cashbookEntryId,
          (allocatedMap.get(allocation.cashbookEntryId) ?? 0) + Number(allocation.allocatedAmount),
        );
      }

      const allocations = receiptIds.flatMap((cashbookEntryId, index) => {
        const requested = requestedAmounts[index] ?? 0;
        const receipt = receiptMap.get(cashbookEntryId);
        if (!receipt || requested <= 0) return [];
        if (depositDate < receipt.entryDate) {
          throw new Error("Deposit date cannot be before the receipt date");
        }
        const available = Number(receipt.amount) - (allocatedMap.get(cashbookEntryId) ?? 0);
        if (requested > available + 0.005) {
          throw new Error("Deposit allocation exceeds pending receipt balance");
        }
        return [{ cashbookEntryId, allocatedAmount: requested.toFixed(2) }];
      });
      const total = allocations.reduce(
        (sum, allocation) => sum + Number(allocation.allocatedAmount),
        0,
      );
      if (total <= 0) throw new Error("No cash receipt amount selected");

      const [deposit] = await tx
        .insert(cashDeposits)
        .values({
          depositDate,
          bankAccountId,
          slipNo,
          amount: total.toFixed(2),
          depositedBy,
          remarks: s(fd, "remarks") || null,
        })
        .returning({ id: cashDeposits.id });

      await tx.insert(cashDepositAllocations).values(
        allocations.map((allocation) => ({
          cashDepositId: deposit.id,
          cashbookEntryId: allocation.cashbookEntryId,
          allocatedAmount: allocation.allocatedAmount,
        })),
      );
      saved = true;
    });
  } catch {
    saved = false;
  }

  revalidatePath("/", "layout");
  redirect(`/deposits?deposit=${saved ? "saved" : "failed"}`);
}

export async function deleteCashDeposit(fd: FormData) {
  await db.delete(cashDeposits).where(eq(cashDeposits.id, i(fd, "id")));
  revalidatePath("/", "layout");
  redirect("/deposits?deposit=deleted");
}

// ---------- Budgets ----------
export async function addBudget(fd: FormData) {
  const ledgerHeadId = i(fd, "ledgerHeadId");
  if (!ledgerHeadId) return;
  await db.insert(budgets).values({
    financialYear: s(fd, "financialYear"),
    ledgerHeadId,
    allocatedAmount: n(fd, "allocatedAmount"),
    remarks: s(fd, "remarks") || null,
  });
  revalidatePath("/bills-budget");
}

// ---------- Bills ----------
export async function addBill(fd: FormData) {
  const billNo = s(fd, "billNo");
  if (!billNo) return;
  await db.insert(bills).values({
    billNo,
    billDate: s(fd, "billDate") || new Date().toISOString().slice(0, 10),
    vendorName: s(fd, "vendorName"),
    description: s(fd, "description"),
    ledgerHeadId: i(fd, "ledgerHeadId"),
    financialYear: s(fd, "financialYear"),
    amount: n(fd, "amount"),
  });
  revalidatePath("/bills-budget");
}

export async function updateBillStatus(fd: FormData) {
  const status = s(fd, "status");
  await db
    .update(bills)
    .set({
      status,
      paymentDate:
        status === "paid" ? new Date().toISOString().slice(0, 10) : null,
    })
    .where(eq(bills.id, i(fd, "id")));
  revalidatePath("/bills-budget");
}

// ---------- Shop Rent & Premium ----------
export async function addShop(fd: FormData) {
  const shopNumber = s(fd, "shopNumber");
  const occupantName = s(fd, "occupantName");
  if (!shopNumber || !occupantName) return;
  await db.insert(shops).values({
    shopNumber,
    block: s(fd, "block") || null,
    propertyType: s(fd, "propertyType") || "shop",
    occupantName,
    mobile: s(fd, "mobile") || null,
    agreementStart: s(fd, "agreementStart") || null,
    agreementEnd: s(fd, "agreementEnd") || null,
    monthlyRent: n(fd, "monthlyRent"),
    premiumTotal: n(fd, "premiumTotal"),
  });
  revalidatePath("/shop-rent");
}

export async function updateShopStatus(fd: FormData) {
  await db
    .update(shops)
    .set({ status: s(fd, "status") || "active" })
    .where(eq(shops.id, i(fd, "id")));
  revalidatePath("/shop-rent");
}

export async function addShopCollection(fd: FormData) {
  const shopId = i(fd, "shopId");
  if (!shopId) return;
  const rent = Number(n(fd, "rentAmount"));
  const premium = Number(n(fd, "premiumAmount"));
  const penalty = Number(n(fd, "penaltyAmount"));
  const paid = Number(n(fd, "amountPaid"));
  const demand = rent + premium + penalty;
  const status = paid <= 0 ? "pending" : paid >= demand ? "paid" : "partial";
  await db.insert(shopCollections).values({
    shopId,
    demandMonth: s(fd, "demandMonth"),
    receiptDate: paid > 0 ? s(fd, "receiptDate") || new Date().toISOString().slice(0, 10) : null,
    receiptNo: s(fd, "receiptNo") || null,
    rentAmount: rent.toFixed(2),
    premiumAmount: premium.toFixed(2),
    penaltyAmount: penalty.toFixed(2),
    amountPaid: paid.toFixed(2),
    paymentMode: s(fd, "paymentMode") || "cash",
    status,
    remarks: s(fd, "remarks") || null,
  });
  revalidatePath("/shop-rent");
}

export async function updateShopCollection(fd: FormData) {
  const rent = Number(n(fd, "rentAmount"));
  const premium = Number(n(fd, "premiumAmount"));
  const penalty = Number(n(fd, "penaltyAmount"));
  const paid = Number(n(fd, "amountPaid"));
  const demand = rent + premium + penalty;
  const status = paid <= 0 ? "pending" : paid >= demand ? "paid" : "partial";
  await db
    .update(shopCollections)
    .set({
      receiptDate: paid > 0 ? s(fd, "receiptDate") || new Date().toISOString().slice(0, 10) : null,
      receiptNo: s(fd, "receiptNo") || null,
      amountPaid: paid.toFixed(2),
      paymentMode: s(fd, "paymentMode") || "cash",
      status,
    })
    .where(eq(shopCollections.id, i(fd, "id")));
  revalidatePath("/shop-rent");
}

export async function deleteShopCollection(fd: FormData) {
  await db.delete(shopCollections).where(eq(shopCollections.id, i(fd, "id")));
  revalidatePath("/shop-rent");
}

export async function deleteShop(fd: FormData) {
  const id = i(fd, "id");
  await db.transaction(async (tx) => {
    await tx.delete(shopCollections).where(eq(shopCollections.shopId, id));
    await tx.delete(shops).where(eq(shops.id, id));
  });
  revalidatePath("/shop-rent");
}

// ---------- Staff Salary & Other Payments ----------
export async function addStaffMember(fd: FormData) {
  const employeeCode = s(fd, "employeeCode");
  const name = s(fd, "name");
  if (!employeeCode || !name) return;
  await db.insert(staffMembers).values({
    employeeCode,
    name,
    nameHindi: s(fd, "nameHindi") || null,
    designation: s(fd, "designation"),
    employmentType: s(fd, "employmentType") || "regular",
    pan: s(fd, "pan") || null,
    bankAccount: s(fd, "bankAccount") || null,
    basicPay: n(fd, "basicPay"),
  });
  revalidatePath("/staff-payments");
}

export async function updateStaffStatus(fd: FormData) {
  await db
    .update(staffMembers)
    .set({ status: s(fd, "status") || "active" })
    .where(eq(staffMembers.id, i(fd, "id")));
  revalidatePath("/staff-payments");
}

export async function addStaffPayment(fd: FormData) {
  const staffId = i(fd, "staffId");
  if (!staffId) return;
  const basic = Number(n(fd, "basicAmount"));
  const allowance = Number(n(fd, "allowanceAmount"));
  const deduction = Number(n(fd, "deductionAmount"));
  const tds = Number(n(fd, "tdsAmount"));
  const net = Math.max(0, basic + allowance - deduction - tds);
  const status = s(fd, "status") || "pending";
  await db.insert(staffPayments).values({
    staffId,
    paymentMonth: s(fd, "paymentMonth"),
    paymentDate: status === "paid" ? s(fd, "paymentDate") || new Date().toISOString().slice(0, 10) : null,
    paymentType: s(fd, "paymentType") || "salary",
    basicAmount: basic.toFixed(2),
    allowanceAmount: allowance.toFixed(2),
    deductionAmount: deduction.toFixed(2),
    tdsAmount: tds.toFixed(2),
    netAmount: net.toFixed(2),
    voucherNo: s(fd, "voucherNo") || null,
    status,
    remarks: s(fd, "remarks") || null,
  });
  revalidatePath("/staff-payments");
}

export async function updateStaffPaymentStatus(fd: FormData) {
  const status = s(fd, "status") || "pending";
  await db
    .update(staffPayments)
    .set({
      status,
      paymentDate: status === "paid" ? s(fd, "paymentDate") || new Date().toISOString().slice(0, 10) : null,
    })
    .where(eq(staffPayments.id, i(fd, "id")));
  revalidatePath("/staff-payments");
}

export async function deleteStaffPayment(fd: FormData) {
  await db.delete(staffPayments).where(eq(staffPayments.id, i(fd, "id")));
  revalidatePath("/staff-payments");
}

export async function deleteStaffMember(fd: FormData) {
  const id = i(fd, "id");
  await db.transaction(async (tx) => {
    await tx.delete(staffPayments).where(eq(staffPayments.staffId, id));
    await tx.delete(staffMembers).where(eq(staffMembers.id, id));
  });
  revalidatePath("/staff-payments");
}

// ---------- TDS Returns ----------
export async function addTdsReturn(fd: FormData) {
  const financialYear = s(fd, "financialYear");
  const section = s(fd, "section");
  if (!financialYear || !section) return;
  await db.insert(tdsReturns).values({
    financialYear,
    quarter: s(fd, "quarter") || "Q1",
    formType: s(fd, "formType") || "24Q",
    section,
    challanNo: s(fd, "challanNo") || null,
    bsrCode: s(fd, "bsrCode") || null,
    depositDate: s(fd, "depositDate") || null,
    taxableAmount: n(fd, "taxableAmount"),
    tdsAmount: n(fd, "tdsAmount"),
    interestLateFee: n(fd, "interestLateFee"),
    filingDate: s(fd, "filingDate") || null,
    acknowledgementNo: s(fd, "acknowledgementNo") || null,
    status: s(fd, "status") || "pending",
    remarks: s(fd, "remarks") || null,
  });
  revalidatePath("/tds-returns");
}

export async function updateTdsReturn(fd: FormData) {
  await db
    .update(tdsReturns)
    .set({
      status: s(fd, "status") || "pending",
      filingDate: s(fd, "filingDate") || null,
      acknowledgementNo: s(fd, "acknowledgementNo") || null,
    })
    .where(eq(tdsReturns.id, i(fd, "id")));
  revalidatePath("/tds-returns");
}

export async function deleteTdsReturn(fd: FormData) {
  await db.delete(tdsReturns).where(eq(tdsReturns.id, i(fd, "id")));
  revalidatePath("/tds-returns");
}

// ---------- Revenue Progress ----------
export async function saveRevenueTarget(fd: FormData) {
  const financialYear = s(fd, "financialYear");
  const ledgerHeadId = i(fd, "ledgerHeadId");
  if (!financialYear || !ledgerHeadId) return;
  const targetAmount = n(fd, "targetAmount");
  const existing = await db
    .select({ id: revenueTargets.id })
    .from(revenueTargets)
    .where(
      and(
        eq(revenueTargets.financialYear, financialYear),
        eq(revenueTargets.ledgerHeadId, ledgerHeadId),
      ),
    )
    .limit(1);
  if (existing[0]) {
    await db
      .update(revenueTargets)
      .set({ targetAmount, remarks: s(fd, "remarks") || null })
      .where(eq(revenueTargets.id, existing[0].id));
  } else {
    await db.insert(revenueTargets).values({
      financialYear,
      ledgerHeadId,
      targetAmount,
      remarks: s(fd, "remarks") || null,
    });
  }
  revalidatePath("/revenue-progress");
}

export async function deleteRevenueTarget(fd: FormData) {
  await db.delete(revenueTargets).where(eq(revenueTargets.id, i(fd, "id")));
  revalidatePath("/revenue-progress");
}
