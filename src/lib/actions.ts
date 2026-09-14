"use server";

import { db } from "@/db";
import {
  appSecuritySettings,
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
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashSecurityPin, verifySecurityPin } from "@/lib/security";

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

async function requireSecurityPin(fd: FormData): Promise<void> {
  const valid = await verifySecurityPin(s(fd, "securityPin"));
  if (!valid) throw new Error("Invalid security PIN");
}

export async function changeSecurityPin(fd: FormData) {
  const currentPin = s(fd, "currentPin");
  const newPin = s(fd, "newPin");
  const confirmPin = s(fd, "confirmPin");
  if (!(await verifySecurityPin(currentPin))) {
    redirect("/settings?pinChanged=invalid");
  }
  if (!/^\d{4,8}$/.test(newPin) || newPin !== confirmPin) {
    redirect("/settings?pinChanged=mismatch");
  }
  const [settings] = await db.select().from(appSecuritySettings).limit(1);
  const values = { pinHash: hashSecurityPin(newPin), updatedAt: new Date() };
  if (settings) {
    await db
      .update(appSecuritySettings)
      .set(values)
      .where(eq(appSecuritySettings.id, settings.id));
  } else {
    await db.insert(appSecuritySettings).values(values);
  }
  revalidatePath("/settings");
  redirect("/settings?pinChanged=success");
}

// ---------- APMC Profile ----------
export async function saveApmcProfile(fd: FormData) {
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
  const id = i(fd, "id");
  const status = s(fd, "status") === "active" ? "inactive" : "active";
  await db.update(parties).set({ status }).where(eq(parties.id, id));
  revalidatePath("/settings");
}

export async function deleteParty(fd: FormData) {
  await requireSecurityPin(fd);
  await db.delete(parties).where(eq(parties.id, i(fd, "id")));
  revalidatePath("/settings");
}

export async function deleteLedgerHead(fd: FormData) {
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
  const id = i(fd, "id");
  const status = s(fd, "status") === "active" ? "closed" : "active";
  await db.update(bankAccounts).set({ status }).where(eq(bankAccounts.id, id));
  revalidatePath("/bank-accounts");
}

export async function updateBankOpeningBalance(fd: FormData) {
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
  await db.delete(cashbookEntries).where(eq(cashbookEntries.id, i(fd, "id")));
  revalidatePath("/", "layout");
}

export async function setupInitialCashbookOpeningBalance(fd: FormData) {
  await requireSecurityPin(fd);
  const financialYear = s(fd, "financialYear");
  const openingDate = s(fd, "openingDate");
  if (!/^\d{4}-\d{2}$/.test(financialYear) || !openingDate) {
    redirect("/settings?openingSetup=invalid");
  }

  // This is intentionally a one-time application setup. Once any opening
  // balance exists, it cannot be edited or inserted again. Operational Data
  // Reset clears this record and makes initial setup available again.
  const existing = await db
    .select({ id: cashbookOpeningBalances.id })
    .from(cashbookOpeningBalances)
    .limit(1);
  if (existing[0]) redirect("/settings?openingSetup=locked");

  const startYear = Number(financialYear.slice(0, 4));
  const periodStart = `${startYear}-04-01`;
  const periodEnd = `${startYear + 1}-03-31`;
  if (openingDate < periodStart || openingDate > periodEnd) {
    redirect("/settings?openingSetup=invalid-date");
  }

  await db.insert(cashbookOpeningBalances).values({
    financialYear,
    openingDate,
    openingCash: n(fd, "openingCash"),
    openingBank: n(fd, "openingBank"),
    remarks: s(fd, "remarks") || null,
    updatedAt: new Date(),
  });

  revalidatePath("/", "layout");
  redirect("/settings?openingSetup=success");
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
  const amounts = fd.getAll("amount").map((value) => Number(value));

  if (!voucherNo || !partyName) return;

  const [incomeHeadRows, bankRows] = await Promise.all([
    db.select().from(ledgerHeads),
    db.select().from(bankAccounts),
  ]);
  const incomeHeadMap = new Map(
    incomeHeadRows.map((head) => [head.id, head]),
  );
  const bankByAccountNumber = new Map(
    bankRows.map((bank) => [bank.accountNumber, bank]),
  );

  const values = headIds.flatMap((ledgerHeadId, index) => {
    const amount = amounts[index] ?? 0;
    const destination = destinations[index] ?? "cash";
    if (!ledgerHeadId || amount <= 0) return [];
    const head = incomeHeadMap.get(ledgerHeadId);
    if (!head || head.type !== "income") {
      throw new Error("Invalid income head for receipt entry");
    }
    const routedAccountNumber =
      head.code === "1-B"
        ? "30410641195"
        : head.code === "5-E" || head.code === "7"
          ? "30386343784"
          : "30386329769";
    const routedBank = bankByAccountNumber.get(routedAccountNumber);
    if (destination === "bank" && !routedBank) {
      throw new Error(`Required bank account ${routedAccountNumber} is missing`);
    }
    const mode =
      destination === "cash"
        ? "cash"
        : sourceMode === "cheque"
          ? "cheque"
          : "bank";
    return [{
      entryDate,
      voucherNo,
      entryType: "receipt",
      mode,
      ledgerHeadId,
      bankAccountId: destination === "bank" ? routedBank!.id : null,
      chequeNo: mode === "cheque" ? chequeNo : null,
      partyName,
      particulars,
      amount: amount.toFixed(2),
    }];
  });

  if (values.length > 0) await db.insert(cashbookEntries).values(values);
  revalidatePath("/", "layout");
  const returnFinancialYear = s(fd, "returnFinancialYear");
  const returnFrom = s(fd, "returnFrom");
  const returnTo = s(fd, "returnTo");
  const returnParams = new URLSearchParams();
  if (returnFinancialYear) returnParams.set("fy", returnFinancialYear);
  if (returnFrom) returnParams.set("from", returnFrom);
  if (returnTo) returnParams.set("to", returnTo);
  redirect(
    returnParams.size > 0
      ? `/cashbook?${returnParams.toString()}`
      : "/cashbook",
  );
}

export async function addCashbookPayment(fd: FormData) {
  const ledgerHeadId = i(fd, "ledgerHeadId");
  const amount = Number(n(fd, "amount"));
  const voucherNo = s(fd, "voucherNo");
  const partyName = s(fd, "partyName");
  if (!ledgerHeadId || amount <= 0 || !voucherNo || !partyName) return;

  const [head] = await db
    .select()
    .from(ledgerHeads)
    .where(eq(ledgerHeads.id, ledgerHeadId))
    .limit(1);
  if (!head || !new Set(["EXP-35", "EXP-36"]).has(head.code)) {
    throw new Error("Only EXP-35 and EXP-36 are allowed as direct Cashbook debits");
  }
  const routedAccountNumber =
    head.code === "EXP-36" ? "30410641195" : "30386329769";
  const [routedBank] = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.accountNumber, routedAccountNumber))
    .limit(1);
  if (!routedBank) {
    throw new Error(`Required bank account ${routedAccountNumber} is missing`);
  }

  await db.insert(cashbookEntries).values({
    entryDate: s(fd, "entryDate") || new Date().toISOString().slice(0, 10),
    voucherNo,
    entryType: "payment",
    mode: "bank",
    ledgerHeadId,
    bankAccountId: routedBank.id,
    chequeNo: null,
    partyName,
    particulars: s(fd, "particulars") || "Mandi Parishad auto withdrawal",
    amount: amount.toFixed(2),
  });
  revalidatePath("/", "layout");
  const returnFinancialYear = s(fd, "returnFinancialYear");
  const returnFrom = s(fd, "returnFrom");
  const returnTo = s(fd, "returnTo");
  const returnParams = new URLSearchParams();
  if (returnFinancialYear) returnParams.set("fy", returnFinancialYear);
  if (returnFrom) returnParams.set("from", returnFrom);
  if (returnTo) returnParams.set("to", returnTo);
  redirect(
    returnParams.size > 0
      ? `/cashbook?${returnParams.toString()}`
      : "/cashbook",
  );
}

// ---------- BRS ----------
export async function saveBrsStatement(fd: FormData) {
  await requireSecurityPin(fd);
  const statementMonth = s(fd, "statementMonth");
  if (!statementMonth) return;

  const values = {
    bankInterest: n(fd, "bankInterest"),
    indirectDeposits: n(fd, "indirectDeposits"),
    otherReceipts: n(fd, "otherReceipts"),
    bankCharges: n(fd, "bankCharges"),
    otherExpenses: n(fd, "otherExpenses"),
    passbookBalance: n(fd, "passbookBalance"),
    cashbookBalanceSnapshot: n(fd, "cashbookBalanceSnapshot"),
    unpresentedChequesSnapshot: n(fd, "unpresentedChequesSnapshot"),
    unpresentedCountSnapshot: i(fd, "unpresentedCountSnapshot"),
    unclearedDepositsSnapshot: n(fd, "unclearedDepositsSnapshot"),
    unclearedCountSnapshot: i(fd, "unclearedCountSnapshot"),
    totalAdditionsSnapshot: n(fd, "totalAdditionsSnapshot"),
    balanceAfterAdditionsSnapshot: n(fd, "balanceAfterAdditionsSnapshot"),
    totalDeductionsSnapshot: n(fd, "totalDeductionsSnapshot"),
    calculatedBalanceSnapshot: n(fd, "calculatedBalanceSnapshot"),
    differenceSnapshot: n(fd, "differenceSnapshot"),
    remarks: s(fd, "remarks") || null,
    updatedAt: new Date(),
  };
  const existing = await db
    .select({ id: brsStatements.id })
    .from(brsStatements)
    .where(
      and(
        isNull(brsStatements.bankAccountId),
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
      bankAccountId: null,
      statementMonth,
      ...values,
    });
  }
  revalidatePath("/brs");
  redirect(`/brs?month=${encodeURIComponent(statementMonth)}&saved=1`);
}

export async function reconcileEntry(fd: FormData) {
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
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
    // Manual register entry is restricted to received cheques. Issued/payment
    // cheques will be generated by Bill & Budget or Staff Payment workflows.
    direction: "received",
    remarks: s(fd, "remarks") || null,
  });
  revalidatePath("/cheques");
}

export async function updateChequeStatus(fd: FormData) {
  await requireSecurityPin(fd);
  const status = s(fd, "status");
  await db
    .update(cheques)
    .set({
      status,
      clearedDate:
        status === "cleared"
          ? s(fd, "clearedDate") || new Date().toISOString().slice(0, 10)
          : null,
    })
    .where(eq(cheques.id, i(fd, "id")));
  revalidatePath("/cheques");
  revalidatePath("/brs");
}

// ---------- Cash Deposits ----------
export async function addCashDeposit(fd: FormData) {
  const depositDate =
    s(fd, "depositDate") || new Date().toISOString().slice(0, 10);
  const depositedBy = s(fd, "depositedBy");
  const sourceKeys = fd.getAll("sourceKey").map(String);
  const destinationBankIds = fd
    .getAll("destinationBankAccountId")
    .map((value) => Number(value));
  const requestedAmounts = fd
    .getAll("allocatedAmount")
    .map((value) => Number(value));
  if (!depositedBy) return;

  let saved = false;
  try {
    await db.transaction(async (tx) => {
      const [
        cashReceipts,
        openingBalances,
        previousAllocations,
        headRows,
        bankRows,
      ] = await Promise.all([
        tx
          .select()
          .from(cashbookEntries)
          .where(
            and(
              eq(cashbookEntries.entryType, "receipt"),
              eq(cashbookEntries.mode, "cash"),
            ),
          ),
        tx.select().from(cashbookOpeningBalances),
        tx.select().from(cashDepositAllocations),
        tx.select().from(ledgerHeads),
        tx.select().from(bankAccounts),
      ]);

      const receiptMap = new Map(
        cashReceipts.map((receipt) => [receipt.id, receipt]),
      );
      const openingMap = new Map(
        openingBalances.map((opening) => [opening.id, opening]),
      );
      const headMap = new Map(headRows.map((head) => [head.id, head]));
      const bankByAccountNumber = new Map(
        bankRows.map((bank) => [bank.accountNumber, bank]),
      );
      const allocatedByReceipt = new Map<number, number>();
      const allocatedByOpening = new Map<number, number>();
      for (const allocation of previousAllocations) {
        if (allocation.cashbookEntryId !== null) {
          allocatedByReceipt.set(
            allocation.cashbookEntryId,
            (allocatedByReceipt.get(allocation.cashbookEntryId) ?? 0) +
              Number(allocation.allocatedAmount),
          );
        }
        if (allocation.cashbookOpeningBalanceId !== null) {
          allocatedByOpening.set(
            allocation.cashbookOpeningBalanceId,
            (allocatedByOpening.get(allocation.cashbookOpeningBalanceId) ?? 0) +
              Number(allocation.allocatedAmount),
          );
        }
      }

      const allocations: Array<{
        bankAccountId: number;
        cashbookEntryId: number | null;
        cashbookOpeningBalanceId: number | null;
        allocatedAmount: string;
      }> = [];

      sourceKeys.forEach((sourceKey, index) => {
        const requested = requestedAmounts[index] ?? 0;
        if (requested <= 0) return;
        const [sourceType, rawId] = sourceKey.split(":");
        const sourceId = Number(rawId);

        if (sourceType === "receipt") {
          const receipt = receiptMap.get(sourceId);
          if (!receipt) throw new Error("Cash receipt was not found");
          if (depositDate < receipt.entryDate) {
            throw new Error("Deposit date cannot be before receipt date");
          }
          const available =
            Number(receipt.amount) - (allocatedByReceipt.get(sourceId) ?? 0);
          if (requested > available + 0.005) {
            throw new Error("Deposit exceeds pending receipt balance");
          }
          const head = headMap.get(receipt.ledgerHeadId);
          if (!head || head.type !== "income") {
            throw new Error("Receipt income head was not found");
          }
          const routedAccountNumber =
            head.code === "1-B"
              ? "30410641195"
              : head.code === "5-E"
                ? "30386343784"
                : "30386329769";
          const routedBank = bankByAccountNumber.get(routedAccountNumber);
          if (!routedBank) {
            throw new Error(`Required bank account ${routedAccountNumber} is missing`);
          }
          allocations.push({
            bankAccountId: routedBank.id,
            cashbookEntryId: sourceId,
            cashbookOpeningBalanceId: null,
            allocatedAmount: requested.toFixed(2),
          });
          return;
        }

        if (sourceType === "opening") {
          const opening = openingMap.get(sourceId);
          if (!opening) throw new Error("Opening cash balance was not found");
          const startYear = Number(opening.financialYear.slice(0, 4));
          const sourceDate =
            opening.openingDate || `${startYear || new Date().getFullYear()}-04-01`;
          if (depositDate < sourceDate) {
            throw new Error("Deposit date cannot be before opening date");
          }
          const available =
            Number(opening.openingCash) -
            (allocatedByOpening.get(sourceId) ?? 0);
          if (requested > available + 0.005) {
            throw new Error("Deposit exceeds pending opening cash balance");
          }
          const selectedBankId = destinationBankIds[index];
          const routedBank = bankRows.find(
            (bank) => bank.id === selectedBankId && bank.status === "active",
          );
          if (!routedBank) {
            throw new Error(
              "Select an active bank account for Opening Cash Balance",
            );
          }
          allocations.push({
            bankAccountId: routedBank.id,
            cashbookEntryId: null,
            cashbookOpeningBalanceId: sourceId,
            allocatedAmount: requested.toFixed(2),
          });
          return;
        }

        throw new Error("Invalid cash deposit source");
      });

      if (allocations.length === 0) throw new Error("No cash amount selected");
      const grouped = new Map<number, typeof allocations>();
      for (const allocation of allocations) {
        const list = grouped.get(allocation.bankAccountId) ?? [];
        list.push(allocation);
        grouped.set(allocation.bankAccountId, list);
      }

      for (const [bankAccountId, bankAllocations] of grouped) {
        const total = bankAllocations.reduce(
          (sum, allocation) => sum + Number(allocation.allocatedAmount),
          0,
        );
        const [deposit] = await tx
          .insert(cashDeposits)
          .values({
            depositDate,
            bankAccountId,
            slipNo: "AUTO-PENDING",
            amount: total.toFixed(2),
            depositedBy,
            remarks: s(fd, "remarks") || null,
          })
          .returning({ id: cashDeposits.id });
        const autoSlipNo = `CDS-${depositDate.slice(0, 4)}-${String(
          deposit.id,
        ).padStart(6, "0")}`;
        await tx
          .update(cashDeposits)
          .set({ slipNo: autoSlipNo })
          .where(eq(cashDeposits.id, deposit.id));
        await tx.insert(cashDepositAllocations).values(
          bankAllocations.map((allocation) => ({
            cashDepositId: deposit.id,
            cashbookEntryId: allocation.cashbookEntryId,
            cashbookOpeningBalanceId: allocation.cashbookOpeningBalanceId,
            allocatedAmount: allocation.allocatedAmount,
          })),
        );
      }
      saved = true;
    });
  } catch {
    saved = false;
  }

  revalidatePath("/", "layout");
  redirect(`/deposits?deposit=${saved ? "saved" : "failed"}`);
}

export async function deleteCashDeposit(fd: FormData) {
  await requireSecurityPin(fd);
  const id = i(fd, "id");
  if (!id) redirect("/deposits?deposit=delete-failed");

  let deleted = false;
  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(cashDepositAllocations)
        .where(eq(cashDepositAllocations.cashDepositId, id));
      const result = await tx
        .delete(cashDeposits)
        .where(eq(cashDeposits.id, id))
        .returning({ id: cashDeposits.id });
      deleted = result.length > 0;
    });
  } catch {
    deleted = false;
  }

  revalidatePath("/", "layout");
  redirect(`/deposits?deposit=${deleted ? "deleted" : "delete-failed"}`);
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
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
  await db.delete(shopCollections).where(eq(shopCollections.id, i(fd, "id")));
  revalidatePath("/shop-rent");
}

export async function deleteShop(fd: FormData) {
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
  await db.delete(staffPayments).where(eq(staffPayments.id, i(fd, "id")));
  revalidatePath("/staff-payments");
}

export async function deleteStaffMember(fd: FormData) {
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
  await db.delete(tdsReturns).where(eq(tdsReturns.id, i(fd, "id")));
  revalidatePath("/tds-returns");
}

// ---------- Revenue Progress ----------
export async function saveRevenueTarget(fd: FormData) {
  await requireSecurityPin(fd);
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
  await requireSecurityPin(fd);
  await db.delete(revenueTargets).where(eq(revenueTargets.id, i(fd, "id")));
  revalidatePath("/revenue-progress");
}
